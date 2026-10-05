import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './frontend/e2e',
  workers: 1,
  outputDir: './.cache/ui-test-results',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/ui-test-server.cjs',
    url: 'http://127.0.0.1:4179/admin',
    reuseExistingServer: false,
    timeout: 20000,
  },
});
