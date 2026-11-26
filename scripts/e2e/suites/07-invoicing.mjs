// ============================================================================
// SUITE 07 — Facturación: Invoice, Payment y máquina financiera del Service
// ============================================================================
// Cubre el circuito del dinero:
//   servicio Calculado → … → CerradoComercial
//   Invoice Borrador → Emitida → Enviada
//   Payment Registrado → Confirmado → Conciliado (y anulación)
// ============================================================================

import { driveToClosed, driveToValidated, getService, createService } from '../lib/flows.mjs';
import { today } from '../lib/fixtures.mjs';

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function idOf(dto) {
  return dto?.id || dto?.ID;
}

function money(v) {
  return Math.round((parseFloat(v) || 0) * 100) / 100;
}

export const name = '07-invoicing';
export const description = 'máquina financiera del servicio, Invoice, Payment y anulaciones';

export async function run(ctx) {
  const { client, reporter: r } = ctx;

  r.section('Máquina financiera del servicio');
  const closed = await r.step('servicio validado listo para cerrar', async () => {
    const res = await driveToValidated(ctx);
    return res;
  });
  if (!closed) return;

  await r.step('recorrido Calculado → CerradoComercial', async () => {
    const { service, steps } = await driveToClosed(ctx, closed.service.id);
    if (service.financialStatus !== 'CerradoComercial') {
      throw new Error(`estado final=${service.financialStatus}`);
    }
    return steps;
  });

  await r.expectFailure(
    'no se factura un servicio en Pendiente (SF001)',
    async () => {
      const svc = await createService(ctx, { time: '05:30' });
      await client.post('facturarService', { serviceId: svc.id });
    },
    // El guard cambió de mensaje con la máquina financiera: hoy responde
    // "Service must be validated before invoicing". La regla es la misma.
    /Facturable|SF001|validated before invoicing/i
  );

  r.section('Invoice');
  // La suite 06 trackea el invoice en ctx.ids.invoiceIds; mirror en flowState
  // era una promesa que nunca se cumplió y dejaba el ciclo de Invoice siempre
  // omitido (y con él emitInvoice/registerPayment/voidInvoice sin evidencia).
  const invoiceId = (ctx.flowState?.invoiceIds || ctx.ids.invoiceIds || [])[0];
  if (!invoiceId) {
    r.skip('ciclo de Invoice', 'la suite 06 no dejó un invoice en borrador');
    return;
  }

  let invoice = null;
  await r.step('getInvoice devuelve el borrador con items', async () => {
    invoice = await client.post('getInvoice', { id: invoiceId });
    if (idOf(invoice) !== invoiceId) throw new Error('id distinto');
    if (!(money(invoice.total) > 0)) throw new Error(`total=${invoice.total}`);
    return invoice;
  });

  await r.step('emitInvoice → Emitida con número', async () => {
    const res = await client.post('emitInvoice', { invoiceId });
    if (res.status !== 'Emitida') throw new Error(`status=${res.status}`);
    if (!/^INV-/.test(res.invoiceNumber || '')) throw new Error(`invoiceNumber=${res.invoiceNumber}`);
    invoice = res;
    return res;
  });

  await r.step('sendInvoice → Enviada', async () => {
    const res = await client.post('sendInvoice', { invoiceId });
    if (res.status !== 'Enviada') throw new Error(`status=${res.status}`);
    invoice = res;
    return res;
  });

  await r.expectFailure(
    'un invoice emitido no se edita (I004)',
    () => client.post('editInvoice', { invoiceId, changes: { Notes: 'x' } }),
    /Borrador|I004/i
  );

  r.section('Payment');
  const total = money(invoice.total);
  let paymentId = null;

  await r.step('registerPayment por el total', async () => {
    const res = await client.post('registerPayment', {
      invoiceId,
      paymentData: {
        amount: total,
        paymentMethod: 'Bank Transfer',
        paymentDate: today(),
        reference: `${ctx.tag}-PAY`,
        notes: 'E2E payment',
      },
    });
    paymentId = idOf(res);
    if (!paymentId) throw new Error('sin id de pago');
    ctx.track('paymentIds', paymentId);
    return res;
  });

  await r.step('getPayments filtra por invoice', async () => {
    const res = await client.post('getPayments', { invoiceId });
    const list = arr(res);
    if (!list.some((p) => idOf(p) === paymentId)) throw new Error('el pago no aparece');
    return list;
  });

  await r.expectFailure(
    'un pago mayor al saldo se rechaza (P004)',
    () =>
      client.post('registerPayment', {
        invoiceId,
        paymentData: { amount: total + 100, paymentMethod: 'Cash', paymentDate: today() },
      }),
    /exceeds|P004/i
  );

  await r.step('checkDuplicatePayment detecta el pago repetido', async () => {
    const res = await client.post('checkDuplicatePayment', {
      invoiceId,
      amount: total,
      paymentDate: today(),
      reference: `${ctx.tag}-PAY`,
    });
    if (res.warning !== true) throw new Error('no marcó el duplicado');
    return res;
  });

  // Orden importante: anular ANTES de confirmar. Un pago Confirmado/Conciliado
  // es terminal para edición y la factura queda saldada, así que no habría
  // saldo para registrar el pago de reemplazo.
  await r.step('voidPayment anula un pago registrado', async () => {
    const res = await client.post('voidPayment', { paymentId, reason: 'E2E anulación' });
    if (res.status !== 'Anulado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('registerPayment de reemplazo tras la anulación', async () => {
    const res = await client.post('registerPayment', {
      invoiceId,
      paymentData: {
        amount: total,
        paymentMethod: 'Bank Transfer',
        paymentDate: today(),
        reference: `${ctx.tag}-PAY2`,
        notes: 'E2E payment (reemplazo)',
      },
    });
    paymentId = idOf(res);
    if (!paymentId) throw new Error('sin id de pago');
    ctx.track('paymentIds', paymentId);
    return res;
  });

  await r.step('confirmPayment → Confirmado', async () => {
    const res = await client.post('confirmPayment', { paymentId });
    if (res.status !== 'Confirmado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('reconcilePayment → Conciliado', async () => {
    const res = await client.post('reconcilePayment', { paymentId });
    if (res.status !== 'Conciliado') throw new Error(`status=${res.status}`);
    return res;
  });

  r.section('Anulación de Invoice');
  await r.step('voidInvoice anula un borrador vacío', async () => {
    const draft = await client.post('createInvoice', {
      projectId: ctx.ids.projectId,
      clientId: ctx.ids.clientId,
      notes: 'E2E void',
    });
    const draftId = idOf(draft);
    if (!draftId) throw new Error('sin id');
    ctx.track('invoiceIds', draftId);
    const res = await client.post('voidInvoice', { invoiceId: draftId, reason: 'E2E anulación' });
    if (res.status !== 'Anulada') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('el servicio facturado quedó en Cobrado o superior', async () => {
    const dto = await getService(ctx, closed.service.id);
    if (!['Cobrado', 'Cerrado', 'CerradoComercial'].includes(dto.financialStatus)) {
      throw new Error(`financialStatus=${dto.financialStatus}`);
    }
    return dto;
  });
}
