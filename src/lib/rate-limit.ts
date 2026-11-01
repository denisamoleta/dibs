import "server-only"
import { sql } from "drizzle-orm"
import { getDb } from "./db"
import { rateLimits } from "./db/schema"
import { AppError } from "./errors"
import { hashSecret } from "./tokens"

export const RATE_LIMITS = {
  createSheet: { limit: 15, windowSec: 60 * 60 },
  write: { limit: 120, windowSec: 10 * 60 },
  admin: { limit: 60, windowSec: 10 * 60 },
} as const

type Bucket = keyof typeof RATE_LIMITS

/**
 * Fixed-window counter in Postgres, keyed by a salted hash of the client IP
 * (we never store raw IPs). Fails open: a database hiccup should not lock people out.
 */
export async function enforceRateLimit(bucket: Bucket, ip: string) {
  const { limit, windowSec } = RATE_LIMITS[bucket]
  const salt = process.env.RATE_LIMIT_SALT ?? "dibs"
  const key = `${bucket}:${hashSecret(`${salt}:${ip}`).slice(0, 40)}`
  const expired = sql`${rateLimits.windowStart} < now() - (${windowSec}::int * interval '1 second')`

  let current: number
  try {
    const db = await getDb()
    const [row] = await db
      .insert(rateLimits)
      .values({ key, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
          windowStart: sql`case when ${expired} then now() else ${rateLimits.windowStart} end`,
        },
      })
      .returning({ count: rateLimits.count })
    current = row.count
  } catch (err) {
    console.error("rate limit check failed", err)
    return
  }

  if (current > limit) {
    throw new AppError(429, "rate_limited", "Slow down a little — too many requests. Try again in a few minutes.")
  }
}
