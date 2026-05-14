import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 8000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { outputFolder: 'tests/reports' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8081',
    headless: false,         // set true to run without browser window
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari (iPhone)',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
