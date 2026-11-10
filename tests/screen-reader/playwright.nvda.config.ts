import { devices } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";
import { base } from "./base.config";

// NVDA on Windows with Chromium.
export default withGuidepup({ ...base, projects: [{ name: "nvda-chrome", use: { ...devices["Desktop Chrome"] } }] });
