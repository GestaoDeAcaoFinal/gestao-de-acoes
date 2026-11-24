import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: {
    ...devices['Desktop Chrome'],
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined
  } }],
  webServer: [
    {
      command: 'node e2e/start-backend.mjs',
      url: 'http://127.0.0.1:19090/__e2e/ready',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      name: 'Spring E2E'
    },
    {
      command: 'npm run start -- --configuration=e2e --host=127.0.0.1 --port=4300',
      url: 'http://127.0.0.1:4300',
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: 'pipe',
      name: 'Angular E2E'
    }
  ]
});
