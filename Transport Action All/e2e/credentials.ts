import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Credenciales para los e2e.
 *
 * Orden de resolución: variable de entorno → `.env` local → default.
 * La contraseña NO tiene default a propósito: la temporal `admin123` fue rotada
 * y un default muerto hace que los e2e fallen con "Invalid credentials" en vez
 * de decir qué falta.
 */

function fromEnvFile(key: string): string | undefined {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return undefined;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && match[1] === key) return match[2].replace(/^["']|["']$/g, '');
  }
  return undefined;
}

export const USERNAME = process.env.TEST_USERNAME || fromEnvFile('TEST_USERNAME') || 'admin';

export function adminPassword(): string {
  const value = process.env.TEST_PASSWORD || fromEnvFile('TEST_PASSWORD');

  if (!value) {
    throw new Error(
      'Falta TEST_PASSWORD: los e2e necesitan la contraseña real del admin.\n' +
        '  PowerShell:  $env:TEST_PASSWORD = "<tu contraseña>"\n' +
        '  o agregá TEST_PASSWORD=<tu contraseña> en Transport Action All/.env (ignorado por git).'
    );
  }
  return value;
}
