import { devices } from "@playwright/test";
import { withGuidepup } from "@guidepup/playwright";
import { base } from "./base.config";

// VoiceOver on macOS with WebKit (Safari engine).
export default withGuidepup({ ...base, projects: [{ name: "voiceover-webkit", use: { ...devices["Desktop Safari"] } }] });
