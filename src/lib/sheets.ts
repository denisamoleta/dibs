import "server-only"
import { and, asc, count, eq, inArray, isNotNull, isNull, lt, max, or, sql } from "drizzle-orm"
import { getDb, type Db } from "./db"
import { claims, items, rateLimits, sheets, type SheetRow } from "./db/schema"
import { AppError, forbidden, notFound } from "./errors"
import { hashSecret, newSecret, newSlug, secretMatches } from "./tokens"
import type { SheetDTO, SheetSummaryDTO } from "./types"
import { LIMITS, type ClaimInput, type SheetData, type WriteInInput } from "./validation"

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]
type Queryable = Db | Tx

export type Auth = { adminToken?: string | null; editToken?: string | null }

const isAdminOf = (sheet: Pick<SheetRow, "adminTokenHash">, auth: Auth) =>
  secretMatches(auth.adminToken, sheet.adminTokenHash)

async function loadDto(q: Queryable, sheet: SheetRow, auth: Auth): Promise<SheetDTO> {
  const [itemRows, claimRows] = await Promise.all([
    q
      .select()
      .from(items)
      .where(eq(items.sheetId, sheet.id))
      .orderBy(asc(items.position), asc(items.createdAt)),
    q
      .select({
        id: claims.id,
        itemId: claims.itemId,
        name: claims.name,
        comment: claims.comment,
        createdAt: claims.createdAt,
      })
      .from(claims)
      .where(eq(claims.sheetId, sheet.id))
      .orderBy(asc(claims.createdAt)),
  ])

  const byItem = new Map<string, SheetDTO["items"][number]["claims"]>()
  for (const c of claimRows) {
    const list = byItem.get(c.itemId) ?? []
    list.push({ id: c.id, name: c.name, comment: c.comment, createdAt: c.createdAt.toISOString() })
    byItem.set(c.itemId, list)
  }

  return {
    slug: sheet.slug,
    title: sheet.title,
    description: sheet.description,
    location: sheet.location,
    eventDate: sheet.eventDate,
    startTime: sheet.startTime,
    endTime: sheet.endTime,
    timezone: sheet.timezone,
    hostName: sheet.hostName,
    allowWriteIns: sheet.allowWriteIns,
    isClosed: sheet.isClosed,
    version: sheet.version,
    createdAt: sheet.createdAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
    isAdmin: isAdminOf(sheet, auth),
    items: itemRows.map((i) => ({
      id: i.id,
      title: i.title,
      note: i.note,
      slots: i.slots,
      position: i.position,
      addedBy: i.addedBy,
      claims: byItem.get(i.id) ?? [],
    })),
  }
}

async function bump(tx: Tx, sheetId: string): Promise<SheetRow> {
  const [row] = await tx
    .update(sheets)
    .set({ version: sql`${sheets.version} + 1`, updatedAt: new Date() })
    .where(eq(sheets.id, sheetId))
    .returning()
  return row
}

async function lockSheet(tx: Tx, slug: string): Promise<SheetRow> {
  const [sheet] = await tx.select().from(sheets).where(eq(sheets.slug, slug)).for("update")
  if (!sheet) throw notFound()
  return sheet
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } }
  return e?.code === "23505" || e?.cause?.code === "23505"
}

function sheetValues(data: SheetData) {
  return {
    title: data.title,
    description: data.description,
    location: data.location,
    eventDate: data.eventDate,
    startTime: data.startTime,
    endTime: data.endTime,
    timezone: data.timezone,
    hostName: data.hostName,
    allowWriteIns: data.allowWriteIns,
  }
}

export async function createSheet(data: SheetData) {
  const db = await getDb()
  const adminToken = newSecret()

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const [sheet] = await tx
          .insert(sheets)
          .values({ slug: newSlug(), adminTokenHash: hashSecret(adminToken), ...sheetValues(data) })
          .returning()
        await tx.insert(items).values(
          data.items.map((item, position) => ({
            sheetId: sheet.id,
            title: item.title,
            note: item.note,
            slots: item.slots,
            position,
          })),
        )
        return { adminToken, sheet: await loadDto(tx, sheet, { adminToken }) }
      })
    } catch (err) {
      if (!isUniqueViolation(err) || attempt === 2) throw err
    }
  }
  throw new Error("unreachable")
}

export async function getSheet(slug: string, auth: Auth = {}): Promise<SheetDTO | null> {
  const db = await getDb()
  const [sheet] = await db.select().from(sheets).where(eq(sheets.slug, slug)).limit(1)
  if (!sheet) return null
  return loadDto(db, sheet, auth)
}

