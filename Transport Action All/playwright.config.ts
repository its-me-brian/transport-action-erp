import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for Transport Action ERP.
 *
 * Environment variables:
 *   BASE_URL       — Vite dev server (default: http://localhost:3000)
 *   TEST_USERNAME  — admin username (default: admin)
 *   TEST_PASSWORD  — admin password  (default: admin123)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // sequential — each test depends on the previous state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],

  timeout: 60_000,       // 60s per test (GAS cold starts can be slow)
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start Vite dev server before running tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
