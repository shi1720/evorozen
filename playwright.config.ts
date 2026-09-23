import { defineConfig, devices } from '@playwright/test';
import { randomUUID } from 'node:crypto';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3212',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3212/api/health',
    timeout: 60000,
    reuseExistingServer: false,
    env: {
      PORT: '3212',
      HOST: '127.0.0.1',
      DATA_DIR: `.data/e2e-${randomUUID()}`,
      APP_ORIGIN: 'http://127.0.0.1:3212',
      EVOROZEN_API_KEY: '',
      OPENAI_API_KEY: '',
      GEMINI_API_KEY: '',
      DATABASE_URL: '',
    },
  },
});
