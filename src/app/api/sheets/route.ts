import { after, type NextRequest } from "next/server"
import { recordEventsSafely } from "@/lib/analytics"
import { clientIp, json, readJson, route } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { createSheet } from "@/lib/sheets"
import { TEMPLATES } from "@/lib/templates"
import { sheetInputSchema } from "@/lib/validation"

export const POST = route(async (req: NextRequest) => {
  await enforceRateLimit("createSheet", clientIp(req))
  const data = await readJson(req, sheetInputSchema)
  const { adminToken, sheet } = await createSheet(data)
  const template = TEMPLATES.some((t) => t.id === data.template) ? data.template! : "blank"
  after(() => recordEventsSafely([{ metric: "sheet_created", dim: template }]))
  return json({ adminToken, sheet }, { status: 201 })
})
