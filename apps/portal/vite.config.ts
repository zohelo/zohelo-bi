import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api is served by `wrangler pages dev` (see README); vite proxies to it.
// fs.allow lets dev read the dashboards at the repository root, outside the app root.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8788" }, fs: { allow: ["../.."] } },
  build: { chunkSizeWarningLimit: 1500 },
});
