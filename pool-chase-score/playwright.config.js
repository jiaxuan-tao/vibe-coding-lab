import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  timeout: 25_000,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:5177/pool-chase-score/",
    headless: true,
    reducedMotion: "reduce",
  },
  webServer: {
    command: "python3 -m http.server 5177 --bind 127.0.0.1 --directory ..",
    url: "http://127.0.0.1:5177/pool-chase-score/",
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
