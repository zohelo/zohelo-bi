import { defineConfig } from "vitest/config";
import { yamlData } from "./apps/portal/vite-yaml";

export default defineConfig({
  plugins: [yamlData()],
  esbuild: { jsx: "automatic" },
  test: {
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/dist/**", "**/node_modules/**", "**/.claude/worktrees/**"],
    environment: "node",
  },
});
