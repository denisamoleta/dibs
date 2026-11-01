import type { NextRequest } from "next/server"
import { authFrom, clientIp, json, parseParam, readJson, route, slugParam } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { writeIn } from "@/lib/sheets"
import { writeInInputSchema } from "@/lib/validation"

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/sheets/[slug]/write-ins">) => {
  const slug = parseParam(slugParam, (await ctx.params).slug)
  await enforceRateLimit("write", clientIp(req))
  const input = await readJson(req, writeInInputSchema)
  return json(await writeIn(slug, input, authFrom(req)), { status: 201 })
})
