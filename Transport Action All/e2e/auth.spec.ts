import { test, expect } from '@playwright/test';

const USERNAME = process.env.TEST_USERNAME || 'admin';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';

/**
 * Helper: navigate to a clean auth screen.
 * Clears session, reloads, and waits for the auth form to render.
 */
async function goToAuthScreen(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

test.describe('Auth Flow', () => {
  test('shows login form by default', async ({ page }) => {
    await goToAuthScreen(page);

    // Wait for the username input to be visible — this means the auth screen loaded
    const usernameInput = page.locator('input[placeholder="Enter your username"]');
    await expect(usernameInput).toBeVisible({ timeout: 30_000 });

    // Now check the rest of the form
    await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('can switch between login and register tabs', async ({ page }) => {
    await goToAuthScreen(page);
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible({ timeout: 30_000 });

    // Switch to register
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.locator('input[placeholder="Choose a username"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Switch back to login
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await goToAuthScreen(page);
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible({ timeout: 30_000 });

    await page.fill('input[placeholder="Enter your username"]', 'wronguser');
    await page.fill('input[placeholder="Enter your password"]', 'wrongpass');
    await page.locator('button[type="submit"]').click();

    // Should show an error message (either inline or via toast)
    await expect(
      page.locator('[class*="red"], [class*="error"], [role="alert"]').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('login with valid admin credentials navigates to app', async ({ page }) => {
    await goToAuthScreen(page);
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible({ timeout: 30_000 });

    await page.fill('input[placeholder="Enter your username"]', USERNAME);
    await page.fill('input[placeholder="Enter your password"]', PASSWORD);
    await page.locator('button[type="submit"]').click();

    // After login, should see the main app
    await expect(
      page.locator('#application-container, #main-body-column').first()
    ).toBeVisible({ timeout: 30_000 });

    // Verify we're no longer on the auth screen
    await expect(page.locator('input[placeholder="Enter your username"]')).not.toBeVisible();
  });

  test('register form validates required fields', async ({ page }) => {
    await goToAuthScreen(page);
    await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.locator('input[placeholder="Choose a username"]')).toBeVisible();

    // Fill only partial fields — required fields prevent submission
    await page.fill('input[placeholder="Choose a username"]', 'testuser');
    await page.locator('button[type="submit"]').click();

    // Should stay on register (required fields prevent submission)
    await expect(page.locator('input[placeholder="Choose a username"]')).toBeVisible();
  });
});
