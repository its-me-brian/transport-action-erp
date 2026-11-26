// ============================================================================
// FLOWS — recorridos de negocio reutilizables
// ============================================================================

import { addDays, addSupplierRate, today } from './fixtures.mjs';

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

/** Estados en los que un chofer queda tomado por un servicio (INV-009). */
const ACTIVE_OPERATIONAL = ['Asignado', 'Confirmado', 'EnRuta', 'Realizado', 'Reportado'];

/**
 * Devuelve un chofer libre para asignar.
 *
 * INV-009 impide que un mismo chofer esté en dos servicios activos a la vez, así
 * que reutilizar `ctx.ids.drivers[0]` en todos los casos hace fallar la mitad de
 * la batería con "Driver ... is already assigned to service ...". Acá se consulta
 * qué choferes están tomados y, si no queda ninguno, se crea uno al vuelo.
 */
export async function acquireDriver(ctx) {
  const raw = await ctx.client.post('getServices', {});
  const services = Array.isArray(raw) ? raw : raw?.items || raw?.services || [];
  const busy = new Set(
    services
      .filter((s) => ACTIVE_OPERATIONAL.includes(s.operationalStatus || s.OperationalStatus))
      .map((s) => s.driverId || s.DriverID)
      .filter(Boolean)
  );

  const free = ctx.ids.drivers.find((d) => !busy.has(d));
  if (free) return free;

  const created = await ctx.client.post('createDriverOnTheFly', {
    name: `${ctx.tag} Driver ${ctx.ids.drivers.length + 1}`,
    phone: '+39 333 000 0000',
    type: 'Internal',
    driverOwnership: 'Internal',
  });
  const newId = created?.id || created?.ID || created?.driverId;
  if (!newId) throw new Error('createDriverOnTheFly no devolvió id');
  ctx.ids.drivers.push(newId);
  ctx.track('drivers', newId);
  // Sin tarifa de proveedor el servicio no se puede validar ni calcular coste.
  await addSupplierRate(ctx, newId);
  return newId;
}

/**
 * Ejecuta una transición de estado tolerando el timeout del gateway.
 *
 * Apps Script tarda 5–10 s por comando y a veces la respuesta se pierde
 * después de que el backend YA aplicó el cambio. Reintentar a ciegas duplica
 * la transición (`EnRuta → EnRuta`), así que si el error es un timeout se
 * consulta el estado real: si el avance ocurrió, se sigue; si no, se propaga.
 */
async function transition(ctx, serviceId, action, expectedStatus, payload = {}) {
  try {
    return await ctx.client.post(action, { serviceId, ...payload });
  } catch (e) {
    if (e.code !== 'TIMEOUT') throw e;
    const dto = await getService(ctx, serviceId);
    if (dto && dto.operationalStatus === expectedStatus) return dto;
    throw e;
  }
}

/** Importado → Asignado → Confirmado → EnRuta → Realizado */
export async function driveToCompleted(ctx, serviceId, driverId, vehicleId) {
  await transition(ctx, serviceId, 'assignDriver', 'Asignado', { driverId, vehicleId });
  await transition(ctx, serviceId, 'confirmService', 'Confirmado');
  await transition(ctx, serviceId, 'startService', 'EnRuta');
  return transition(ctx, serviceId, 'completeService', 'Realizado');
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
export async function driveToValidated(ctx, { driverIndex = null, driverId = null, raw = {}, source = 'whatsapp' } = {}) {
  const resolvedDriver =
    driverId || (driverIndex === null ? await acquireDriver(ctx) : ctx.ids.drivers[driverIndex]);
  const service = await createService(ctx);
  await driveToCompleted(ctx, service.id, resolvedDriver, ctx.ids.vehicleId);
  const report = await submitReport(ctx, { serviceId: service.id, driverId: resolvedDriver, source, raw });
  await ctx.client.post('validateService', { serviceId: service.id });
  const updated = await getService(ctx, service.id);
  return { service, driverId: resolvedDriver, report, serviceAfter: updated };
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
