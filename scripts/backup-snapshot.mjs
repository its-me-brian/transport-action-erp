#!/usr/bin/env node
/**
 * scripts/backup-snapshot.mjs
 *
 * Snapshot de DATOS de la base (Google Sheet) a un JSON local con fecha.
 * No necesita clasp ni credenciales de Google: usa la API del Web App.
 *
 * Uso:
 *   node scripts/backup-snapshot.mjs
 *   node scripts/backup-snapshot.mjs --out D:\backups
 *
 * Variables de entorno (si no están, se leen del .env del frontend):
 *   GAS_URL        URL /exec del Web App
 *   ADMIN_USER     usuario admin
 *   ADMIN_PASSWORD contraseña del admin
 *
 * El backend enmascara Users.Password_Hash / Salt / Token antes de responder,
 * así que el archivo resultante NO sirve para restaurar contraseñas: eso se
 * resuelve con un reset desde /user-management.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, 'Transport Action All', '.env');

function readEnvFile() {
  if (!existsSync(ENV_PATH)) return {};
  const out = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const envFile = readEnvFile();
const GAS_URL = process.env.GAS_URL || envFile.VITE_GAS_WEBAPP_URL;
const USER = process.env.ADMIN_USER || 'admin';
const PASSWORD = process.env.ADMIN_PASSWORD;
const OUT_DIR = resolve(ROOT, argValue('--out') || 'backups');
const INCLUDE = argValue('--include');

if (!GAS_URL) {
  console.error('Falta GAS_URL (o VITE_GAS_WEBAPP_URL en Transport Action All/.env)');
  process.exit(2);
}
if (!PASSWORD) {
  console.error('Falta ADMIN_PASSWORD en el entorno.');
  process.exit(2);
}

async function call(params) {
  const url = new URL(GAS_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${params.action}`);
  const body = await res.json();
  if (!body.success) {
    const err = body.error || body;
    throw new Error(`${params.action}: ${err.message || JSON.stringify(err)}`);
  }
  return body.data;
}

function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const login = await call({ action: 'login', username: USER, password: PASSWORD });
if (!login.token) throw new Error('login no devolvió token');
console.log(`Login OK: ${login.user.username} (${login.user.role})`);

const summary = await call({ action: 'snapshotSummary', token: login.token });
const snapshot = await call({
  action: 'exportSnapshot',
  token: login.token,
  includeSheets: INCLUDE
});

mkdirSync(OUT_DIR, { recursive: true });
const file = resolve(OUT_DIR, `db-${stamp()}.json`);
writeFileSync(file, JSON.stringify(snapshot, null, 1), 'utf8');

const rows = Object.entries(summary.counts).sort((a, b) => b[1] - a[1]);
const width = Math.max(...rows.map(([n]) => n.length), 10);
console.log(`\n${'Hoja'.padEnd(width)}  Filas`);
console.log(`${'-'.repeat(width)}  -----`);
for (const [name, count] of rows) {
  console.log(`${name.padEnd(width)}  ${String(count).padStart(5)}`);
}

console.log(`\nHojas: ${summary.sheetCount}   Filas totales: ${summary.totalRows}`);
if (snapshot.truncated && snapshot.truncated.length) {
  console.log(`AVISO: hojas recortadas por tamaño: ${snapshot.truncated.join(', ')}`);
}
console.log(`Archivo: ${file}  (${kb(statSync(file).size)})`);
console.log(`Generado: ${snapshot.generatedAt}`);
