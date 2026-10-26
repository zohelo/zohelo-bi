import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api is served by `wrangler pages dev` (see README); vite proxies to it.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8788" } },
  build: { chunkSizeWarningLimit: 1500 },
});
