// THROWAWAY: runs the research checks in this folder, which the app's suite
// (src/**/*.test.ts) does not include.
// Run: pnpm exec vitest run --config docs/research/checks/vitest.config.ts
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  root: fileURLToPath(new URL("../../..", import.meta.url)),
  resolve: {
    alias: { "@": fileURLToPath(new URL("../../../src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["docs/research/checks/**/*.check.ts"],
  },
})
