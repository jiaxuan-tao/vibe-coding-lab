import { defineConfig } from '@playwright/test'

const appPath = '/vibe-coding-lab/ai-review-workspace/'
const port = 4173

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}${appPath}`,
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } }
      : {}),
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: `http://127.0.0.1:${port}${appPath}`,
    reuseExistingServer: false,
  },
})
