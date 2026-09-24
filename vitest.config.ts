import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Route handlers open DB_URL; under test it is a fresh in-memory database, never the dev file.
    env: { DB_URL: ":memory:" },
    passWithNoTests: true,
  },
})
