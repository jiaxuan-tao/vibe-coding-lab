import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  workers: 2,
  use: { baseURL: "http://localhost:4173", trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    {name: 'upstream-en', testIgnore: 'localization.spec.ts', use: {storageState: {cookies: [], origins: [{origin: 'http://localhost:4173', localStorage: [{name: 'vcl.text-compare.locale.v1', value: 'en'}]}]}}},
    {name: 'bilingual', testMatch: 'localization.spec.ts'},
  ],
  webServer: {
    // its own output folder, so running the tests never replaces the site served from dist/
    command: "npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
