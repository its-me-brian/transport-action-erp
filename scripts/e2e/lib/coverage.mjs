// ============================================================================
// COVERAGE — qué acciones del router ejercita la batería
// ============================================================================
// Tres usos distintos:
//
//   1. ESTÁTICO (antes de tocar la red): lee las suites y verifica que cada
//      acción que llaman exista como `case '...'` en api.gs. Un typo en el
//      nombre de una acción hoy se descubre a mitad de la suite, después de
//      dos minutos de cold starts. Acá se descubre en 20 ms.
//
//   2. HUECOS DE UI: acciones que el frontend invoca y la batería NO. Ese es
//      el número que importa para "probar todas las funcionalidades": una
//      acción que nadie llama no es deuda de testing, es código muerto.
//
//   3. RUNTIME (después de correr): el cliente registra cada acción invocada,
//      así la cobertura es lo que REALMENTE se ejecutó.
//
// Las pruebas negativas (acciones que DEBEN fallar) se marcan con el comentario
// `// e2e:negative` en la misma línea, o viven en NEGATIVE_ACTIONS.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { FRONTEND_DIR, ROOT } from './env.mjs';

export const API_PATH = join(ROOT, 'Transport Action Unified', 'api.gs');
export const SUITE_DIR = join(ROOT, 'scripts', 'e2e');
export const UI_SPEC_DIR = join(FRONTEND_DIR, 'e2e');
export const FRONTEND_SRC = join(FRONTEND_DIR, 'src');

/** El propio cliente contiene `.get('action')`: no es una acción de negocio. */
const NOT_SCANNED = new Set(['client.mjs', 'coverage.mjs']);

/** Acciones que se invocan por URL y no por `client.post(...)`. */
const URL_ACTIONS = new Set(['driverForm']);

/** Acciones inexistentes a propósito (pruebas negativas del router). */
const NEGATIVE_ACTIONS = new Set(['accionQueNoExiste']);

/** Acciones del router, en el orden en que aparecen en api.gs. */
export function readRoutes() {
  const src = readFileSync(API_PATH, 'utf8');
  const routes = [];
  const seen = new Set();
  const re = /^\s*case\s+'([^']+)'\s*:/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const action = m[1];
    if (seen.has(action)) continue;
    seen.add(action);
    routes.push(action);
  }
  return routes;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(mjs|js|ts|tsx)$/.test(entry) && !NOT_SCANNED.has(entry)) out.push(full);
  }
  return out;
}

function lineAt(src, index) {
  const start = src.lastIndexOf('\n', index) + 1;
  const end = src.indexOf('\n', index);
  return src.slice(start, end === -1 ? undefined : end);
}

function suiteFiles() {
  return [...walk(SUITE_DIR), ...walk(UI_SPEC_DIR)];
}

/** Misma regla que _normalizeAction en api.gs: apiGetXxx → getXxx. */
function normalizeAction(action) {
  if (action && action.startsWith('api') && action.length > 3) {
    return action.charAt(3).toLowerCase() + action.slice(4);
  }
  return action;
}

/**
 * Call-sites estrictos: `client.post('x')`, `gasPost(request, 'x')`, `action=x`.
 * Esto es lo que valida contra el router (detector de typos).
 */
export function readReferencedActions() {
  const patterns = [
    /\.(?:post|raw|get)\(\s*'([a-z][A-Za-z0-9]*)'/g,
    /gasPost\(\s*[^,]+,\s*'([a-z][A-Za-z0-9]*)'/g,
    /[?&]action=([a-zA-Z][A-Za-z0-9]*)/g,
  ];

  const refs = new Map();
  for (const file of suiteFiles()) {
    const src = readFileSync(file, 'utf8');
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src)) !== null) {
        const action = m[1];
        if (NEGATIVE_ACTIONS.has(action)) continue;
        if (lineAt(src, m.index).includes('e2e:negative')) continue;
        const list = refs.get(action) || [];
        const rel = relative(ROOT, file);
        if (!list.includes(rel)) list.push(rel);
        refs.set(action, list);
      }
    }
  }
  return refs;
}

/**
 * Menciones: cualquier string entre comillas que coincida con una acción.
 * Los flows llaman acciones de forma dinámica (`run('cobrarService', …)`),
 * así que el call-site estricto subestimaría el alcance real.
 */
export function readMentions() {
  const mentions = new Set();
  for (const file of suiteFiles()) {
    const src = readFileSync(file, 'utf8');
    const re = /'([a-zA-Z][A-Za-z0-9]*)'/g;
    let m;
    while ((m = re.exec(src)) !== null) mentions.add(m[1]);
  }
  return mentions;
}

/**
 * Acciones que el frontend invoca (gasPost / gasGet / variantes con retry).
 * Devuelve Map<acción normalizada, archivo>.
 */
export function readFrontendActions() {
  const actions = new Map();
  const re = /gas(?:Post|Get)(?:WithRetry)?\(\s*'([A-Za-z][A-Za-z0-9]*)'/g;

  for (const file of walk(FRONTEND_SRC)) {
    const src = readFileSync(file, 'utf8');
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      actions.set(normalizeAction(m[1]), relative(ROOT, file));
    }
  }
  return actions;
}

/**
 * Validación estática + huecos de UI.
 */
export function staticCheck() {
  const routes = readRoutes();
  const routeSet = new Set(routes);
  const refs = readReferencedActions();
  const mentions = readMentions();
  const frontend = readFrontendActions();

  const unknown = [];
  for (const [action, files] of refs) {
    if (!routeSet.has(action) && !URL_ACTIONS.has(action)) {
      unknown.push({ action, files });
    }
  }

  const referenced = new Set([...refs.keys(), ...URL_ACTIONS]);
  const unusedByBattery = routes.filter((a) => !referenced.has(a) && !mentions.has(a));

  // El número que importa: la UI lo usa y la batería no lo prueba.
  const uiGaps = routes.filter((a) => frontend.has(a) && !referenced.has(a) && !mentions.has(a));

  return { routes, unknown, unusedByBattery, referenced, uiGaps, frontend };
}

/**
 * Cobertura efectiva de una corrida.
 * @param {string[]} called acciones invocadas (allCalls())
 */
export function runtimeCoverage(called) {
  const routes = readRoutes();
  const calledSet = new Set(called);
  const covered = routes.filter((a) => calledSet.has(a));
  const uncovered = routes.filter((a) => !calledSet.has(a));
  return {
    total: routes.length,
    covered: covered.length,
    uncovered,
    percent: routes.length ? Math.round((covered.length / routes.length) * 1000) / 10 : 0,
    calledButUnknown: [...calledSet].filter((a) => !routes.includes(a) && !URL_ACTIONS.has(a)),
  };
}

/** Agrupa por prefijo de dominio para que la lista larga sea legible. */
export function groupByPrefix(actions) {
  const groups = new Map();
  for (const action of actions) {
    const m = action.match(/^(get|create|update|delete|save|approve|reject|apply|mark|close|cerrar|void|recalc)/);
    const key = m ? m[1] : 'otras';
    const list = groups.get(key) || [];
    list.push(action);
    groups.set(key, list);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}
