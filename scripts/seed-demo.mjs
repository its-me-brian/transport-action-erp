#!/usr/bin/env node
// ============================================================================
// SEED DEMO — datos mínimos para la pasada manual de v1
// ============================================================================
// Crea un juego pequeño y realista para poder mirar pantallas con contenido:
// 1 cliente, 1 proyecto, 5 choferes, 1 vehículo, tarifas y 5 servicios en
// distintos estados. No crea rapportinos ni facturas: esos exigen el ciclo
// completo (validar + conciliar + aceptar el parte del chofer) y son
// justamente lo que prueba la checklist manual.
//
// Es idempotente: si el cliente ya existe, reusa todo lo que cuelga de él y
// solo agrega los servicios que falten.
//
// OJO con INV-009: un chofer no puede estar en dos servicios activos a la vez,
// así que cada servicio asignado usa un chofer distinto. Reusar un índice
// falla con "Driver ... is already assigned to service ...".
//
// Uso:
//   node scripts/seed-demo.mjs            # crea
//   node scripts/seed-demo.mjs --dry      # muestra qué haría
//
// Para borrarlo todo después: wipeOperationalData (admin, confirm
// 'WIPE-ALL-DATA'), que deja admin, sociedad emisora y secuencias.
// ============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

function envFile() {
  const out = {};
  const p = resolve(ROOT, 'Transport Action All', '.env');
  if (!existsSync(p)) return out;
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = envFile();
const GAS = process.env.GAS_URL || env.VITE_GAS_WEBAPP_URL;
const USER = process.env.ADMIN_USER || env.TEST_USERNAME || 'admin';
const PASS = process.env.ADMIN_PASSWORD || env.TEST_PASSWORD;

if (!GAS || !PASS) {
  console.error('Falta GAS_URL o TEST_PASSWORD en Transport Action All/.env');
  process.exit(2);
}

let TOKEN = null;

async function post(params) {
  // api.gs lee `action` SOLO de la query string; el body es el payload.
  const url = new URL(GAS);
  url.searchParams.set('action', params.action);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, ...params }),
    redirect: 'follow',
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`${params.action}: respuesta no-JSON (HTTP ${res.status}) ${text.slice(0, 160)}`);
  }
  if (body.success === false) {
    const e = body.error || {};
    throw new Error(`${params.action}: ${e.message || e.code || JSON.stringify(body)}`);
  }
  const data = body.data !== undefined ? body.data : body;
  if (data && data.error) throw new Error(`${params.action}: ${data.error}`);
  return data;
}

const arr = (v) => (Array.isArray(v) ? v : v?.items || []);
const idOf = (d) => d?.id || d?.ID;

function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Fecha local 'YYYY-MM-DD' desde un DTO.
 *
 * getServices devuelve `date` como ISO completo en UTC: la fila del 25 a las
 * 00:00 de Roma llega como '2026-11-24T23:00:00.000Z'. Comparar ese string
 * contra 'YYYY-MM-DD' nunca coincide, así que el seed duplicaba el servicio
 * y después moría con "Driver ... is already assigned".
 */
function localDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DEMO = {
  client: {
    name: 'Dolce Films SRL',
    type: 'Agency',
    vat: 'IT01234567890',
    address: 'Via Tortona 37, Milano',
    phone: '+39 02 1234 5678',
    email: 'produzione@dolcefilms.example',
    paymentTerms: 30,
    notes: 'Datos de demostración — se pueden borrar',
  },
  project: {
    name: 'Dolce 2026',
    coordinator: 'Demo Coordinator',
    transportCompany: 'Transport Action',
    notes: 'Datos de demostración — se pueden borrar',
  },
  drivers: [
    { name: 'Marco Rossi', phone: '+39 333 111 2233' },
    { name: 'Luca Bianchi', phone: '+39 333 444 5566' },
    { name: 'Andrea Conti', phone: '+39 333 777 8899' },
    { name: 'Giulia Neri', phone: '+39 333 222 3344' },
    { name: 'Fabio Serra', phone: '+39 333 555 6677' },
  ],
  vehicle: {
    plate: 'TA123AB',
    brand: 'Ford',
    model: 'Transit',
    type: 'Van',
    ownership: 'Owned',
    capacity: 8,
    status: 'Disponible',
  },
  // Fechas relativas a hoy: el calendario abre en la semana actual.
  // `assign` = índice de chofer, uno distinto por servicio (INV-009).
  services: [
    { date: day(-1), time: '07:30', passengerName: 'Elena Marchetti', from: 'Hotel Principe, Milano', to: 'Malpensa T1', assign: 0, confirm: true },
    { date: day(0), time: '09:00', passengerName: 'David Klein', from: 'Malpensa T2', to: 'Hotel Principe, Milano', assign: 1, confirm: true },
    { date: day(0), time: '14:00', passengerName: 'Sara Colombo', from: 'Cinecittà, Roma', to: 'Hotel Bernini', assign: 2, confirm: false },
    { date: day(1), time: '06:45', passengerName: 'Paolo Greco', from: 'Hotel Bernini', to: 'Fiumicino T3', assign: 3, confirm: false },
    { date: day(3), time: '18:30', passengerName: 'Chiara Ferri', from: 'Stazione Centrale', to: 'Hotel Principe, Milano', assign: null, confirm: false },
  ],
};

