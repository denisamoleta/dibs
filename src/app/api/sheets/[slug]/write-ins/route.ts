import { after, type NextRequest } from "next/server"
import { recordEventsSafely } from "@/lib/analytics"
import { authFrom, clientIp, json, parseParam, readJson, route, slugParam } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { writeIn } from "@/lib/sheets"
import { writeInInputSchema } from "@/lib/validation"

export const POST = route(async (req: NextRequest, ctx: RouteContext<"/api/sheets/[slug]/write-ins">) => {
  const slug = parseParam(slugParam, (await ctx.params).slug)
  await enforceRateLimit("write", clientIp(req))
  const input = await readJson(req, writeInInputSchema)
  const result = await writeIn(slug, input, authFrom(req))
  after(() => recordEventsSafely([{ metric: "claim_created", dim: "write_in" }]))
  return json(result, { status: 201 })
})
