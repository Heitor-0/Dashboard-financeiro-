import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    ...(process.env.PW_LOCAL_CHROME_PATH
      ? { launchOptions: { executablePath: process.env.PW_LOCAL_CHROME_PATH } }
      : {}),
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://localhost:4173/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
