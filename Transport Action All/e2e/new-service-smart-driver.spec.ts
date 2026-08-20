import { test, expect } from '@playwright/test';

const USERNAME = process.env.TEST_USERNAME || 'admin';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';

/**
 * Helper: log in as admin and wait for the dashboard to load.
 */
async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible({ timeout: 15_000 });
  await page.fill('input[placeholder="Enter your username"]', USERNAME);
  await page.fill('input[placeholder="Enter your password"]', PASSWORD);
  await page.click('button:has-text("Sign In")');

  // Wait for dashboard to load
  await expect(
    page.locator('#application-container, #main-body-column').first()
  ).toBeVisible({ timeout: 30_000 });
}

test.describe('New Service + Smart Driver Creation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigates to new service form via Add Service button', async ({ page }) => {
    // Click the Add Service CTA on the dashboard
    const addBtn = page.locator('#add-service-cta-btn');
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();

    // Should see the new service form
    await expect(page.locator('#new-service-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#save-service-btn')).toBeVisible();
  });

  test('validates required fields before saving', async ({ page }) => {
    await page.locator('#add-service-cta-btn').click();
    await expect(page.locator('#new-service-screen')).toBeVisible({ timeout: 10_000 });

    // Click Save without filling required fields
    await page.click('#save-service-btn');

    // Should show validation errors (Toast or inline)
    await expect(
      page.locator('text=Please fill out all required fields').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('shows driver autocomplete dropdown when typing', async ({ page }) => {
    await page.locator('#add-service-cta-btn').click();
    await expect(page.locator('#new-service-screen')).toBeVisible({ timeout: 10_000 });

    // Type in the driver search field
    const driverInput = page.locator('input[placeholder="Search drivers..."]');
    await expect(driverInput).toBeVisible();
    await driverInput.fill('Test');

    // Dropdown should appear
    await expect(
      page.locator('text=Create new driver').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('opens create driver modal when clicking "Create new driver"', async ({ page }) => {
    await page.locator('#add-service-cta-btn').click();
    await expect(page.locator('#new-service-screen')).toBeVisible({ timeout: 10_000 });

    // Type a non-existent driver name
    const driverInput = page.locator('input[placeholder="Search drivers..."]');
    await driverInput.fill('E2E Test Driver');

    // Click "Create new driver" option
    await page.click('text=Create new driver');

    // Modal should appear
    await expect(page.locator('text=Create New Driver').last()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('input[placeholder="+34 600 000 000"]')).toBeVisible();
  });

  test('create driver modal can be cancelled', async ({ page }) => {
    await page.locator('#add-service-cta-btn').click();
    await expect(page.locator('#new-service-screen')).toBeVisible({ timeout: 10_000 });

    const driverInput = page.locator('input[placeholder="Search drivers..."]');
    await driverInput.fill('E2E Test Driver');
    await page.click('text=Create new driver');

    // Modal should appear
    await expect(page.locator('text=Create New Driver').last()).toBeVisible({ timeout: 5_000 });

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Modal should close
    await expect(page.locator('text=Create New Driver').last()).not.toBeVisible({ timeout: 5_000 });
  });

  test('creates new service with existing driver selection', async ({ page }) => {
    await page.locator('#add-service-cta-btn').click();
    await expect(page.locator('#new-service-screen')).toBeVisible({ timeout: 10_000 });

    // Select a project (first available)
    const projectSelect = page.locator('#project-select-field');
    await projectSelect.waitFor({ state: 'visible', timeout: 10_000 });
    const options = await projectSelect.locator('option').all();
    if (options.length > 1) {
      const value = await options[1].getAttribute('value');
      if (value) await projectSelect.selectOption(value);
    }

    // Fill route
    await page.fill('input[placeholder="Enter origin address"]', 'E2E Test Pickup');
    await page.fill('input[placeholder="Enter destination"]', 'E2E Test Dropoff');

    // Submit
    await page.click('#save-service-btn');

    // Should show success toast or navigate back
    await expect(
      page.locator('text=Service created successfully, text=Success').first()
    ).toBeVisible({ timeout: 30_000 });
  });
});