/** Cheap check used for polling: returns the version (ETag) without loading items. */
export async function getSheetVersion(slug: string, auth: Auth = {}) {
  const db = await getDb()
  const [row] = await db
    .select({ version: sheets.version, adminTokenHash: sheets.adminTokenHash })
    .from(sheets)
    .where(eq(sheets.slug, slug))
    .limit(1)
  if (!row) return null
  return { version: row.version, isAdmin: isAdminOf(row, auth) }
}

export async function updateSheet(slug: string, auth: Auth, data: SheetData): Promise<SheetDTO> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const sheet = await lockSheet(tx, slug)
    if (!isAdminOf(sheet, auth)) throw forbidden()

    const existing = await tx.select().from(items).where(eq(items.sheetId, sheet.id))
    const existingIds = new Set(existing.map((i) => i.id))
    const claimCounts = new Map(
      (
        await tx
          .select({ itemId: claims.itemId, n: count() })
          .from(claims)
          .where(eq(claims.sheetId, sheet.id))
          .groupBy(claims.itemId)
      ).map((r) => [r.itemId, r.n]),
    )

    const keep = new Set<string>()
    const fieldErrs: Record<string, string> = {}
    data.items.forEach((item, idx) => {
      if (!item.id || !existingIds.has(item.id)) return
      keep.add(item.id)
      const taken = claimCounts.get(item.id) ?? 0
      if (item.slots < taken) {
        fieldErrs[`items.${idx}.slots`] =
          `${taken} ${taken === 1 ? "person has" : "people have"} signed up — remove them first`
      }
    })
    if (Object.keys(fieldErrs).length) {
      throw new AppError(409, "slots_below_claims", "Some items have more sign-ups than spots.", fieldErrs)
    }

    const removed = existing.filter((i) => !keep.has(i.id)).map((i) => i.id)
    if (removed.length) await tx.delete(items).where(inArray(items.id, removed))

    for (const [position, item] of data.items.entries()) {
      if (item.id && keep.has(item.id)) {
        await tx
          .update(items)
          .set({ title: item.title, note: item.note, slots: item.slots, position })
          .where(eq(items.id, item.id))
      } else {
        await tx.insert(items).values({
          sheetId: sheet.id,
          title: item.title,
          note: item.note,
          slots: item.slots,
          position,
        })
      }
    }

    await tx.update(sheets).set(sheetValues(data)).where(eq(sheets.id, sheet.id))
    return loadDto(tx, await bump(tx, sheet.id), auth)
  })
}

export async function setSheetClosed(slug: string, auth: Auth, isClosed: boolean) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const sheet = await lockSheet(tx, slug)
    if (!isAdminOf(sheet, auth)) throw forbidden()
    await tx.update(sheets).set({ isClosed }).where(eq(sheets.id, sheet.id))
    return loadDto(tx, await bump(tx, sheet.id), auth)
  })
}

export async function deleteSheet(slug: string, auth: Auth) {
  const db = await getDb()
  const [sheet] = await db.select().from(sheets).where(eq(sheets.slug, slug)).limit(1)
  if (!sheet) throw notFound()
  if (!isAdminOf(sheet, auth)) throw forbidden()
  await db.delete(sheets).where(eq(sheets.id, sheet.id))
}

export async function claimSpot(slug: string, itemId: string, input: ClaimInput, auth: Auth) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const [sheet] = await tx.select().from(sheets).where(eq(sheets.slug, slug)).limit(1)
    if (!sheet) throw notFound()
    if (sheet.isClosed) throw new AppError(409, "closed", "Sign-ups for this sheet are closed.")

    // Row lock serializes concurrent claims on the same item, so the last spot can't be double-booked.
    const [item] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.sheetId, sheet.id)))
      .for("update")
    if (!item) throw notFound("This item")

    const [{ n }] = await tx.select({ n: count() }).from(claims).where(eq(claims.itemId, item.id))
    if (n >= item.slots) {
      throw new AppError(409, "full", `Someone just took the last spot for "${item.title}".`)
    }

    const editToken = newSecret()
    const [claim] = await tx
      .insert(claims)
      .values({
        sheetId: sheet.id,
        itemId: item.id,
        name: input.name,
        comment: input.comment,
        editTokenHash: hashSecret(editToken),
      })
      .returning({ id: claims.id })

    return { claimId: claim.id, editToken, sheet: await loadDto(tx, await bump(tx, sheet.id), auth) }
  })
}

