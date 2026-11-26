#!/usr/bin/env node
// ============================================================================
// PURGE — borra los datos de prueba que deja la batería E2E
// ============================================================================
// Los comandos del dominio son conservadores a propósito: deleteService solo
// acepta Importado/Asignado, deleteClient corta si hay proyectos, etc. Una
// corrida que falla a mitad deja fixtures en Validado/Realizado/Facturado que
// ningún comando normal puede borrar. Esta herramienta llama a `purgeTestData`
// (solo admin), que barre por ETIQUETA en la hoja y cascada por IDs.
//
// Uso:
//   node scripts/e2e/purge.mjs --dry                 # simulacro con E2E-
//   node scripts/e2e/purge.mjs                       # simulacro, tag E2E-
//   node scripts/e2e/purge.mjs --confirm             # borra de verdad
//   node scripts/e2e/purge.mjs --tag E2E-20261125171628 --confirm
// ============================================================================

import { assertConfig, config, parseArgs } from './lib/env.mjs';
import { createClient, login } from './lib/client.mjs';

const args = parseArgs(process.argv.slice(2));
// parseArgs() es el parser del runner y NO conoce --tag: si se leía de ahí,
// cualquier `--tag` se ignoraba en silencio y se purgaba siempre 'E2E-'.
// Eso dejaba afuera las filas cuyo tag está en minúscula (usuarios `e2e-...`).
const tagArg = (() => {
  const i = process.argv.indexOf('--tag');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith('--tag='));
  return eq ? eq.slice('--tag='.length) : undefined;
})();
const tag = (tagArg ?? process.env.PURGE_TAG ?? 'E2E-').trim();
const confirm = process.argv.includes('--confirm');
const includeUsers = process.argv.includes('--include-users');

if (!/^[A-Za-z0-9._-]{4,}$/.test(tag)) {
  console.error(`\n❌ Tag inválido: "${tag}" (mínimo 4 caracteres: letras, números, . _ -)\n`);
  process.exit(2);
}

assertConfig({ needCredentials: true });

const client = createClient();
await login(client, config.username, config.password);

console.log(`\nEtiqueta: ${tag}`);
console.log(`Modo:     ${confirm ? 'BORRADO REAL' : 'simulacro (sin --confirm)'}`);
console.log(`Usuarios: ${includeUsers ? 'incluidos (nunca admin)' : 'excluidos'}\n`);

const res = await client.post('purgeTestData', {
  tag,
  confirm: confirm ? tag : undefined,
  includeUsers,
  dryRun: !confirm,
});

if (!res || typeof res !== 'object') {
  console.error('respuesta inesperada:', res);
  process.exit(1);
}
if (res.error) {
  console.error(`\n❌ ${res.error}\n`);
  process.exit(1);
}

const rows = Object.entries(res.bySheet || {}).sort((a, b) => b[1] - a[1]);
if (!rows.length) {
  console.log('Nada que borrar: ninguna fila contiene la etiqueta.\n');
  process.exit(0);
}

const width = Math.max(...rows.map(([name]) => name.length), 10);
console.log(`${'Hoja'.padEnd(width)}  Filas`);
console.log(`${'-'.repeat(width)}  -----`);
for (const [name, count] of rows) {
  console.log(`${name.padEnd(width)}  ${String(count).padStart(5)}`);
}

console.log(`\nTotal: ${res.deleted} filas · ${res.idCount} IDs · ${res.passes} pasadas`);
if (res.truncated) {
  console.log('⚠ Cortado por el techo de filas: volvé a correrlo para terminar.');
}
if (res.dryRun) {
  console.log(`\nSimulacro. Para borrar de verdad:\n  node scripts/e2e/purge.mjs --tag ${tag} --confirm\n`);
} else {
  console.log('\n✅ Borrado y auditado (system.testDataPurged).\n');
}
