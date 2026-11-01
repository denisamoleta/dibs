import "server-only"
import { cache } from "react"
import { connection } from "next/server"
import { getSheet } from "@/lib/sheets"

export const isSlug = (slug: string) => /^[a-z0-9]{6,16}$/.test(slug)

/** Deduped per request, so metadata, the OG image and the page share one query. */
export const loadSheet = cache(async (slug: string) => {
  // Sheets are live data: always read at request time, never baked into a prerender.
  await connection()
  return isSlug(slug) ? getSheet(slug) : null
})
