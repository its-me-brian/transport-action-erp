// ============================================================================
// ENV — resolución de configuración para la batería E2E
// ============================================================================
// Orden de resolución:
//   1. variable de entorno del proceso
//   2. .env de la raíz
//   3. Transport Action All/.env
//   4. default explícito (solo para lo que no es credencial)
// ============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const FRONTEND_DIR = resolve(ROOT, 'Transport Action All');

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const fileEnv = {
  ...parseEnvFile(resolve(ROOT, '.env')),
  ...parseEnvFile(resolve(FRONTEND_DIR, '.env')),
};

function pick(key, fallback) {
  const value = process.env[key] ?? fileEnv[key];
  return value === undefined || value === '' ? fallback : value;
}

export function parseArgs(argv) {
  const args = {
    suites: [],
    grep: null,
    verbose: false,
    keep: false,
    json: null,
    ui: false,
    check: false,
    coverage: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--suite' || a === '--only') args.suites.push(argv[++i]);
    else if (a.startsWith('--suite=')) args.suites.push(a.split('=')[1]);
    else if (a === '--grep') args.grep = argv[++i];
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--keep') args.keep = true;
    else if (a === '--json') args.json = argv[++i];
    else if (a === '--ui') args.ui = true;
    else if (a === '--check') args.check = true;
    else if (a === '--coverage') args.coverage = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

export const config = {
  gasUrl: pick('GAS_URL', pick('VITE_GAS_WEBAPP_URL', '')),
  username: pick('TEST_USERNAME', 'admin'),
  password: pick('TEST_PASSWORD', ''),
  baseUrl: pick('BASE_URL', 'http://localhost:3001'),
  timeoutMs: Number(pick('E2E_TIMEOUT_MS', '120000')),
  runTag: `E2E-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`,
};

export function assertConfig({ needCredentials = true } = {}) {
  const problems = [];
  if (!config.gasUrl) {
    problems.push('Falta GAS_URL o VITE_GAS_WEBAPP_URL (Transport Action All/.env).');
  }
  if (needCredentials && !config.password) {
    problems.push(
      'Falta TEST_PASSWORD: la batería necesita la contraseña real de un admin.\n' +
        '  PowerShell:  $env:TEST_PASSWORD = "<tu contraseña>"\n' +
        '  o agregá TEST_PASSWORD=<tu contraseña> en Transport Action All/.env (ignorado por git).'
    );
  }
  if (problems.length) {
    console.error('\n❌ Configuración incompleta:\n');
    for (const p of problems) console.error('   • ' + p);
    console.error('');
    process.exit(2);
  }
}
