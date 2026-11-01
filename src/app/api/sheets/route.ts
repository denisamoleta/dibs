import type { NextRequest } from "next/server"
import { clientIp, json, readJson, route } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { createSheet } from "@/lib/sheets"
import { sheetInputSchema } from "@/lib/validation"

export const POST = route(async (req: NextRequest) => {
  await enforceRateLimit("createSheet", clientIp(req))
  const data = await readJson(req, sheetInputSchema)
  const { adminToken, sheet } = await createSheet(data)
  return json({ adminToken, sheet }, { status: 201 })
})
