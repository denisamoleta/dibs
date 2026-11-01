import { json, readJson, route } from "@/lib/http"
import { lookupSheets } from "@/lib/sheets"
import { lookupSchema } from "@/lib/validation"

// Powers "My sheets": progress for the sheets this device remembers.
export const POST = route(async (req: Request) => {
  const { slugs } = await readJson(req, lookupSchema)
  return json({ sheets: await lookupSheets(slugs) })
})
