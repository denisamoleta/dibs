import { pruneVisitorHashes } from "@/lib/analytics"
import { secretMatches, hashSecret } from "@/lib/tokens"
import { json, route } from "@/lib/http"
import { cleanupExpired } from "@/lib/sheets"

// Called daily by Vercel Cron, which sends `Authorization: Bearer $CRON_SECRET`.
export const GET = route(async (req: Request) => {
  const secret = process.env.CRON_SECRET
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!secret || !secretMatches(provided, hashSecret(secret))) {
    return json({ error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 })
  }
  const result = await cleanupExpired()
  return json({ ...result, prunedVisitorHashes: await pruneVisitorHashes() })
})
