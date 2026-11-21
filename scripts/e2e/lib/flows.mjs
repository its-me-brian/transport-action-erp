// ============================================================================
// FLOWS — recorridos de negocio reutilizables
// ============================================================================

import { addDays, today } from './fixtures.mjs';

export async function createService(ctx, overrides = {}) {
  const dto = await ctx.client.post('createService', {
    ProjectID: ctx.ids.projectId,
    Date: overrides.date || today(),
    Time: overrides.time || '09:00',
    Production: overrides.production || `${ctx.tag} Production`,
    Section: overrides.section || 'E2E',
    PassengerName: overrides.passengerName || 'E2E Passenger',
    PassengerRole: 'Guest',
    PickupLines: ['Via E2E 1, Milano'],
    DropoffLines: ['Malpensa T1'],
    ServiceType: overrides.serviceType || 'Dispo',
    VehicleType: overrides.vehicleType || 'Van',
    SourceType: 'e2e',
    Notes: 'Fixture automático — se puede borrar',
  });
  ctx.track('services', dto.id);
  return dto;
}

export async function getService(ctx, serviceId) {
  return ctx.client.post('getService', { id: serviceId });
}

/** Importado → Asignado → Confirmado → EnRuta → Realizado */
export async function driveToCompleted(ctx, serviceId, driverId, vehicleId) {
  await ctx.client.post('assignDriver', { serviceId, driverId, vehicleId });
  await ctx.client.post('confirmService', { serviceId });
  await ctx.client.post('startService', { serviceId });
  return ctx.client.post('completeService', { serviceId });
}

export function reportPayload(overrides = {}) {
  return {
    startTime: '08:00',
    endTime: '18:30',
    kmTotal: 140,
    hasDiaria: true,
    diariaType: 'piena',
    isFestivo: false,
    isNotturno: false,
    parking: 12,
    tolls: 8,
    fuel: 30,
    waitMinutes: 0,
    notes: 'E2E driver report',
    ...overrides,
  };
}

/**
 * Reporte del conductor por el inbox: capture → normalize → submit → accept → approve.
 * Devuelve { inboxId, reportId, approved }.
 */
export async function submitReport(ctx, { serviceId, driverId, source = 'whatsapp', channel = 'manual', raw = {} }) {
  const payload = reportPayload(raw);

  const captured = await ctx.client.post('captureReport', {
    source,
    channel,
    driverId,
    projectId: ctx.ids.projectId,
    serviceDate: today(),
    rawData: { ...payload, serviceId, driverName: `E2E Driver` },
  });
  if (!captured?.inboxId) throw new Error('captureReport no devolvió inboxId');
  ctx.track('inboxIds', captured.inboxId);

  await ctx.client.post('normalizeReport', {
    inboxId: captured.inboxId,
    normalizedData: { ...payload, serviceId },
  });
  await ctx.client.post('submitToReview', { inboxId: captured.inboxId });

  const accepted = await ctx.client.post('acceptReport', {
    inboxId: captured.inboxId,
    reviewedBy: 'e2e-battery',
  });
  if (!accepted?.reportId) throw new Error('acceptReport no devolvió reportId');
  ctx.track('reportIds', accepted.reportId);

  const approved = await ctx.client.post('approveDriverReport', { reportId: accepted.reportId });

  return { inboxId: captured.inboxId, reportId: accepted.reportId, approved };
}

/**
 * Recorrido completo hasta Validado:
 * crear → asignar → confirmar → iniciar → completar → reporte → validar.
 */
export async function driveToValidated(ctx, { driverIndex = 0, raw = {}, source = 'whatsapp' } = {}) {
  const driverId = ctx.ids.drivers[driverIndex];
  const service = await createService(ctx);
  await driveToCompleted(ctx, service.id, driverId, ctx.ids.vehicleId);
  const report = await submitReport(ctx, { serviceId: service.id, driverId, source, raw });
  await ctx.client.post('validateService', { serviceId: service.id });
  const updated = await getService(ctx, service.id);
  return { service, driverId, report, serviceAfter: updated };
}

/** Validado → Calculado → ActualsConfirmados → Aprobado → Facturable → Facturado → Cobrado → Cerrado */
export async function driveToClosed(ctx, serviceId) {
  let svc = await getService(ctx, serviceId);
  const steps = [];

  const run = async (action, from, to) => {
    svc = await getService(ctx, serviceId);
    if (svc.financialStatus !== from) {
      throw new Error(`Se esperaba financialStatus=${from} antes de ${action}, hay ${svc.financialStatus}`);
    }
    await ctx.client.post(action, { serviceId });
    steps.push(`${from}→${to}`);
    svc = await getService(ctx, serviceId);
    if (svc.financialStatus !== to) {
      throw new Error(`${action} dejó financialStatus=${svc.financialStatus}, se esperaba ${to}`);
    }
  };

  await run('confirmActuals', 'Calculado', 'ActualsConfirmados');
  await run('approveFinancial', 'ActualsConfirmados', 'Aprobado');
  await run('markFacturable', 'Aprobado', 'Facturable');
  await run('facturarService', 'Facturable', 'Facturado');
  await run('cobrarService', 'Facturado', 'Cobrado');
  await run('closeService', 'Cobrado', 'Cerrado');
  await run('cerrarComercialmente', 'Cerrado', 'CerradoComercial');

  return { service: svc, steps };
}

export { addDays, today };
