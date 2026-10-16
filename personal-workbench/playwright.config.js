import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser', fullyParallel:false, workers:1, timeout:30000,
  use:{baseURL:process.env.BASE_URL||'http://127.0.0.1:5191/',headless:!!process.env.CI,serviceWorkers:'block',timezoneId:'Asia/Shanghai'},
  webServer:process.env.BASE_URL?undefined:{command:'npm run dev',url:'http://127.0.0.1:5191/',reuseExistingServer:!process.env.CI},
});
