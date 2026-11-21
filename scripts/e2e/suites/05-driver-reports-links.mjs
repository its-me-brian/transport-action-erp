// ============================================================================
// SUITE 05 — Reportes del chofer (inbox) y link público del chofer
// ============================================================================
// Dos caminos de entrada de datos, ambos críticos:
//   A) inbox: captureReport → normalizeReport → submitToReview → acceptReport
//   B) link público: generateDriverLink → GET ?action=driverForm&token=...
// El link es el único flujo que sale de la app y depende de los permisos del
// deployment, así que se prueba también su revocación.
// ============================================================================

import { createService, driveToCompleted, getService, reportPayload } from '../lib/flows.mjs';
import { addDays, today } from '../lib/fixtures.mjs';
import { config } from '../lib/env.mjs';

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, text };
}

export const name = '05-driver-reports-links';
export const description = 'inbox de reportes (aceptar/rechazar), versionado y link público del chofer con revocación';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const driverId = ctx.ids.drivers[1];

  r.section('Reporte directo del chofer');
  const service = await r.step('servicio completado listo para reportar', async () => {
    const svc = await createService(ctx, { time: '07:30' });
    await driveToCompleted(ctx, svc.id, driverId, ctx.ids.vehicleId);
    return svc;
  });
  if (!service) return;

  let reportId = null;
  await r.step('submitDriverReport crea el reporte', async () => {
    const res = await client.post('submitDriverReport', {
      serviceId: service.id,
      driverId,
      reportData: reportPayload({ kmTotal: 155, parking: 6, tolls: 11 }),
    });
    reportId = res.id || res.ID;
    if (!reportId) throw new Error('sin id de reporte');
    ctx.track('reportIds', reportId);
    return res;
  });

  await r.step('getDriverReports filtra por servicio', async () => {
    const res = await client.post('getDriverReports', { filters: { serviceId: service.id } });
    const list = arr(res);
    if (!list.some((x) => (x.id || x.ID) === reportId)) throw new Error('el reporte no aparece');
    return list;
  });

  await r.step('getActiveDriverReport devuelve el reporte del servicio', async () => {
    const res = await client.post('getActiveDriverReport', { serviceId: service.id });
    if (!res || !(res.id || res.ID)) throw new Error('sin reporte activo');
    return res;
  });

  await r.step('getDriverReport devuelve el detalle', async () => {
    const res = await client.post('getDriverReport', { id: reportId });
    if (!res || (res.id || res.ID) !== reportId) throw new Error('detalle distinto');
    if (parseFloat(res.kmTotal) !== 155) throw new Error(`kmTotal=${res.kmTotal}`);
    return res;
  });

  await r.expectFailure(
    'no se valida el servicio sin reporte aceptado (S006)',
    () => client.post('validateService', { serviceId: service.id }),
    /S006|DriverReport/i
  );

  r.section('Inbox: aceptar y rechazar');
  await r.step('captureReport crea un item de inbox', async () => {
    const res = await client.post('captureReport', {
      source: 'whatsapp',
      channel: 'manual',
      driverId,
      projectId: ctx.ids.projectId,
      serviceDate: today(),
      rawData: { ...reportPayload(), serviceId: service.id, driverName: 'E2E Driver Beta' },
    });
    if (!res?.inboxId) throw new Error('sin inboxId');
    ctx.track('inboxIds', res.inboxId);
    return res;
  });

  const rejectedInbox = await r.step('capture + normalize + submit para rechazo', async () => {
    const cap = await client.post('captureReport', {
      source: 'driver_link',
      channel: 'web_form',
      driverId,
      projectId: ctx.ids.projectId,
      serviceDate: today(),
      rawData: { ...reportPayload({ kmTotal: 999 }), serviceId: service.id },
    });
    ctx.track('inboxIds', cap.inboxId);
    await client.post('normalizeReport', {
      inboxId: cap.inboxId,
      normalizedData: { ...reportPayload({ kmTotal: 999 }), serviceId: service.id },
    });
    await client.post('submitToReview', { inboxId: cap.inboxId });
    return cap.inboxId;
  });

  await r.step('rejectReport deja el item rechazado', async () => {
    const res = await client.post('rejectReport', {
      inboxId: rejectedInbox,
      reason: 'Km imposibles — E2E',
      reviewedBy: 'e2e-battery',
    });
    if (!res) throw new Error('sin respuesta');
    return res;
  });

  await r.step('getInboxItems lista los items del inbox', async () => {
    const res = await client.post('getInboxItems', { filters: {} });
    const list = arr(res);
    if (list.length === 0) throw new Error('inbox vacío');
    return list;
  });

  await r.step('aceptar y aprobar el reporte mueve el servicio a Calculado', async () => {
    const cap = await client.post('captureReport', {
      source: 'whatsapp',
      channel: 'manual',
      driverId,
      projectId: ctx.ids.projectId,
      serviceDate: today(),
      rawData: { ...reportPayload(), serviceId: service.id },
    });
    ctx.track('inboxIds', cap.inboxId);
    await client.post('normalizeReport', {
      inboxId: cap.inboxId,
      normalizedData: { ...reportPayload(), serviceId: service.id },
    });
    await client.post('submitToReview', { inboxId: cap.inboxId });
    const accepted = await client.post('acceptReport', { inboxId: cap.inboxId, reviewedBy: 'e2e-battery' });
    if (!accepted?.reportId) throw new Error('sin reportId');
    ctx.track('reportIds', accepted.reportId);
    await client.post('approveDriverReport', { reportId: accepted.reportId });
    const dto = await getService(ctx, service.id);
    if (dto.financialStatus !== 'Calculado') throw new Error(`financialStatus=${dto.financialStatus}`);
    return dto;
  });

  r.section('Link público del chofer');
  let link = null;
  await r.step('generateDriverLink devuelve token y URL', async () => {
    const res = await client.post('generateDriverLink', {
      driverId,
      projectId: ctx.ids.projectId,
      dateFrom: addDays(today(), -1),
      dateTo: addDays(today(), 7),
      baseUrl: config.gasUrl,
      linkDurationDays: 1,
    });
    if (!res?.token) throw new Error('sin token');
    if (!res.link || !res.link.includes('action=driverForm')) throw new Error(`link=${res.link}`);
    if (!res.link.includes(res.token)) throw new Error('el link no contiene el token');
    link = res;
    ctx.track('linkTokens', res.token);
    return res;
  });

  await r.step('getDriverLinks lista el link generado', async () => {
    const res = await client.post('getDriverLinks', { filters: { driverId } });
    const list = arr(res);
    if (!list.some((l) => (l.token || l.Token) === link.token)) throw new Error('el link no aparece');
    return list;
  });

  await r.step('el formulario público se sirve sin sesión', async () => {
    const url = `${config.gasUrl}?action=driverForm&token=${encodeURIComponent(link.token)}`;
    const { status, text } = await fetchText(url);
    if (status !== 200) throw new Error(`HTTP ${status}`);
    if (!/driverForm/i.test(text)) throw new Error('no parece el formulario (falta id=driverForm)');
    if (/Link non valido/i.test(text)) throw new Error('el backend devolvió "Link non valido"');
    if (!/E2E Driver Beta|E2E/.test(text)) throw new Error('el formulario no muestra datos del chofer');
    return { status, bytes: text.length };
  });

  await r.step('getDriverLinkEvents registra CREATED y ACCESSED', async () => {
    const res = await client.post('getDriverLinkEvents', { linkToken: link.token });
    const list = arr(res);
    if (list.length === 0) throw new Error('sin eventos');
    const types = list.map((e) => e.eventType || e.EventType || e.type);
    if (!types.includes('CREATED')) throw new Error(`eventos=${types.join(',')}`);
    return list;
  });

  await r.step('deactivateDriverLink revoca el link', async () => {
    const res = await client.post('deactivateDriverLink', { linkToken: link.token });
    if (!res) throw new Error('sin respuesta');
    return res;
  });

  await r.step('un link revocado muestra "Link non valido"', async () => {
    const url = `${config.gasUrl}?action=driverForm&token=${encodeURIComponent(link.token)}`;
    const { text } = await fetchText(url);
    if (!/Link non valido/i.test(text)) throw new Error('el link revocado sigue sirviendo el formulario');
    return { revoked: true };
  });

  await r.expectFailure(
    'un token inventado no sirve el formulario',
    async () => {
      const url = `${config.gasUrl}?action=driverForm&token=E2E-INVENTADO`;
      const { text } = await fetchText(url);
      if (!/Link non valido/i.test(text)) throw new Error('devolvió un formulario con token inventado');
      return text;
    },
    /.*/
  );

  ctx.flowState = { ...(ctx.flowState || {}), reportedServiceId: service.id, linkDriverId: driverId };
}