export async function writeIn(slug: string, input: WriteInInput, auth: Auth) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const sheet = await lockSheet(tx, slug)
    if (sheet.isClosed) throw new AppError(409, "closed", "Sign-ups for this sheet are closed.")
    if (!sheet.allowWriteIns && !isAdminOf(sheet, auth)) {
      throw new AppError(403, "write_ins_off", "The host isn't accepting new items on this sheet.")
    }

    const [{ n, top }] = await tx
      .select({ n: count(), top: max(items.position) })
      .from(items)
      .where(eq(items.sheetId, sheet.id))
    if (n >= LIMITS.maxItems) {
      throw new AppError(409, "too_many_items", "This sheet has reached its item limit.")
    }

    const [item] = await tx
      .insert(items)
      .values({
        sheetId: sheet.id,
        title: input.title,
        slots: 1,
        position: (top ?? -1) + 1,
        addedBy: input.name,
      })
      .returning({ id: items.id })

    const editToken = newSecret()
    const [claim] = await tx
      .insert(claims)
      .values({
        sheetId: sheet.id,
        itemId: item.id,
        name: input.name,
        comment: input.comment,
        editTokenHash: hashSecret(editToken),
      })
      .returning({ id: claims.id })

    return {
      claimId: claim.id,
      itemId: item.id,
      editToken,
      sheet: await loadDto(tx, await bump(tx, sheet.id), auth),
    }
  })
}

async function authorizeClaim(tx: Tx, slug: string, claimId: string, auth: Auth) {
  const sheet = await lockSheet(tx, slug)
  const [claim] = await tx
    .select()
    .from(claims)
    .where(and(eq(claims.id, claimId), eq(claims.sheetId, sheet.id)))
    .limit(1)
  if (!claim) throw notFound("This sign-up")
  if (!isAdminOf(sheet, auth) && !secretMatches(auth.editToken, claim.editTokenHash)) {
    throw forbidden()
  }
  return { sheet, claim }
}

export async function updateClaim(
  slug: string,
  claimId: string,
  auth: Auth,
  patch: { name?: string; comment: string | null },
) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const { sheet, claim } = await authorizeClaim(tx, slug, claimId, auth)
    await tx
      .update(claims)
      .set({ name: patch.name ?? claim.name, comment: patch.comment })
      .where(eq(claims.id, claim.id))
    return loadDto(tx, await bump(tx, sheet.id), auth)
  })
}

export async function removeClaim(slug: string, claimId: string, auth: Auth) {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const { sheet, claim } = await authorizeClaim(tx, slug, claimId, auth)
    await tx.delete(claims).where(eq(claims.id, claim.id))

    // A write-in nobody is bringing anymore just disappears.
    const [item] = await tx.select().from(items).where(eq(items.id, claim.itemId)).limit(1)
    if (item?.addedBy) {
      const [{ n }] = await tx.select({ n: count() }).from(claims).where(eq(claims.itemId, item.id))
      if (n === 0) await tx.delete(items).where(eq(items.id, item.id))
    }
    return loadDto(tx, await bump(tx, sheet.id), auth)
  })
}

export async function lookupSheets(slugs: string[]): Promise<SheetSummaryDTO[]> {
  if (!slugs.length) return []
  const db = await getDb()
  const rows = await db
    .select({
      id: sheets.id,
      slug: sheets.slug,
      title: sheets.title,
      eventDate: sheets.eventDate,
      isClosed: sheets.isClosed,
    })
    .from(sheets)
    .where(inArray(sheets.slug, slugs))
  if (!rows.length) return []

  const ids = rows.map((r) => r.id)
  const [itemRows, claimRows] = await Promise.all([
    db
      .select({ id: items.id, sheetId: items.sheetId, slots: items.slots })
      .from(items)
      .where(inArray(items.sheetId, ids)),
    db
      .select({ itemId: claims.itemId, n: count() })
      .from(claims)
      .where(inArray(claims.sheetId, ids))
      .groupBy(claims.itemId),
  ])
  const claimed = new Map(claimRows.map((r) => [r.itemId, r.n]))
  const totals = new Map<string, { filled: number; total: number }>()
  for (const i of itemRows) {
    const t = totals.get(i.sheetId) ?? { filled: 0, total: 0 }
    t.total += i.slots
    t.filled += Math.min(claimed.get(i.id) ?? 0, i.slots)
    totals.set(i.sheetId, t)
  }

  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    eventDate: r.eventDate,
    isClosed: r.isClosed,
    ...(totals.get(r.id) ?? { filled: 0, total: 0 }),
  }))
}

/** Retention policy: 90 days after the event, or 180 days idle when there's no date. */
export async function cleanupExpired() {
  const db = await getDb()
  const deleted = await db
    .delete(sheets)
    .where(
      or(
        and(isNotNull(sheets.eventDate), lt(sheets.eventDate, sql`(current_date - 90)`)),
        and(isNull(sheets.eventDate), lt(sheets.updatedAt, sql`now() - interval '180 days'`)),
      ),
    )
    .returning({ id: sheets.id })
  const staleLimits = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, sql`now() - interval '1 day'`))
    .returning({ key: rateLimits.key })
  return { deletedSheets: deleted.length, deletedRateLimits: staleLimits.length }
}
