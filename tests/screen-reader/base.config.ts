import type { PlaywrightTestConfig } from "@playwright/test";

export const base: PlaywrightTestConfig = {
  testDir: ".",
  testMatch: /.*\.sr\.ts/,
  timeout: 5 * 60 * 1000,
  retries: 2,
  reporter: [["list"], ["html", { open: "never", outputFolder: "report" }]],
  outputDir: "results",
  use: { baseURL: "http://localhost:4174", trace: "retain-on-failure", video: "retain-on-failure" },
  webServer: { command: "node serve.mjs", url: "http://localhost:4174/mockups/index.html", reuseExistingServer: false },
};
