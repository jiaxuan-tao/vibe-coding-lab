import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1, retries: 0,
  timeout: 25000, reporter: 'line',
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:5188/', headless: Boolean(process.env.CI), reducedMotion: 'reduce' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5188/', reuseExistingServer: !process.env.CI, timeout: 15000 },
});
