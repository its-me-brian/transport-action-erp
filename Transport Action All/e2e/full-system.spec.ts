import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { USERNAME, adminPassword, gasUrl } from './credentials';
import { routes } from '../src/routes';

/**
 * Batería de UI — recorre TODAS las pantallas y los flujos que sólo se pueden
 * probar en un navegador (link público del chofer).
 *
 * La lógica de negocio se prueba en scripts/e2e/run.mjs (API-level). Acá el
 * objetivo es distinto: detectar pantallas que crashean, payloads con forma
 * inesperada y errores de render.
 */

const GAS_URL = gasUrl();

const CRASH_MARKERS = [
  'Algo salió mal',
  'Cannot read properties',
  'Application error',
  'Minified React error',
];

const SCREENS: { path: string; name: string }[] = [
  { path: routes.dashboard, name: 'Dashboard' },
  { path: routes.transport, name: 'Transport' },
  { path: routes.transportList, name: 'Transport List' },
  { path: routes.driverReports, name: 'Driver Reports' },
  { path: routes.driverLinks, name: 'Driver Links' },
  { path: routes.driverSubmissions, name: 'Driver Submissions' },
  { path: routes.rapportinos, name: 'Rapportinos' },
  { path: routes.reconciliation, name: 'Reconciliation' },
  { path: routes.accounting, name: 'Accounting' },
  { path: routes.financial, name: 'Financial' },
  { path: routes.customers, name: 'Customers' },
  { path: routes.contacts, name: 'Contacts' },
  { path: routes.providers, name: 'Providers' },
  { path: routes.drivers, name: 'Drivers' },
  { path: routes.vehicles, name: 'Vehicles' },
  { path: routes.projects, name: 'Projects' },
  { path: routes.rateCards, name: 'Rate Cards' },
  { path: routes.documents, name: 'Documents' },
  { path: routes.reports, name: 'Reports' },
  { path: routes.auditCenter, name: 'Audit Center' },
  { path: routes.activeUsers, name: 'Active Users' },
  { path: routes.userManagement, name: 'User Management' },
  { path: routes.settings, name: 'Settings' },
  { path: routes.newService, name: 'New Service' },
];

async function login(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });

  const username = page.locator('input[placeholder="Enter your username"]');
  await expect(username).toBeVisible({ timeout: 30_000 });
  await username.fill(USERNAME);
  await page.locator('input[placeholder="Enter your password"]').fill(adminPassword());
  await page.locator('button[type="submit"]').click();

  await expect(page.locator('#application-container, #main-body-column').first()).toBeVisible({
    timeout: 45_000,
  });
}

async function gasPost(request: APIRequestContext, action: string, payload: object) {
  const res = await request.post(`${GAS_URL}?action=${action}`, {
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    data: JSON.stringify(payload),
  });
  return res.json();
}

async function apiToken(request: APIRequestContext): Promise<string> {
  const body = await gasPost(request, 'loginUser', {
    username: USERNAME,
    password: adminPassword(),
  });
  const token = body?.data?.token;
  expect(token, 'login API sin token').toBeTruthy();
  return token;
}

test.describe.configure({ mode: 'serial' });

