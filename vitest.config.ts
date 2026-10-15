import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests never reach the dev database: they use PGlite (`src/test/db.ts`).
    env: { DATABASE_URL: "" },
    passWithNoTests: true,
  },
})
