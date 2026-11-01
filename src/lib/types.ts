// Shapes shared by the API and the UI. Never include token hashes here.

export type ClaimDTO = {
  id: string
  name: string
  comment: string | null
  createdAt: string
}

export type ItemDTO = {
  id: string
  title: string
  note: string | null
  slots: number
  position: number
  addedBy: string | null
  claims: ClaimDTO[]
}

export type SheetDTO = {
  slug: string
  title: string
  description: string | null
  location: string | null
  eventDate: string | null
  startTime: string | null
  endTime: string | null
  timezone: string | null
  hostName: string | null
  allowWriteIns: boolean
  isClosed: boolean
  version: number
  createdAt: string
  updatedAt: string
  items: ItemDTO[]
  isAdmin: boolean
}

export type SheetSummaryDTO = {
  slug: string
  title: string
  eventDate: string | null
  isClosed: boolean
  filled: number
  total: number
}

export type ApiErrorBody = {
  error: { code: string; message: string; fields?: Record<string, string> }
}

/** Same value the API sends as ETag, so the client can derive it from any response body. */
export function etagOf(v: { version: number; isAdmin: boolean }) {
  return `W/"v${v.version}${v.isAdmin ? "a" : ""}"`
}

export function sheetProgress(sheet: Pick<SheetDTO, "items">) {
  let filled = 0
  let total = 0
  for (const item of sheet.items) {
    total += item.slots
    filled += Math.min(item.claims.length, item.slots)
  }
  return { filled, total, open: total - filled }
}