test.describe('Batería UI — sistema completo', () => {
  test('login real y llegada al dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/dashboard|transport/);
  });

  test('todas las pantallas renderizan sin crash', async ({ page }) => {
    await login(page);

    const failures: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`console: ${msg.text()}`);
    });

    for (const screen of SCREENS) {
      await test.step(screen.name, async () => {
        const before = consoleErrors.length;
        await page.goto(screen.path, { waitUntil: 'domcontentloaded' });

        // Dar tiempo al fetch inicial (GAS puede tardar en frío).
        await page.waitForTimeout(1500);

        const body = (await page.locator('body').innerText()).slice(0, 20_000);
        const crash = CRASH_MARKERS.find((m) => body.includes(m));
        if (crash) {
          failures.push(`${screen.name} (${screen.path}): "${crash}"`);
          return;
        }

        const newErrors = consoleErrors
          .slice(before)
          .filter((e) => !/favicon|Failed to load resource.*40[34]|net::ERR/i.test(e));
        if (newErrors.length) {
          failures.push(`${screen.name} (${screen.path}): ${newErrors[0]}`);
        }

        // Una pantalla vacía también es un fallo: debe haber algo visible.
        const visible = await page.locator('h1, h2, [class*="text-2xl"], [class*="font-bold"]').count();
        expect.soft(visible, `${screen.name} sin encabezado visible`).toBeGreaterThan(0);
      });
    }

    expect(failures, `Pantallas con problemas:\n${failures.join('\n')}`).toEqual([]);
  });

  test('workspace del servicio: las 6 pestañas abren', async ({ page, request }) => {
    test.skip(!GAS_URL, 'Falta GAS_URL/VITE_GAS_WEBAPP_URL');

    const token = await apiToken(request);
    const list = await gasPost(request, 'getServices', { token, limit: 1 });
    const service = Array.isArray(list?.data) ? list.data[0] : null;
    test.skip(!service?.id, 'No hay servicios para abrir el workspace');

    await login(page);

    const tabs = [
      { path: routes.service(service.id), name: 'Overview' },
      { path: routes.serviceMovements(service.id), name: 'Movements' },
      { path: routes.serviceOperations(service.id), name: 'Operations' },
      { path: routes.serviceCommunication(service.id), name: 'Communication' },
      { path: routes.serviceFinance(service.id), name: 'Finance' },
      { path: routes.serviceHistory(service.id), name: 'History' },
    ];

    const failures: string[] = [];
    for (const tab of tabs) {
      await test.step(tab.name, async () => {
        await page.goto(tab.path, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);
        const body = (await page.locator('body').innerText()).slice(0, 20_000);
        const crash = CRASH_MARKERS.find((m) => body.includes(m));
        if (crash) failures.push(`${tab.name}: "${crash}"`);
        if (body.trim().length < 40) failures.push(`${tab.name}: pantalla vacía`);
      });
    }

    expect(failures, `Pestañas con problemas:\n${failures.join('\n')}`).toEqual([]);
  });

  test('link público del chofer: abre, se completa y se envía', async ({ page, request }) => {
    test.skip(!GAS_URL, 'Falta GAS_URL/VITE_GAS_WEBAPP_URL');

    const token = await apiToken(request);

    const driversBody = await gasPost(request, 'getDrivers', { token });
    const drivers = driversBody?.data || [];
    test.skip(drivers.length === 0, 'No hay choferes para generar el link');

    const today = new Date().toISOString().slice(0, 10);
    const linkBody = await gasPost(request, 'generateDriverLink', {
      token,
      driverId: drivers[0].id,
      dateFrom: today,
      dateTo: today,
      baseUrl: GAS_URL,
      linkDurationDays: 1,
    });
    const link = linkBody?.data;
    test.skip(!link?.link, 'generateDriverLink no devolvió link');

    await page.goto(link.link, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Rapportino Transport' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('.driver-name')).toBeVisible();

    // El formulario arranca colapsado: "Apri" despliega los campos del servicio.
    const open = page.getByRole('button', { name: 'Apri' }).first();
    if (await open.count()) {
      await open.click();
      await page.locator('#f-orarioInizio-0').fill('08:00');
      await page.locator('#f-orarioFine-0').fill('18:30');
      await page.locator('#f-kmTotali-0').fill('120');
      await page.locator('#f-diaria-0').selectOption('piena');
    }

    await page.getByRole('button', { name: /Invia Rapportino/i }).first().click();

    await expect(
      page.locator('text=/Rapportino inviato|Rapportino già inviato/i').first()
    ).toBeVisible({ timeout: 45_000 });
  });
});
