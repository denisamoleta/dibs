import type { NextRequest } from "next/server"
import { authFrom, clientIp, json, parseParam, readJson, route, slugParam, uuidParam } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { removeClaim, updateClaim } from "@/lib/sheets"
import { claimUpdateSchema } from "@/lib/validation"

type Ctx = RouteContext<"/api/sheets/[slug]/claims/[claimId]">

async function target(ctx: Ctx) {
  const params = await ctx.params
  return { slug: parseParam(slugParam, params.slug), claimId: parseParam(uuidParam, params.claimId) }
}

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const { slug, claimId } = await target(ctx)
  await enforceRateLimit("write", clientIp(req))
  const patch = await readJson(req, claimUpdateSchema)
  return json(await updateClaim(slug, claimId, authFrom(req), patch))
})

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const { slug, claimId } = await target(ctx)
  await enforceRateLimit("write", clientIp(req))
  return json(await removeClaim(slug, claimId, authFrom(req)))
})
