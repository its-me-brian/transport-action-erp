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

/**
 * Tarifa de proveedor para un chofer del contexto.
 *
 * Base > 0 a propósito: con 0 el cost breakdown automático nace vacío, el
 * servicio no se puede validar ("Service must have at least 1 CostBreakdown")
 * y no hay margen que probar. Sirve también para los choferes que se crean al
 * vuelo cuando los del contexto están todos tomados.
 */
export async function addSupplierRate(ctx, driverId) {
  const sr = await ctx.client.post('createSupplierRate', {
    supplierType: 'internal_driver',
    supplierId: driverId,
    projectId: ctx.ids.projectId,
    serviceType: 'Dispo',
    vehicleType: 'Van',
    baseRate: 200,
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
  const id = sr.id || sr.ID;
  ctx.ids.supplierRateIds.push(id);
  return id;
}

/**
 * Contexto mínimo, sin fixtures.
 *
 * Existe porque las suites que NO necesitan fixtures (01-system-auth) igual
 * llaman `ctx.track(...)`: sin esto, correr una suite suelta explotaba con
 * "ctx.track is not a function" después de crear la cuenta, y esa cuenta
 * quedaba viva porque nadie la había registrado para la limpieza.
 */
export function createBaseContext(client, reporter, { tag = config.runTag } = {}) {
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
      return id;
    },
  };

  ctx.cleanup = async function cleanupBase() {
    const leftovers = [];
    for (const userId of ctx.ids.userIds || []) {
      try {
        await client.post('deleteUser', { userId });
      } catch (e) {
        if (!BEST_EFFORT.has('deleteUser')) leftovers.push(`deleteUser: ${e.message}`);
      }
    }
    return leftovers;
  };

  return ctx;
}

export async function createContext(client, reporter, { tag = config.runTag } = {}) {
  const ctx = createBaseContext(client, reporter, { tag });

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
    await addSupplierRate(ctx, driverId);
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
    // `cancelExpense` es la baja real: el router NO tiene `deleteExpense`.
    //
    // Cada acción tiene su propio nombre de parámetro: `deleteService` recibe
    // `serviceId`, el resto recibe `id`. Mandar `{ id }` a deleteService
    // devolvía "Service undefined not found", los servicios quedaban vivos y,
    // como driver/vehicle/project/client no se borran si tienen servicios
    // colgados, la corrida entera quedaba en la Sheet.
    const byId = (id) => ({ id, reason: 'E2E cleanup' });
    const byServiceId = (id) => ({ serviceId: id, reason: 'E2E cleanup' });
    const steps = [
      ['cancelExpense', ctx.ids.expenseIds, byId],
      ['voidPayment', ctx.ids.paymentIds, byId],
      ['voidInvoice', ctx.ids.invoiceIds, byId],
      ['deleteService', ctx.ids.services, byServiceId],
      // Las tarifas van ANTES que el chofer: deleteDriver rechaza si quedan
      // SupplierRates apuntándolo.
      ['deleteSupplierRate', ctx.ids.supplierRateIds, byId],
      ['deleteRateCard', ctx.ids.rateCardId, byId],
      ['deleteCollaborator', ctx.ids.collaboratorId, byId],
      ['deleteDriver', ctx.ids.drivers, byId],
      ['deleteVehicle', ctx.ids.vehicleId, byId],
      ['deleteProject', ctx.ids.projectId, byId],
      ['deleteClient', ctx.ids.clientId, byId],
    ];
    const leftovers = [];

    const attempt = async (action, payload) => {
      try {
        await client.post(action, payload);
      } catch (e) {
        if (!BEST_EFFORT.has(action)) leftovers.push(`${action}: ${e.message}`);
      }
    };

    for (const [action, ids, toPayload] of steps) {
      const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
      for (const id of list) await attempt(action, toPayload(id));
    }
    for (const userId of ctx.ids.userIds || []) await attempt('deleteUser', { userId });

    return leftovers;
  };

  return ctx;
}
