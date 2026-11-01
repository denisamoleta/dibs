import { after, type NextRequest } from "next/server"
import { recordEventsSafely } from "@/lib/analytics"
import { authFrom, clientIp, json, parseParam, readJson, route, slugParam, uuidParam } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { claimSpot } from "@/lib/sheets"
import { claimInputSchema } from "@/lib/validation"

export const POST = route(
  async (req: NextRequest, ctx: RouteContext<"/api/sheets/[slug]/items/[itemId]/claims">) => {
    const params = await ctx.params
    const slug = parseParam(slugParam, params.slug)
    const itemId = parseParam(uuidParam, params.itemId)
    await enforceRateLimit("write", clientIp(req))
    const input = await readJson(req, claimInputSchema)
    const result = await claimSpot(slug, itemId, input, authFrom(req))
    after(() => recordEventsSafely([{ metric: "claim_created", dim: "spot" }]))
    return json(result, { status: 201 })
  },
)
