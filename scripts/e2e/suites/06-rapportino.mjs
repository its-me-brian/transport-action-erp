// ============================================================================
// SUITE 06 — Rapportino: producción (cliente) y proveedor (chofer)
// ============================================================================
// El rapportino de cliente es la puerta al Invoice: su gate (canFacturar)
// exige servicios Validado + Facturable, reconciliación resuelta y el
// rapportino del chofer aceptado. Es el flujo más acoplado del sistema.
// ============================================================================

import { driveToValidated, getService } from '../lib/flows.mjs';
import { weekEnd, weekStart } from '../lib/fixtures.mjs';

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function idOf(dto) {
  return dto?.id || dto?.ID;
}

export const name = '06-rapportino';
export const description = 'rapportino de cliente y de chofer, gate de facturación y creación de Invoice';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const driverId = ctx.ids.drivers[2];
  const week = { start: weekStart(), end: weekEnd() };

  r.section('Preparación');
  const prepared = await r.step('servicio validado y con economía calculada', async () => {
    const res = await driveToValidated(ctx, { driverIndex: 2 });
    const dto = res.serviceAfter;
    if (dto.operationalStatus !== 'Validado') throw new Error(`status=${dto.operationalStatus}`);
    return res;
  });
  if (!prepared) return;

  const serviceId = prepared.service.id;

  r.section('Reconciliación');
  let reconciliationId = null;
  await r.step('getReconciliationByService devuelve la reconciliación del servicio', async () => {
    const res = await client.post('getReconciliationByService', { serviceId });
    if (!res || !idOf(res)) throw new Error('sin reconciliación');
    reconciliationId = idOf(res);
    ctx.track('reconciliationIds', reconciliationId);
    return res;
  });

  await r.step('resolveReconciliation deja la reconciliación resuelta', async () => {
    const current = await client.post('getReconciliationByService', { serviceId });
    if (current?.status === 'Resuelto') return current;
    const res = await client.post('resolveReconciliation', {
      reconciliationId,
      resolution: {
        FinalStartTime: '08:00',
        FinalEndTime: '18:30',
        FinalKm: 140,
        FinalDiaria: 'piena',
        FinalFestivo: false,
        FinalNotturno: false,
      },
    });
    const after = await client.post('getReconciliationByService', { serviceId });
    if (after?.status !== 'Resuelto') throw new Error(`status=${after?.status}`);
    return res;
  });

  r.section('Estado financiero');
  await r.step('Calculado → ActualsConfirmados', async () => {
    const dto = await client.post('confirmActuals', { serviceId });
    if (dto.financialStatus !== 'ActualsConfirmados') throw new Error(`status=${dto.financialStatus}`);
    return dto;
  });
  await r.step('ActualsConfirmados → Aprobado', async () => {
    const dto = await client.post('approveFinancial', { serviceId });
    if (dto.financialStatus !== 'Aprobado') throw new Error(`status=${dto.financialStatus}`);
    return dto;
  });
  await r.step('Aprobado → Facturable', async () => {
    const dto = await client.post('markFacturable', { serviceId });
    if (dto.financialStatus !== 'Facturable') throw new Error(`status=${dto.financialStatus}`);
    return dto;
  });

  r.section('Rapportino del chofer');
  let driverRapportinoId = null;
  await r.step('createRapportinoDriver', async () => {
    const res = await client.post('createRapportinoDriver', {
      projectId: ctx.ids.projectId,
      driverId,
      weekStart: week.start,
      weekEnd: week.end,
      periodType: 'weekly',
    });
    driverRapportinoId = idOf(res);
    if (!driverRapportinoId) throw new Error('sin id');
    ctx.track('rapportinoDriverIds', driverRapportinoId);
    return res;
  });

  await r.step('reviewRapportinoDriver → Revisado', async () => {
    const res = await client.post('reviewRapportinoDriver', { rapportinoId: driverRapportinoId });
    if (res.status !== 'Revisado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('sendRapportinoDriver → Enviado', async () => {
    const res = await client.post('sendRapportinoDriver', { rapportinoId: driverRapportinoId });
    if (res.status !== 'Enviado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('acceptRapportinoDriver → Aceptado', async () => {
    const res = await client.post('acceptRapportinoDriver', { rapportinoId: driverRapportinoId });
    if (res.status !== 'Aceptado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('getRapportinoDrivers lo lista', async () => {
    const res = await client.post('getRapportinoDrivers', { filters: { projectId: ctx.ids.projectId } });
    const list = arr(res);
    if (!list.some((x) => idOf(x) === driverRapportinoId)) throw new Error('no aparece');
    return list;
  });

  r.section('Rapportino del cliente');
  let rapportinoId = null;
  await r.step('createRapportinoClient', async () => {
    const res = await client.post('createRapportinoClient', {
      projectId: ctx.ids.projectId,
      clientId: ctx.ids.clientId,
      weekStart: week.start,
      weekEnd: week.end,
      periodType: 'weekly',
    });
    rapportinoId = idOf(res);
    if (!rapportinoId) throw new Error('sin id');
    ctx.track('rapportinoClientIds', rapportinoId);
    return res;
  });

  await r.step('addServiceToRapportino', async () => {
    const res = await client.post('addServiceToRapportino', { rapportinoId, serviceId });
    if (!(res.total > 0)) throw new Error(`total=${res.total}`);
    return res;
  });

  await r.step('reviewRapportinoClient → Revisado', async () => {
    const res = await client.post('reviewRapportinoClient', { rapportinoId });
    if (res.status !== 'Revisado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('sendRapportinoClient → Enviado', async () => {
    const res = await client.post('sendRapportinoClient', { rapportinoId });
    if (res.status !== 'Enviado') throw new Error(`status=${res.status}`);
    return res;
  });

  await r.step('acceptRapportinoClient → Aceptado', async () => {
    const res = await client.post('acceptRapportinoClient', { rapportinoId });
    if (res.status !== 'Aceptado') throw new Error(`status=${res.status}`);
    return res;
  });

  r.section('Facturación del rapportino');
  await r.step('facturarRapportino → Facturado y crea Invoice', async () => {
    const res = await client.post('facturarRapportino', { rapportinoId });
    if (res.status !== 'Facturado') throw new Error(`status=${res.status}`);
    const svc = await getService(ctx, serviceId);
    if (svc.financialStatus !== 'Facturado') throw new Error(`service.financialStatus=${svc.financialStatus}`);
    return res;
  });

  await r.step('el Invoice en borrador tiene items', async () => {
    const invoices = arr(await client.post('getInvoices', { projectId: ctx.ids.projectId }));
    const draft = invoices.find((i) => i.status === 'Borrador' || i.Status === 'Borrador');
    if (!draft) throw new Error('no hay invoice en Borrador');
    ctx.track('invoiceIds', idOf(draft));
    const items = arr(await client.post('getInvoiceItems', { invoiceId: idOf(draft) }));
    if (items.length === 0) throw new Error('invoice sin items');
    return { invoice: draft, items: items.length };
  });

  r.section('Rapportino de colaborador');
  await r.step('createRapportinoCollaborator', async () => {
    const res = await client.post('createRapportinoCollaborator', {
      projectId: ctx.ids.projectId,
      collaboratorId: ctx.ids.collaboratorId,
      periodStart: week.start,
      periodEnd: week.end,
      periodType: 'weekly',
    });
    if (!idOf(res)) throw new Error('sin id');
    ctx.track('rapportinoCollaboratorIds', idOf(res));
    return res;
  });

  r.skip(
    'addServiceToRapportinoCollaborator y su ciclo',
    'requiere un servicio con ProviderType=collaborator; el fixture usa choferes internos'
  );

  ctx.flowState = { ...(ctx.flowState || {}), rapportinoId, rapportinoServiceId: serviceId };
}
