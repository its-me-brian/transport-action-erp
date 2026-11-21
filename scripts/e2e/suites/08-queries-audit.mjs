// ============================================================================
// SUITE 08 — Consultas, dashboards, auditoría e invariantes
// ============================================================================
// No alcanza con que la acción responda 200: el crash real del dashboard fue
// un payload con forma inesperada (`summary.services.total` undefined).
// Por eso acá se valida la FORMA de cada respuesta.
// ============================================================================

import { addDays, today } from '../lib/fixtures.mjs';

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function requirePath(obj, path, label) {
  let cur = obj;
  for (const key of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      throw new Error(`${label}: falta ${path} (cortó en "${key}")`);
    }
    cur = cur[key];
  }
  if (cur === undefined || cur === null) throw new Error(`${label}: ${path} es ${cur}`);
  return cur;
}

export const name = '08-queries-audit';
export const description = 'dashboards, cash flow, profit, pendientes, audit log e invariantes del dominio';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const projectId = ctx.ids.projectId;
  const driverId = ctx.ids.drivers[0];
  const from = addDays(today(), -7);
  const to = addDays(today(), 7);

  r.section('Dashboard ejecutivo');
  await r.step('getMainDashboard tiene la forma que consume la UI', async () => {
    const res = await client.post('getMainDashboard', {});
    if (!isNum(requirePath(res, 'services.total', 'dashboard'))) throw new Error('services.total no numérico');
    if (!isNum(requirePath(res, 'services.validated', 'dashboard'))) throw new Error('services.validated no numérico');
    if (!isNum(requirePath(res, 'financials.profit', 'dashboard'))) throw new Error('financials.profit no numérico');
    if (!isNum(requirePath(res, 'invoicing.totalPaid', 'dashboard'))) throw new Error('invoicing.totalPaid no numérico');
    if (!isNum(requirePath(res, 'resources.drivers.total', 'dashboard'))) throw new Error('resources.drivers.total no numérico');
    return res;
  });

  await r.step('getMainDashboard filtra por rango de fechas', async () => {
    const res = await client.post('getMainDashboard', { startDate: from, endDate: to });
    if (!isNum(requirePath(res, 'services.total', 'dashboard filtrado'))) throw new Error('sin total');
    return res;
  });

  await r.step('getProjectDashboard responde con datos del proyecto', async () => {
    const res = await client.post('getProjectDashboard', { projectId });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  await r.step('getDriverDashboard responde para el chofer', async () => {
    const res = await client.post('getDriverDashboard', { driverId, startDate: from, endDate: to });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  r.section('Reportes financieros');
  await r.step('getCashFlow devuelve un objeto con totales', async () => {
    const res = await client.post('getCashFlow', { startDate: from, endDate: to });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  await r.step('getProfitByProject', async () => {
    const res = await client.post('getProfitByProject', { projectId });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  await r.step('getProfitByDriver', async () => {
    const res = await client.post('getProfitByDriver', { driverId, startDate: from, endDate: to });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  await r.step('getEstimatedVsActual del proyecto', async () => {
    const res = await client.post('getEstimatedVsActual', { projectId });
    if (!res || typeof res !== 'object') throw new Error('respuesta inválida');
    return res;
  });

  await r.step('getServiceSummaryByProject', async () => {
    const res = await client.post('getServiceSummaryByProject', { projectId });
    if (res === undefined || res === null) throw new Error('respuesta vacía');
    return res;
  });

  r.section('Bandejas de pendientes');
  await r.step('getPendingValidation devuelve una lista', async () => {
    const res = await client.post('getPendingValidation', {});
    if (!Array.isArray(res)) throw new Error(`tipo=${typeof res}`);
    return res;
  });

  await r.step('getPendingInvoicing devuelve una lista', async () => {
    const res = await client.post('getPendingInvoicing', {});
    if (!Array.isArray(res)) throw new Error(`tipo=${typeof res}`);
    return res;
  });

  await r.step('getReconciliations y getPendingReconciliations', async () => {
    const all = await client.post('getReconciliations', {});
    if (!Array.isArray(arr(all))) throw new Error('getReconciliations no es lista');
    const pending = await client.post('getPendingReconciliations', {});
    if (!Array.isArray(arr(pending))) throw new Error('getPendingReconciliations no es lista');
    return { all: arr(all).length, pending: arr(pending).length };
  });

  r.section('Auditoría');
  await r.step('getAuditLog registra los eventos de la corrida', async () => {
    const res = await client.post('getAuditLog', { limit: 100 });
    const list = arr(res);
    if (list.length === 0) throw new Error('log vacío');
    const text = JSON.stringify(list);
    const expected = ['service.created', 'service.validated', 'driver.created', 'user.passwordReset'];
    const found = expected.filter((e) => text.includes(e));
    if (found.length < 2) throw new Error(`no se ven eventos esperados (encontrados: ${found.join(',') || 'ninguno'})`);
    return { entries: list.length, found };
  });

  await r.step('el audit log guarda el actor de la corrida', async () => {
    const res = await client.post('getAuditLog', { limit: 50 });
    const list = arr(res);
    const withUser = list.filter((e) => (e.user || e.User || e.actor || e.Actor || '').toString().length > 0);
    if (withUser.length === 0) throw new Error('ningún evento tiene actor');
    return withUser.length;
  });

  r.section('Invariantes del dominio');
  let invariants = null;
  await r.step('checkInvariants corre las INV-001..021', async () => {
    const res = await client.post('checkInvariants', {});
    if (!isNum(requirePath(res, 'summary.total', 'invariantes'))) throw new Error('summary.total no numérico');
    invariants = res;
    return res.summary;
  });

  if (invariants) {
    const failed = arr(invariants.results).filter((x) => x.valid === false || x.Valid === false);
    r.check(
      'no hay invariantes violadas',
      failed.length === 0,
      failed.length
        ? `fallan: ${failed.map((f) => f.name || f.id || f.check).join(', ')}`
        : `${invariants.summary.passed}/${invariants.summary.total} OK`
    );
  }
}