async function main() {
  const login = await post({ action: 'login', username: USER, password: PASS });
  TOKEN = login.token;
  if (!TOKEN) throw new Error('login sin token');
  console.log(`login OK: ${login.user?.username} (${login.user?.role})`);

  if (DRY) {
    console.log('\n--dry: no se escribe nada. Se crearía:');
    console.log(`  cliente   ${DEMO.client.name}`);
    console.log(`  proyecto  ${DEMO.project.name}`);
    console.log(`  choferes  ${DEMO.drivers.map((d) => d.name).join(', ')}`);
    console.log(`  vehículo  ${DEMO.vehicle.plate} (${DEMO.vehicle.brand} ${DEMO.vehicle.model})`);
    console.log(`  servicios ${DEMO.services.length}`);
    return;
  }

  // ── Cliente (reusa si ya existe por nombre) ────────────────────────────────
  const clients = arr(await post({ action: 'getClients' }));
  const foundClient = clients.find((c) => String(c.name || '').trim().toLowerCase() === DEMO.client.name.toLowerCase());
  const client = foundClient || (await post({ action: 'createClient', ...DEMO.client }));
  const clientId = idOf(client);
  console.log(`cliente: ${clientId} ${foundClient ? '(ya existía)' : '(creado)'}`);

  // ── Proyecto ───────────────────────────────────────────────────────────────
  const projects = arr(await post({ action: 'getProjects' }));
  const foundProject = projects.find(
    (p) => (p.clientId || p.ClientID) === clientId && String(p.name || '').trim().toLowerCase() === DEMO.project.name.toLowerCase()
  );
  const project = foundProject || (await post({
    action: 'createProject',
    ...DEMO.project,
    clientId,
    dateFrom: day(-30),
    dateTo: day(60),
  }));
  const projectId = idOf(project);
  console.log(`proyecto: ${projectId} ${foundProject ? '(ya existía)' : '(creado)'}`);

  // ── Choferes ───────────────────────────────────────────────────────────────
  const existingDrivers = arr(await post({ action: 'getDrivers' }));
  const driverIds = [];
  for (const d of DEMO.drivers) {
    const found = existingDrivers.find((x) => String(x.name || '').trim().toLowerCase() === d.name.toLowerCase());
    const driver = found || (await post({
      action: 'createDriver',
      name: d.name,
      phone: d.phone,
      whatsapp: d.phone,
      status: 'Disponible',
      type: 'Internal',
      driverOwnership: 'Internal',
    }));
    driverIds.push(idOf(driver));
    console.log(`chofer: ${idOf(driver)} ${d.name}${found ? ' (ya existía)' : ''}`);
  }

  // ── Vehículo ───────────────────────────────────────────────────────────────
  const vehicles = arr(await post({ action: 'getVehicles' }));
  const foundVehicle = vehicles.find((v) => String(v.plate || '').trim().toUpperCase() === DEMO.vehicle.plate);
  const vehicle = foundVehicle || (await post({ action: 'createVehicle', ...DEMO.vehicle }));
  const vehicleId = idOf(vehicle);
  console.log(`vehículo: ${vehicleId} ${DEMO.vehicle.plate}${foundVehicle ? ' (ya existía)' : ''}`);

  // ── Tarifario de cliente (ingreso) ─────────────────────────────────────────
  const rateCards = arr(await post({ action: 'getRateCards' }));
  const rcName = 'Van Dispo Standard (demo)';
  const foundRate = rateCards.find((r) => String(r.name || '').trim() === rcName);
  if (!foundRate) {
    const rc = await post({
      action: 'createRateCard',
      name: rcName,
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
      clientId,
      projectId,
      notes: 'Datos de demostración',
    });
    console.log(`tarifario cliente: ${idOf(rc)} (creado)`);
  } else {
    console.log(`tarifario cliente: ${idOf(foundRate)} (ya existía)`);
  }

  // ── Tarifas de proveedor (coste) para cada chofer ──────────────────────────
  const supplierRates = arr(await post({ action: 'getSupplierRates' }));
  for (const driverId of driverIds) {
    const has = supplierRates.some((r) => (r.supplierId || r.SupplierID) === driverId);
    if (has) {
      console.log(`tarifa proveedor: ${driverId} (ya existía)`);
      continue;
    }
    await post({
      action: 'createSupplierRate',
      supplierType: 'internal_driver',
      supplierId: driverId,
      projectId,
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
    console.log(`tarifa proveedor: ${driverId} (creada)`);
  }

  // ── Servicios ──────────────────────────────────────────────────────────────
  const existingServices = arr(await post({ action: 'getServices' }));
  for (const [i, s] of DEMO.services.entries()) {
    const dupe = existingServices.find(
      (x) => (x.projectId || x.ProjectID) === projectId && localDate(x.date || x.Date) === s.date && (x.time || x.Time) === s.time
    );
    if (dupe) {
      console.log(`servicio ${i + 1}: ${idOf(dupe)} ${s.date} ${s.time} (ya existía)`);
      continue;
    }
    const dto = await post({
      action: 'createService',
      ProjectID: projectId,
      Date: s.date,
      Time: s.time,
      Production: DEMO.project.name,
      Section: 'Trasporto',
      PassengerName: s.passengerName,
      PassengerRole: 'Guest',
      PickupLines: [s.from],
      DropoffLines: [s.to],
      ServiceType: 'Dispo',
      VehicleType: 'Van',
      SourceType: 'manual',
      Notes: 'Datos de demostración — se pueden borrar',
    });
    const serviceId = idOf(dto);
    let state = 'Importado';

    if (s.assign !== null && s.assign !== undefined) {
      await post({ action: 'assignDriver', serviceId, driverId: driverIds[s.assign], vehicleId });
      state = 'Asignado';
    }
    if (s.confirm) {
      await post({ action: 'confirmService', serviceId });
      state = 'Confirmado';
    }
    console.log(`servicio ${i + 1}: ${serviceId} ${s.date} ${s.time} ${s.passengerName} → ${state}`);
  }

  console.log('\nLISTO. Abrí Calendar en la semana actual para ver los servicios.');
  console.log('Para borrar todo: wipeOperationalData (admin, confirm WIPE-ALL-DATA).');
}

main().catch((err) => {
  console.error(`FALLÓ: ${err.message}`);
  process.exit(1);
});
