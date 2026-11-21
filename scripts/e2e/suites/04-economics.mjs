// ============================================================================
// SUITE 04 — Economía del servicio: revenue, cost, breakdowns y congelado
// ============================================================================
// Orden real del negocio:
//   reporte aprobado → breakdowns automáticos (desbloqueados)
//   → validateService → se congelan (Locked)
//   → ajustes manuales sobre el servicio ya validado
//   → recalculate reconstruye los automáticos sin perder los manuales
// ============================================================================

import { createService, driveToCompleted, getService, submitReport } from '../lib/flows.mjs';

function arr(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.items)) return value.items;
  return [];
}

function sumBy(items, field) {
  return items.reduce((acc, i) => acc + (parseFloat(i[field]) || 0), 0);
}

function money(value) {
  return Math.round((parseFloat(value) || 0) * 100) / 100;
}

export const name = '04-economics';
export const description = 'breakdowns de revenue/cost, márgenes, ajustes manuales, congelado al validar y recálculo';

export async function run(ctx) {
  const { client, reporter: r } = ctx;
  const driverId = ctx.ids.drivers[0];

  r.section('Preparación');
  const service = await r.step('servicio completado con reporte aprobado', async () => {
    const svc = await createService(ctx, { time: '08:00', serviceType: 'Dispo' });
    await driveToCompleted(ctx, svc.id, driverId, ctx.ids.vehicleId);
    const report = await submitReport(ctx, { serviceId: svc.id, driverId });
    if (!report.approved) throw new Error('el reporte no se aprobó');
    const after = await getService(ctx, svc.id);
    return { svc, after, report };
  });
  if (!service) return;

  const serviceId = service.svc.id;

  r.section('Breakdowns automáticos');
  let revenue = [];
  await r.step('getRevenueBreakdowns devuelve items desde el RateCard', async () => {
    const res = await client.post('getRevenueBreakdowns', { serviceId });
    revenue = arr(res);
    if (revenue.length === 0) throw new Error('sin items de revenue');
    const auto = revenue.filter((i) => i.source === 'rate_card' || i.source === 'imported');
    if (auto.length === 0) throw new Error('ningún item con Source=rate_card');
    return revenue;
  });

  let cost = [];
  await r.step('getCostBreakdowns devuelve items desde el SupplierRate', async () => {
    const res = await client.post('getCostBreakdowns', { serviceId });
    cost = arr(res);
    if (cost.length === 0) throw new Error('sin items de cost');
    return cost;
  });

  await r.check(
    'los items automáticos nacen desbloqueados',
    revenue.every((i) => i.locked !== true && i.locked !== 'true'),
    `locked=${JSON.stringify(revenue.map((i) => i.locked))}`
  );

  await r.step('calculateServiceEconomics devuelve revenue, cost y margen', async () => {
    const res = await client.post('calculateServiceEconomics', { serviceId });
    if (!res?.revenue || !res?.cost) throw new Error('sin revenue/cost en la respuesta');
    if (!(res.revenue.total > 0)) throw new Error(`revenue.total=${res.revenue.total}`);
    if (!(res.cost.total > 0)) throw new Error(`cost.total=${res.cost.total}`);
    if (typeof res.margin !== 'number') throw new Error(`margin=${res.margin}`);
    if (money(res.margin) !== money(res.revenue.total - res.cost.total)) {
      throw new Error(`margen inconsistente: ${res.margin} vs ${res.revenue.total - res.cost.total}`);
    }
    return res;
  });

  await r.step('los totales del breakdown coinciden con calculateServiceEconomics', async () => {
    const res = await client.post('calculateServiceEconomics', { serviceId });
    const rev = money(sumBy(revenue, 'total'));
    const cst = money(sumBy(cost, 'amount'));
    if (money(res.revenue.total) !== rev) throw new Error(`revenue ${res.revenue.total} != ${rev}`);
    if (money(res.cost.total) !== cst) throw new Error(`cost ${res.cost.total} != ${cst}`);
    return { rev, cst };
  });

  r.section('Idempotencia');
  await r.step('applyRevenueBreakdown dos veces no duplica', async () => {
    await client.post('applyRevenueBreakdown', { serviceId });
    const first = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    await client.post('applyRevenueBreakdown', { serviceId });
    const second = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    if (second.length !== first.length) {
      throw new Error(`items ${first.length} → ${second.length} (duplicados)`);
    }
    revenue = second;
    return second.length;
  });

  await r.step('applyCostBreakdown dos veces no duplica', async () => {
    await client.post('applyCostBreakdown', { serviceId });
    const first = arr(await client.post('getCostBreakdowns', { serviceId }));
    await client.post('applyCostBreakdown', { serviceId });
    const second = arr(await client.post('getCostBreakdowns', { serviceId }));
    if (second.length !== first.length) {
      throw new Error(`items ${first.length} → ${second.length} (duplicados)`);
    }
    cost = second;
    return second.length;
  });

  r.section('Validación y congelado');
  await r.expectFailure(
    'no se ajusta revenue antes de validar (S009)',
    () => client.post('adjustRevenue', { serviceId, adjustment: { description: 'x', amount: 10 } }),
    /validated|S009/i
  );

  await r.step('validateService congela todos los items', async () => {
    const dto = await client.post('validateService', { serviceId });
    if (dto.operationalStatus !== 'Validado') throw new Error(`status=${dto.operationalStatus}`);
    const rev = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    const cst = arr(await client.post('getCostBreakdowns', { serviceId }));
    const unlockedRev = rev.filter((i) => i.locked !== true && i.locked !== 'true');
    const unlockedCost = cst.filter((i) => i.locked !== true && i.locked !== 'true');
    if (unlockedRev.length || unlockedCost.length) {
      throw new Error(`quedaron sin congelar: revenue=${unlockedRev.length} cost=${unlockedCost.length}`);
    }
    return dto;
  });

  await r.step('al aprobar el reporte el servicio queda en Calculado', async () => {
    const dto = await getService(ctx, serviceId);
    if (dto.financialStatus !== 'Calculado') throw new Error(`financialStatus=${dto.financialStatus}`);
    return dto;
  });

  r.section('Ajustes manuales');
  await r.step('adjustRevenue agrega un item manual', async () => {
    const before = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    await client.post('adjustRevenue', {
      serviceId,
      adjustment: { itemType: 'Extra', description: 'Peaje reembolsado', quantity: 1, unitPrice: 45 },
    });
    const after = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    if (after.length !== before.length + 1) throw new Error(`${before.length} → ${after.length}`);
    const manual = after.find((i) => i.source === 'adjustment');
    if (!manual) throw new Error('no aparece el item con Source=adjustment');
    if (money(manual.total) !== 45) throw new Error(`total=${manual.total}`);
    return manual;
  });

  await r.step('adjustCost agrega un item manual', async () => {
    const before = arr(await client.post('getCostBreakdowns', { serviceId }));
    await client.post('adjustCost', {
      serviceId,
      adjustment: { description: 'Estacionamiento', amount: 12 },
    });
    const after = arr(await client.post('getCostBreakdowns', { serviceId }));
    if (after.length !== before.length + 1) throw new Error(`${before.length} → ${after.length}`);
    const manual = after.find((i) => i.source === 'adjustment');
    if (!manual) throw new Error('no aparece el item con Source=adjustment');
    if (money(manual.amount) !== 12) throw new Error(`amount=${manual.amount}`);
    return manual;
  });

  await r.step('el margen refleja los ajustes manuales', async () => {
    const res = await client.post('calculateServiceEconomics', { serviceId });
    if (res.margin <= 0) throw new Error(`margen=${res.margin}`);
    return res;
  });

  r.section('Recálculo');
  await r.step('recalculateServiceEconomics conserva los manuales', async () => {
    const before = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    const manualBefore = before.filter((i) => i.source === 'adjustment').length;
    await client.post('recalculateServiceEconomics', { serviceId });
    const after = arr(await client.post('getRevenueBreakdowns', { serviceId }));
    const manualAfter = after.filter((i) => i.source === 'adjustment').length;
    if (manualAfter !== manualBefore) {
      throw new Error(`items manuales ${manualBefore} → ${manualAfter}`);
    }
    return { before: before.length, after: after.length };
  });

  const autoBefore = arr(await client.post('getRevenueBreakdowns', { serviceId })).filter(
    (i) => i.source === 'rate_card' || i.source === 'imported'
  ).length;
  await client.post('recalculateServiceEconomics', { serviceId });
  const autoAfter = arr(await client.post('getRevenueBreakdowns', { serviceId })).filter(
    (i) => i.source === 'rate_card' || i.source === 'imported'
  ).length;
  r.check(
    'recalcular no duplica items automáticos en un servicio validado',
    autoAfter === autoBefore,
    `automáticos ${autoBefore} → ${autoAfter}`
  );

  ctx.flowState = { ...(ctx.flowState || {}), economicsServiceId: serviceId, economicsDriverId: driverId };
}
