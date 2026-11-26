#!/usr/bin/env node
// ============================================================================
// RUNNER — batería E2E de sistema completo
// ============================================================================
// Uso:
//   node scripts/e2e/run.mjs --check          # sin red ni credenciales
//   node scripts/e2e/run.mjs
//   node scripts/e2e/run.mjs --suite 04 --verbose
//   node scripts/e2e/run.mjs --grep "link" --keep
//   node scripts/e2e/run.mjs --json reports/e2e.json --coverage
//
// Requiere TEST_PASSWORD (contraseña real de un admin) y el Web App desplegado.
// --check NO requiere credenciales: valida que cada acción que la batería
// llama exista en el router de api.gs, antes de gastar dos horas en cold starts.
// ============================================================================

import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { assertConfig, config, parseArgs, ROOT } from './lib/env.mjs';
import { allCalls, createClient, login, ApiError } from './lib/client.mjs';
import { createBaseContext, createContext } from './lib/fixtures.mjs';
import { Reporter } from './lib/reporter.mjs';
import { groupByPrefix, runtimeCoverage, staticCheck } from './lib/coverage.mjs';

import * as s01 from './suites/01-system-auth.mjs';
import * as s02 from './suites/02-catalog.mjs';
import * as s03 from './suites/03-service-lifecycle.mjs';
import * as s04 from './suites/04-economics.mjs';
import * as s05 from './suites/05-driver-reports-links.mjs';
import * as s06 from './suites/06-rapportino.mjs';
import * as s07 from './suites/07-invoicing.mjs';
import * as s08 from './suites/08-queries-audit.mjs';
import * as s09 from './suites/09-admin-settings.mjs';

const SUITES = [s01, s02, s03, s04, s05, s06, s07, s08, s09];

// Las suites 02+ dependen de las fixtures (cliente, proyecto, choferes, tarifas).
const NEEDS_FIXTURES = new Set([
  '02-catalog',
  '03-service-lifecycle',
  '04-economics',
  '05-driver-reports-links',
  '06-rapportino',
  '07-invoicing',
  '08-queries-audit',
  '09-admin-settings',
]);

const C = { reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m', green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', cyan: '\x1b[36m' };

// ============================================================================
// LOCK DE CORRIDA
// ============================================================================
// El backend guarda UN solo token por usuario (Users L/M). Dos corridas
// simultáneas comparten la cuenta admin, así que el login de una invalida el
// token de la otra y la corrida entera se llena de 403 falsos. El lock hace
// que la segunda corrida aborte en vez de envenenar los resultados.
const LOCK = resolve(ROOT, 'reports', 'e2e.lock');

function acquireLock() {
  mkdirSync(dirname(LOCK), { recursive: true });
  if (existsSync(LOCK)) {
    const pid = Number(String(readFileSync(LOCK, 'utf8')).trim());
    if (pid) {
      try {
        process.kill(pid, 0);
        return pid; // sigue vivo
      } catch {
        // proceso muerto: el lock es basura de una corrida anterior
      }
    }
  }
  writeFileSync(LOCK, String(process.pid));
  return 0;
}

function releaseLock() {
  try {
    if (existsSync(LOCK) && Number(String(readFileSync(LOCK, 'utf8')).trim()) === process.pid) {
      unlinkSync(LOCK);
    }
  } catch {
    // no importa: el lock se limpia solo cuando el pid desaparece
  }
}

/** Revalida el token antes de cada suite. */
async function ensureSession(client, reporter) {
  try {
    const v = await client.post('validateSession');
    if (v && v.valid === true) return true;
  } catch {
    // cae al re-login
  }
  try {
    await login(client, config.username, config.password);
    reporter.note('sesión renovada: el token anterior dejó de ser válido');
    return true;
  } catch (e) {
    reporter.note(`no se pudo renovar la sesión: ${e.message}`);
    return false;
  }
}


function usage() {
  console.log(`
Batería E2E — Transport Action

  node scripts/e2e/run.mjs [opciones]

Opciones:
  --check          valida la batería contra api.gs sin red ni credenciales
  --coverage       imprime la lista completa de acciones sin ejercitar
  --suite <id>     corre solo esa suite (repetible): 01-system-auth, 02-catalog,
                   03-service-lifecycle, 04-economics, 05-driver-reports-links,
                   06-rapportino, 07-invoicing, 08-queries-audit, 09-admin-settings
  --grep <texto>   corre solo los pasos cuyo nombre contenga el texto
  --verbose, -v    muestra stack en los fallos
  --keep           no borra los datos creados (para inspeccionar en la Sheet)
  --json <ruta>    guarda el reporte completo en JSON
  --ui             recuerda el comando del recorrido de UI (Playwright)
`);
}

