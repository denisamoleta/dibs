import type { NextRequest } from "next/server"
import { notFound } from "@/lib/errors"
import { authFrom, clientIp, json, parseParam, readJson, route, slugParam } from "@/lib/http"
import { enforceRateLimit } from "@/lib/rate-limit"
import { deleteSheet, getSheet, getSheetVersion, setSheetClosed, updateSheet } from "@/lib/sheets"
import { etagOf as etagFor } from "@/lib/types"
import { sheetInputSchema, sheetPatchSchema } from "@/lib/validation"

type Ctx = RouteContext<"/api/sheets/[slug]">

export const GET = route(async (req: NextRequest, ctx: Ctx) => {
  const slug = parseParam(slugParam, (await ctx.params).slug)
  const auth = authFrom(req)

  // Polling fast path: one tiny query, no body, when nothing changed.
  const ifNoneMatch = req.headers.get("if-none-match")
  if (ifNoneMatch) {
    const current = await getSheetVersion(slug, auth)
    if (!current) throw notFound()
    const etag = etagFor(current)
    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": "private, no-cache" },
      })
    }
  }

  const sheet = await getSheet(slug, auth)
  if (!sheet) throw notFound()
  return json(sheet, { headers: { ETag: etagFor(sheet), "Cache-Control": "private, no-cache" } })
})

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const slug = parseParam(slugParam, (await ctx.params).slug)
  await enforceRateLimit("write", clientIp(req))
  const data = await readJson(req, sheetInputSchema)
  return json(await updateSheet(slug, authFrom(req), data))
})

export const PATCH = route(async (req: NextRequest, ctx: Ctx) => {
  const slug = parseParam(slugParam, (await ctx.params).slug)
  await enforceRateLimit("write", clientIp(req))
  const { isClosed } = await readJson(req, sheetPatchSchema)
  return json(await setSheetClosed(slug, authFrom(req), isClosed))
})

export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const slug = parseParam(slugParam, (await ctx.params).slug)
  await enforceRateLimit("write", clientIp(req))
  await deleteSheet(slug, authFrom(req))
  return json({ ok: true })
})
