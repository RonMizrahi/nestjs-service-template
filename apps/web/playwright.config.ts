import { defineConfig, devices } from '@playwright/test';

/**
 * Hermetic e2e: the API is mocked via page.route (see e2e/helpers.ts), so no live
 * backend is needed. To run against a real service instead, start the dev stack
 * (`docker compose up service`) and point VITE_API_BASE_URL at it.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
