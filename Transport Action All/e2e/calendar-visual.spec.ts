import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { USERNAME, adminPassword } from './credentials';

const REPORTS = resolve(process.cwd(), '..', 'reports');
const NOTES: string[] = [];

async function login(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });

  const username = page.locator('input[placeholder="Enter your username"]');
  await expect(username).toBeVisible({ timeout: 30_000 });
  await username.fill(USERNAME);
  await page.locator('input[placeholder="Enter your password"]').fill(adminPassword());
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('#application-container, #main-body-column').first()).toBeVisible({ timeout: 45_000 });
}

test.describe.configure({ mode: 'serial' });

test('calendar visual pass: views, filters, keyboard, reduced motion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon|net::ERR|Failed to load resource/i.test(msg.text())) {
      errors.push(`console: ${msg.text()}`);
    }
  });

  await login(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Master Calendar' })).toBeVisible({ timeout: 30_000 });

  const viewButton = (mode: string) =>
    page.locator('button.capitalize').filter({ hasText: new RegExp(`^${mode}$`, 'i') });

  for (const mode of ['week', 'month', 'day']) {
    await viewButton(mode).click();
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await expect(viewButton(mode).locator('span').last()).toHaveClass(/text-surface-container-lowest/);
    const body = await page.locator('body').innerText();
    expect(body.length, `${mode}: pantalla vacía`).toBeGreaterThan(80);
    await page.screenshot({ path: resolve(REPORTS, `calendar-${mode}.png`), fullPage: true });
    NOTES.push(`${mode}: ${body.length} chars visibles`);
  }

  // Producción en gris: puede no haber servicios de producción en el seed.
  const readOnlyCards = page.locator('[aria-disabled="true"]');
  const readOnlyCount = await readOnlyCards.count();
  NOTES.push(`tarjetas aria-disabled (producción): ${readOnlyCount}`);
  if (readOnlyCount > 0) {
    const style = await readOnlyCards.first().evaluate((el) => {
      const s = getComputedStyle(el);
      return { cursor: s.cursor, opacity: s.opacity, filter: s.filter };
    });
    expect(style.cursor).toBe('not-allowed');
    NOTES.push(`producción: cursor=${style.cursor}, opacity=${style.opacity}, filter=${style.filter}`);
  }

  // Teclado: la primera tarjeta editable debe poder tomar foco.
  await viewButton('week').click();
  await page.waitForTimeout(1000);
  const editable = page.locator('[role="button"][tabindex="0"]');
  const editableCount = await editable.count();
  NOTES.push(`tarjetas enfocables: ${editableCount}`);
  if (editableCount > 0) {
    await editable.first().focus();
    const focused = await editable.first().evaluate((el) => document.activeElement === el);
    expect(focused, 'la tarjeta no recibe foco').toBe(true);
  }

  // Filtros activos y botón de limpieza.
  const selects = page.locator('select');
  await selects.nth(1).selectOption({ index: 1 });
  await page.waitForTimeout(800);
  await expect(page.getByRole('button', { name: /Clear filters/i })).toBeVisible();
  await page.screenshot({ path: resolve(REPORTS, 'calendar-filtered.png'), fullPage: true });
  await page.getByRole('button', { name: /Clear filters/i }).click();
  await page.waitForTimeout(800);
  await expect(page.getByRole('button', { name: /Clear filters/i })).toHaveCount(0);
  NOTES.push('filtro aplicado → Clear filters visible → limpieza OK');

  // Movimiento reducido: cambiar de vista no debe romper nada.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await viewButton('month').click();
  await page.waitForTimeout(700);
  await viewButton('day').click();
  await page.waitForTimeout(700);
  NOTES.push('reduced-motion: cambio day↔month sin errores');

  expect(errors, `Errores de consola:\n${errors.join('\n')}`).toEqual([]);
  console.log('NOTAS VISUALES:\n' + NOTES.join('\n'));
});

test('producción: gris, aria-disabled y sin interacción (inyectada sólo en el navegador)', async ({ page }) => {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (!url.includes('apiGetServices')) return route.continue();
    const response = await route.fetch();
    const json = await response.json();
    const first = Array.isArray(json?.data) ? json.data[0] : null;
    expect(first, 'el seed no tiene servicios para clonar').toBeTruthy();
    const clone = {
      ...first,
      id: 'VISUAL-PROD-1',
      vehicleType: 'Production Van',
      driverName: 'Producción',
      clientName: 'Producción interna',
    };
    json.data = [clone, ...json.data];
    await route.fulfill({ response, body: JSON.stringify(json) });
  });

  await login(page);
  await page.goto('/transport', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 45_000 });
  await page.locator('button.capitalize').filter({ hasText: /^week$/i }).click();
  await page.waitForTimeout(1000);

  const card = page.locator('[aria-label*="Producción"]').first();
  await expect(card).toHaveAttribute('aria-disabled', 'true');
  await expect(card).toHaveAttribute('role', 'group');
  await expect(card).not.toHaveAttribute('tabindex');

  const style = await card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { cursor: s.cursor, opacity: s.opacity, filter: s.filter, background: s.backgroundColor };
  });
  expect(style.cursor).toBe('not-allowed');
  expect(style.opacity).toBe('0.6');
  expect(style.filter).toContain('grayscale');

  await card.click({ force: true });
  await expect(page).toHaveURL(/\/transport$/);
  await page.screenshot({ path: resolve(REPORTS, 'calendar-production.png'), fullPage: true });
  console.log(`PRODUCCIÓN: cursor=${style.cursor} opacity=${style.opacity} filter=${style.filter} bg=${style.background}`);
});
