import type { NextRequest } from "next/server"
import { getStats } from "@/lib/analytics"
import { AppError } from "@/lib/errors"
import { clientIp, json, route } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { hashSecret, secretMatches } from "@/lib/tokens"

const RANGES = new Set([7, 30, 90])

// Owner-only usage stats. Protected by the ADMIN_KEY environment variable.
export const GET = route(async (req: NextRequest) => {
  await enforceRateLimit("admin", clientIp(req))
  const key = process.env.ADMIN_KEY
  if (!key) {
    throw new AppError(503, "not_configured", "The dashboard isn't set up yet: add ADMIN_KEY in your Vercel environment variables.")
  }
  if (!secretMatches(req.headers.get("x-admin-key"), hashSecret(key))) {
    throw new AppError(401, "unauthorized", "That key isn't right.")
  }
  const days = Number(req.nextUrl.searchParams.get("days") ?? 30)
  return json(await getStats(RANGES.has(days) ? days : 30))
})
