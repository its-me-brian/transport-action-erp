// ============================================================================
// CLEANUP — borra los restos de corridas E2E interrumpidas
// ============================================================================
// Uso:
//   node scripts/e2e/cleanup.mjs --dry     # solo lista qué borraría
//   node scripts/e2e/cleanup.mjs           # borra
//
// Una corrida interrumpida (Ctrl+C, timeout, token muerto) deja fixtures en la
// Sheet. Todo lo que crea la batería lleva "E2E" en algún campo, así que este
// script barre por ese patrón en orden hijo → padre.
//
// Requiere TEST_PASSWORD (la cuenta admin que borra).
// ============================================================================

import { assertConfig, config } from './lib/env.mjs';
import { createClient, login } from './lib/client.mjs';

assertConfig();

const dry = process.argv.includes('--dry');
const TAG = /E2E/i;

const client = createClient();
await login(client, config.username, config.password);

const list = async (action) => {
  const r = await client.post(action);
  // getUsers devuelve { users: [...] }, no un array ni { items }.
  const arr = Array.isArray(r) ? r : r?.items ?? r?.users ?? r?.data ?? r?.rows ?? [];
  return Array.isArray(arr) ? arr : [];
};

const idOf = (o) => o?.id ?? o?.ID ?? o?.Id ?? null;

/** Un registro es resto de corrida si algún campo de texto lleva el tag. */
function hasTag(row) {
  for (const v of Object.values(row)) {
    if (typeof v === 'string' && TAG.test(v)) return true;
  }
  return false;
}

// Hijo → padre: si se borra el padre primero, el hijo queda huérfano.
// `key` es el nombre del parámetro que espera cada acción: deleteService pide
// `serviceId`, el resto `id`. Con `id` a secas, deleteService respondía
// "Service undefined not found" y los servicios nunca se borraban.
const ENTITIES = [
  { list: 'getServices', remove: 'deleteService', key: 'serviceId' },
  { list: 'getExpenses', remove: 'cancelExpense', key: 'id' },
  { list: 'getInvoices', remove: 'voidInvoice', key: 'id' },
  { list: 'getPayments', remove: 'voidPayment', key: 'id' },
  { list: 'getDriverRates', remove: 'deleteDriverRate', key: 'id' },
  { list: 'getSupplierRates', remove: 'deleteSupplierRate', key: 'id' },
  { list: 'getRateCards', remove: 'deleteRateCard', key: 'id' },
  { list: 'getCollaborators', remove: 'deleteCollaborator', key: 'id' },
  { list: 'getDrivers', remove: 'deleteDriver', key: 'id' },
  { list: 'getVehicles', remove: 'deleteVehicle', key: 'id' },
  { list: 'getProjects', remove: 'deleteProject', key: 'id' },
  { list: 'getClients', remove: 'deleteClient', key: 'id' },
];

const targets = [];

for (const entity of ENTITIES) {
  let rows;
  try {
    rows = await list(entity.list);
  } catch (e) {
    console.log(`  ! ${entity.list}: ${e.message}`);
    continue;
  }
  for (const row of rows) {
    if (!hasTag(row)) continue;
    const id = idOf(row);
    if (!id) continue;
    const label = row.name || row.plate || row.number || row.description || id;
    targets.push({ action: entity.remove, key: entity.key, id, label: String(label).slice(0, 60) });
  }
}

// Usuarios: el username es e2e-<tag>-pending / e2e-<tag>-x
for (const u of await list('getUsers')) {
  const username = u.username || u.Username || '';
  if (!/^e2e-/i.test(username)) continue;
  const id = idOf(u);
  if (id) targets.push({ action: 'deleteUser', id, label: username, userId: id });
}

console.log(`\n${targets.length} restos de corridas E2E\n`);
const byAction = {};
for (const t of targets) byAction[t.action] = (byAction[t.action] || 0) + 1;
for (const [action, n] of Object.entries(byAction)) console.log(`  ${String(n).padStart(3)} ${action}`);
if (dry || !targets.length) {
  if (dry && targets.length) console.log('\n(--dry: no se borró nada)');
  process.exit(0);
}

console.log('');
let ok = 0;
const failed = [];
for (const t of targets) {
  const payload = t.userId
    ? { userId: t.userId }
    : t.key === 'serviceId'
      ? { serviceId: t.id, reason: 'E2E cleanup' }
      : { id: t.id, reason: 'E2E cleanup' };
  try {
    await client.post(t.action, payload);
    ok++;
  } catch (e) {
    failed.push(`${t.action} ${t.id}: ${e.message}`);
  }
}

console.log(`borrados: ${ok}/${targets.length}`);
if (failed.length) {
  console.log('fallaron:');
  for (const f of failed) console.log(`  ✗ ${f}`);
}
