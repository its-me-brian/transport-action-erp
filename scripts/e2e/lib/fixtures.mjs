// ============================================================================
// FIXTURES — datos de prueba con cleanup
// ============================================================================
// Todo lo que crea la batería queda bajo un tag único (E2E-YYYYMMDDHHmmss)
// para poder identificar y borrar los restos de una corrida.
// ============================================================================

import { config } from './env.mjs';

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana actual (ISO). */
export function weekStart() {
  const d = new Date();
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

export function weekEnd() {
  return addDays(weekStart(), 6);
}

/** Bajas best-effort: si el registro ya no existe, no es un resto. */
const BEST_EFFORT = new Set(['cancelExpense', 'deleteUser']);

export async function createContext(client, reporter, { tag = config.runTag } = {}) {
  const created = [];
  const ctx = {
    client,
    reporter,
    tag,
    ids: {
      clientId: '',
      projectId: '',
      drivers: [],
      vehicleId: '',
      collaboratorId: '',
      rateCardId: '',
      supplierRateIds: [],
      services: [],
      inboxIds: [],
      reportIds: [],
      reconciliationIds: [],
      invoiceIds: [],
      paymentIds: [],
      expenseIds: [],
      rapportinoClientIds: [],
      rapportinoDriverIds: [],
      rapportinoCollaboratorIds: [],
      linkTokens: [],
      userIds: [],
    },
    track(kind, id) {
      if (!id) return id;
      if (Array.isArray(ctx.ids[kind])) ctx.ids[kind].push(id);
      else ctx.ids[kind] = id;
      created.push({ kind, id });
      return id;
    },
  };

  // ── Cliente ────────────────────────────────────────────────────────────────
  const clientDto = await client.post('createClient', {
    name: `${tag} Client`,
    type: 'Agency',
    vat: 'IT00000000000',
    address: 'Via E2E 1, Milano',
    phone: '+39 000 000 0000',
    email: 'e2e@example.invalid',
    paymentTerms: 30,
    notes: 'Fixture automático — se puede borrar',
  });
  ctx.ids.clientId = clientDto.id || clientDto.ID;

  // ── Proyecto ───────────────────────────────────────────────────────────────
  const project = await client.post('createProject', {
    name: `${tag} Project`,
    clientId: ctx.ids.clientId,
    dateFrom: today(),
    dateTo: addDays(today(), 30),
    coordinator: 'E2E Bot',
    transportCompany: 'Transport Action',
    notes: 'Fixture automático — se puede borrar',
  });
  ctx.ids.projectId = project.id || project.ID;

  // ── Conductores ────────────────────────────────────────────────────────────
  for (const [i, name] of ['Alpha', 'Beta', 'Gamma'].entries()) {
    const driver = await client.post('createDriver', {
      name: `${tag} Driver ${name}`,
      phone: `+39 333 000 000${i}`,
      whatsapp: `+39 333 000 000${i}`,
      status: 'Disponible',
      type: 'Internal',
      driverOwnership: 'Internal',
    });
    ctx.ids.drivers.push(driver.id || driver.ID);
  }

  // ── Vehículo ───────────────────────────────────────────────────────────────
  const vehicle = await client.post('createVehicle', {
    plate: `E2E${String(Date.now()).slice(-4)}`,
    brand: 'Ford',
    model: 'Transit',
    type: 'Van',
    ownership: 'Owned',
    capacity: 8,
    status: 'Disponible',
  });
  ctx.ids.vehicleId = vehicle.id || vehicle.ID;

  // ── Colaborador ────────────────────────────────────────────────────────────
  const collaborator = await client.post('createCollaborator', {
    name: `${tag} Collaborator`,
    vat: 'IT11111111111',
    phone: '+39 02 0000000',
    email: 'collab@example.invalid',
    paymentTerms: 30,
    active: true,
  });
  ctx.ids.collaboratorId = collaborator.id || collaborator.ID;

  // ── Tarifario de cliente (Revenue) ─────────────────────────────────────────
  const rateCard = await client.post('createRateCard', {
    name: `${tag} RateCard Van Dispo`,
    category: 'Standard',
    vehicleType: 'Van',
    serviceType: 'Dispo',
    basePrice: 350,
    includedKm: 100,
    includedHours: 8,
    extraKmRate: 0.9,
    extraHourRate: 45,
    waitRate: 40,
    nightFee: 25,
    holidayFee: 120,
    clientId: ctx.ids.clientId,
    projectId: ctx.ids.projectId,
    notes: 'Fixture automático',
  });
  ctx.ids.rateCardId = rateCard.id || rateCard.ID;

  // ── Tarifas de proveedor (Cost) para los 3 conductores ─────────────────────
  for (const driverId of ctx.ids.drivers) {
    const sr = await client.post('createSupplierRate', {
      supplierType: 'internal_driver',
      supplierId: driverId,
      projectId: ctx.ids.projectId,
      serviceType: 'Dispo',
      vehicleType: 'Van',
      baseRate: 0,
      includedKm: 100,
      includedHours: 8,
      extraKmRate: 0.5,
      extraHourRate: 25,
      diariaPiena: 180,
      diariaMezza: 110,
      nightExtra: 15,
      holidayExtra: 60,
      waitHourRate: 20,
    });
    ctx.ids.supplierRateIds.push(sr.id || sr.ID);
  }

  // ── Tarifa de conductor (legacy, para la pantalla de drivers) ──────────────
  await client.post('createDriverRate', {
    driverId: ctx.ids.drivers[0],
    vehicleType: 'Van',
    transferRate: 120,
    halfDayRate: 150,
    fullDayRate: 280,
    nightExtra: 20,
    holidayExtra: 40,
    waitHourRate: 25,
  });

  reporter.note(`fixtures: client=${ctx.ids.clientId} project=${ctx.ids.projectId} drivers=${ctx.ids.drivers.join(',')}`);

  ctx.cleanup = async function cleanup() {
    // `cancelExpense` es la baja real: el router NO tiene `deleteExpense`
    // (ese nombre hacía que la limpieza fallara en silencio en cada corrida).
    const steps = [
      ['cancelExpense', ctx.ids.expenseIds],
      ['voidPayment', ctx.ids.paymentIds],
      ['voidInvoice', ctx.ids.invoiceIds],
      ['deleteService', ctx.ids.services],
      ['deleteDriver', ctx.ids.drivers],
      ['deleteVehicle', ctx.ids.vehicleId],
      ['deleteRateCard', ctx.ids.rateCardId],
      ['deleteSupplierRate', ctx.ids.supplierRateIds],
      ['deleteCollaborator', ctx.ids.collaboratorId],
      ['deleteProject', ctx.ids.projectId],
      ['deleteClient', ctx.ids.clientId],
    ];
    const leftovers = [];

    const attempt = async (action, payload) => {
      try {
        await client.post(action, payload);
      } catch (e) {
        if (!BEST_EFFORT.has(action)) leftovers.push(`${action}: ${e.message}`);
      }
    };

    for (const [action, ids] of steps) {
      const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
      for (const id of list) await attempt(action, { id, reason: 'E2E cleanup' });
    }
    for (const userId of ctx.ids.userIds || []) await attempt('deleteUser', { userId });

    return leftovers;
  };

  return ctx;
}
