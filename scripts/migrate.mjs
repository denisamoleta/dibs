// Applies SQL migrations in ./drizzle to the production database before `next build`.
// Without a database URL (local dev, CI) it does nothing: dev uses an embedded Postgres
// that migrates itself on boot.
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL

if (!url) {
  console.log("[migrate] No DATABASE_URL set — skipping migrations.")
  process.exit(0)
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" })
  console.log("[migrate] Database is up to date.")
} catch (err) {
  console.error("[migrate] Migration failed:", err)
  process.exitCode = 1
} finally {
  await client.end()
}
