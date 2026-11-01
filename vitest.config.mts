import path from "node:path"
import { defineConfig } from "vitest/config"

const root = import.meta.dirname

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "server-only": path.resolve(root, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: { PGLITE_DIR: "memory://", DATABASE_URL: "", POSTGRES_URL: "" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
