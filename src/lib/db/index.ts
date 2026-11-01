import "server-only"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export type Db = PostgresJsDatabase<typeof schema>

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle")

// Survives dev hot reloads so we never open the embedded database twice.
const globalForDb = globalThis as unknown as { __dibsDb?: Promise<Db> }

export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined
}

async function connect(): Promise<Db> {
  const url = databaseUrl()
  if (url) {
    // prepare: false keeps us compatible with transaction poolers (Supabase, Neon pooler).
    const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20 })
    return drizzle(client, { schema })
  }

  if (process.env.NODE_ENV === "production" && !process.env.DIBS_ALLOW_EMBEDDED_DB) {
    throw new Error("DATABASE_URL is not set. Connect a Postgres database (see README).")
  }

  // Local development and tests: embedded Postgres (PGlite), migrated on boot.
  const { PGlite } = await import("@electric-sql/pglite")
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite")
  const { migrate } = await import("drizzle-orm/pglite/migrator")
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite")
  if (dataDir !== "memory://") await mkdir(dataDir, { recursive: true })
  const client = dataDir === "memory://" ? new PGlite() : new PGlite(dataDir)
  const db = drizzlePglite(client, { schema })
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  // Same query-builder surface as postgres-js; the cast keeps one Db type app-wide.
  return db as unknown as Db
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__dibsDb) {
    globalForDb.__dibsDb = connect().catch((err) => {
      globalForDb.__dibsDb = undefined
      throw err
    })
  }
  return globalForDb.__dibsDb
}

export { schema }
