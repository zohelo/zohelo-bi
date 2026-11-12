import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { yamlData } from "./vite-yaml";

// In development, /api is served by `wrangler pages dev` (see README); vite proxies to it.
// fs.allow lets dev read the dashboards at the repository root, outside the app root.
// Production (bi.zohelo.com) shows only published data (owner direction, 12 Nov 2026; decision O37): a build for it
// (PORTAL_TARGET=production, set by deploy.yml on main) refuses any data mode but live, so the sample provider never
// ships there. ops/check-live-build.sh checks the output too.
export default defineConfig(({ command }) => {
  if (command === "build" && process.env.PORTAL_TARGET === "production" && process.env.VITE_DATA_MODE !== "live")
    throw new Error(
      `a production build needs VITE_DATA_MODE=live, not '${process.env.VITE_DATA_MODE ?? ""}' (sample data never ships to bi.zohelo.com)`,
    );
  return {
    plugins: [react(), yamlData()],
    server: { proxy: { "/api": "http://localhost:8788" }, fs: { allow: ["../.."] } },
    build: { chunkSizeWarningLimit: 1500 },
  };
});