/** Preflight estático. Devuelve true si la batería es coherente con el router. */
function preflight({ verbose }) {
  const { routes, unknown, unusedByBattery, referenced } = staticCheck();

  console.log(`\n${C.bold}Preflight${C.reset}`);
  console.log(`  ${C.dim}router${C.reset}     ${routes.length} acciones en api.gs`);
  console.log(`  ${C.dim}batería${C.reset}    ${referenced.size} acciones referenciadas`);

  if (unknown.length) {
    console.log(`\n${C.red}${C.bold}✗ ${unknown.length} acción(es) que la batería llama no existen en el router:${C.reset}`);
    for (const { action, files } of unknown) {
      console.log(`  ${C.red}✗${C.reset} ${C.bold}${action}${C.reset} ${C.dim}— ${files.join(', ')}${C.reset}`);
    }
    console.log(`\n  Un typo acá cuesta una corrida entera: arreglalo antes de ejecutar.\n`);
    return false;
  }

  console.log(`  ${C.green}✓${C.reset} todas las acciones referenciadas existen en el router`);
  if (verbose) {
    for (const [prefix, list] of groupByPrefix(unusedByBattery)) {
      console.log(`  ${C.dim}sin usar (${prefix}): ${list.join(', ')}${C.reset}`);
    }
  }
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return 0;
  }

  if (!preflight({ verbose: args.check || args.verbose })) return 5;

  const { unusedByBattery, uiGaps, routes, frontend } = staticCheck();

  if (args.check) {
    const deadCode = unusedByBattery.filter((a) => !uiGaps.includes(a));

    console.log(`\n${C.bold}Resumen estático${C.reset}`);
    console.log(`  ${routes.length} acciones en el router`);
    console.log(`  ${routes.length - unusedByBattery.length} referenciadas por la batería`);
    console.log(`  ${uiGaps.length} las usa la UI y la batería no prueba  ${C.dim}← huecos reales${C.reset}`);
    console.log(`  ${deadCode.length} no las usa nadie  ${C.dim}← candidatas a código muerto${C.reset}`);

    console.log(`\n${C.bold}Huecos reales (UI sí, batería no):${C.reset}`);
    for (const [prefix, list] of groupByPrefix(uiGaps)) {
      console.log(`  ${C.cyan}${prefix}${C.reset} (${list.length}): ${list.join(', ')}`);
    }

    console.log(`\n${C.bold}Código sin uso (ni UI ni batería):${C.reset}`);
    for (const [prefix, list] of groupByPrefix(deadCode)) {
      console.log(`  ${C.dim}${prefix} (${list.length}): ${list.join(', ')}${C.reset}`);
    }

    console.log(`\n${C.green}✓ Batería coherente con el router.${C.reset} ` +
      `${C.dim}Para ejecutarla hace falta TEST_PASSWORD.${C.reset}`);
    console.log(`${C.dim}   ${frontend.size} acciones distintas invoca el frontend.${C.reset}\n`);
    return 0;
  }

  assertConfig();

  const holder = acquireLock();
  if (holder) {
    console.error(
      `\n❌ Ya hay una corrida E2E activa (pid ${holder}).\n` +
        `   Dos corridas comparten la cuenta admin: el login de una invalida el token de la otra\n` +
        `   y todo el reporte se llena de 403 falsos. Esperá a que termine o matá el proceso.\n`
    );
    return 6;
  }
  process.on('exit', releaseLock);

  const reporter = new Reporter({ verbose: args.verbose, grep: args.grep });
  const selected = args.suites.length
    ? SUITES.filter((s) => args.suites.some((want) => s.name.startsWith(want) || s.name === want))
    : SUITES;

  if (selected.length === 0) {
    console.error(`\n❌ Ninguna suite coincide con: ${args.suites.join(', ')}\n`);
    return 2;
  }

  console.log(`\n${C.bold}Batería E2E — Transport Action${C.reset}`);
  console.log(`  ${C.dim}backend${C.reset} ${config.gasUrl}`);
  console.log(`  ${C.dim}usuario${C.reset} ${config.username}`);
  console.log(`  ${C.dim}tag${C.reset}     ${config.runTag}`);
  console.log(`  ${C.dim}suites${C.reset}  ${selected.map((s) => s.name).join(', ')}`);
  console.log(
    `  ${C.yellow}⚠ escribe datos reales en la Sheet${C.reset} ${C.dim}(tag ${config.runTag};` +
      ` se borran al final salvo --keep)${C.reset}`
  );

  const client = createClient();

  console.log(`\n${C.dim}Autenticando…${C.reset}`);
  try {
    const session = await login(client, config.username, config.password);
    console.log(`  ${C.green}✓${C.reset} ${session.user?.name || config.username} (${session.user?.role})`);
  } catch (e) {
    console.error(`\n❌ No se pudo autenticar: ${e.message}`);
    if (e.code === 'API_ERROR') {
      console.error('   Revisá TEST_PASSWORD. Si la contraseña se rotó, actualizala en Transport Action All/.env.');
    }
    return 3;
  }

  let ctx = createBaseContext(client, reporter);

  if (selected.some((s) => NEEDS_FIXTURES.has(s.name))) {
    console.log(`\n${C.dim}Creando fixtures (cliente, proyecto, 3 choferes, vehículo, tarifas)…${C.reset}`);
    try {
      ctx = await createContext(client, reporter);
    } catch (e) {
      console.error(`\n❌ No se pudieron crear las fixtures: ${e.message}`);
      if (e.code) console.error(`   [${e.code}] ${e.statusCode || ''}`);
      console.error('   Sin fixtures no tiene sentido correr el resto.');
      return 4;
    }
  }

  let interrupted = false;
  const onSignal = () => {
    interrupted = true;
    console.log('\n\x1b[33mInterrumpido — limpiando…\x1b[0m');
  };
  process.on('SIGINT', onSignal);

  for (const suite of selected) {
    if (interrupted) break;
    if (!(await ensureSession(client, reporter))) {
      reporter.check(`sesión válida antes de ${suite.name}`, false, 'token inválido y re-login fallido');
      break;
    }
    reporter.suiteStart(suite.name, suite.description);
    try {
      await suite.run(ctx);
    } catch (e) {
      reporter.check(`la suite ${suite.name} no se cortó`, false, e.message);
      if (args.verbose) console.error(e.stack);
    }
  }

  if (ctx.cleanup && !args.keep) {
    reporter.section('Limpieza');
    const leftovers = await reporter.step('borrar datos de la corrida', () => ctx.cleanup());
    if (Array.isArray(leftovers) && leftovers.length) {
      for (const l of leftovers) reporter.note(`resto: ${l}`);
    }
  } else if (args.keep && ctx.ids) {
    reporter.note(`--keep: los datos quedaron con el tag ${ctx.tag}`);
  }

  const summary = reporter.summary();
  const coverage = runtimeCoverage(allCalls());

  reporter.section('Cobertura de acciones');
  console.log(
    `  ${coverage.covered}/${coverage.total} acciones del router ejercitadas ` +
      `${C.dim}(${coverage.percent}%)${C.reset}`
  );
  if (coverage.uncovered.length) {
    console.log(`  ${C.dim}sin ejercitar: ${coverage.uncovered.length}${C.reset}`);
    if (args.coverage) {
      for (const [prefix, list] of groupByPrefix(coverage.uncovered)) {
        console.log(`    ${C.cyan}${prefix}${C.reset} (${list.length}): ${list.join(', ')}`);
      }
    } else {
      console.log(`  ${C.dim}--coverage para la lista completa${C.reset}`);
    }
  }
  if (coverage.calledButUnknown.length) {
    console.log(`  ${C.yellow}⚠ acciones llamadas que el router no declara: ${coverage.calledButUnknown.join(', ')}${C.reset}`);
  }

  if (args.json) {
    const out = resolve(ROOT, args.json);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(
      out,
      JSON.stringify(
        {
          startedAt: new Date(Date.now() - summary.ms).toISOString(),
          gasUrl: config.gasUrl,
          user: config.username,
          tag: ctx.tag,
          summary: { total: summary.total, pass: summary.pass, fail: summary.fail, skip: summary.skip, ms: summary.ms },
          coverage: {
            total: coverage.total,
            covered: coverage.covered,
            percent: coverage.percent,
            uncovered: coverage.uncovered,
          },
          results: summary.results,
        },
        null,
        2
      )
    );
    console.log(`Reporte JSON: ${out}\n`);
  }

  if (args.ui) {
    console.log('Para el recorrido de UI:');
    console.log('  cd "Transport Action All"');
    console.log('  npx playwright test e2e/full-system.spec.ts\n');
  }

  return summary.fail === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    if (e instanceof ApiError) {
      console.error(`\n❌ ${e.code}: ${e.message}`);
    } else {
      console.error('\n❌ Error inesperado:', e);
    }
    process.exit(1);
  });
