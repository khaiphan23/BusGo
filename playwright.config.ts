import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against its own dev server on port 3100 so it never attaches to a
 * developer's server on 3000 (which may be running without the env this suite needs).
 *
 * `NEXT_PUBLIC_MAPBOX_TOKEN` is injected here: Next.js does not overwrite env vars that
 * are already set, so it wins over the placeholder in .env.local and lets the spec stub
 * every Mapbox request behind it.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './apps/web/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 120_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: `pnpm --filter bus-transport-system-web exec next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PORT: String(PORT),
      NEXT_PUBLIC_MAPBOX_TOKEN:
        process.env.NEXT_PUBLIC_MAPBOX_TOKEN_E2E ??
        'pk.e2e_0123456789abcdef0123456789abcdef',
    },
  },
});
