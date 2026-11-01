import { describe, expect, it } from "vitest"
import { AppError } from "@/lib/errors"
import {
  claimSpot,
  cleanupExpired,
  createSheet,
  deleteSheet,
  getSheet,
  getSheetVersion,
  lookupSheets,
  removeClaim,
  setSheetClosed,
  updateClaim,
  updateSheet,
  writeIn,
} from "@/lib/sheets"
import { claimInputSchema, sheetInputSchema, writeInInputSchema } from "@/lib/validation"

const potluck = () =>
  sheetInputSchema.parse({
    title: "  Friendsgiving  ",
    hostName: "Maya",
    eventDate: "2099-11-26",
    startTime: "18:00",
    allowWriteIns: true,
    items: [
      { title: "Pie", slots: 2 },
      { title: "Drinks", slots: 1, note: "Something fizzy" },
    ],
  })

const claim = (name: string, comment?: string) => claimInputSchema.parse({ name, comment })

async function expectAppError(p: Promise<unknown>, status: number, code?: string) {
  const err = await p.then(
    () => null,
    (e) => e,
  )
  expect(err).toBeInstanceOf(AppError)
  expect((err as AppError).status).toBe(status)
  if (code) expect((err as AppError).code).toBe(code)
}

describe("sheets data layer", () => {
  it("creates a sheet and returns it with admin rights only for the token holder", async () => {
    const { adminToken, sheet } = await createSheet(potluck())
    expect(sheet.title).toBe("Friendsgiving")
    expect(sheet.slug).toMatch(/^[a-z0-9]{10}$/)
    expect(sheet.isAdmin).toBe(true)
    expect(sheet.items.map((i) => i.title)).toEqual(["Pie", "Drinks"])

    const asGuest = await getSheet(sheet.slug)
    expect(asGuest?.isAdmin).toBe(false)
    expect(JSON.stringify(asGuest)).not.toContain("Hash")

    const asHost = await getSheet(sheet.slug, { adminToken })
    expect(asHost?.isAdmin).toBe(true)
    expect((await getSheet(sheet.slug, { adminToken: "wrong" }))?.isAdmin).toBe(false)
  })

  it("never lets more people claim an item than it has spots, even concurrently", async () => {
    const { sheet } = await createSheet(potluck())
    const drinks = sheet.items[1]
    const results = await Promise.allSettled(
      ["Ana", "Ben", "Cy", "Dee"].map((n) => claimSpot(sheet.slug, drinks.id, claim(n), {})),
    )
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    const after = await getSheet(sheet.slug)
    expect(after?.items[1].claims).toHaveLength(1)
  })

  it("bumps the version on every change so polling can detect it", async () => {
    const { sheet } = await createSheet(potluck())
    const v0 = (await getSheetVersion(sheet.slug))!.version
    const { sheet: s1 } = await claimSpot(sheet.slug, sheet.items[0].id, claim("Ana"), {})
    expect(s1.version).toBe(v0 + 1)
    expect((await getSheetVersion(sheet.slug))!.version).toBe(v0 + 1)
  })

  it("lets only the claimer (or host) edit and remove a sign-up", async () => {
    const { adminToken, sheet } = await createSheet(potluck())
    const pie = sheet.items[0]
    const { claimId, editToken } = await claimSpot(sheet.slug, pie.id, claim("Ana", "apple"), {})

    await expectAppError(updateClaim(sheet.slug, claimId, { editToken: "nope" }, { comment: "x" }), 403)
    const edited = await updateClaim(sheet.slug, claimId, { editToken }, { comment: "pecan" })
    expect(edited.items[0].claims[0].comment).toBe("pecan")

    await expectAppError(removeClaim(sheet.slug, claimId, {}), 403)
    const removed = await removeClaim(sheet.slug, claimId, { adminToken })
    expect(removed.items[0].claims).toHaveLength(0)
  })

  it("supports write-ins and removes the item when its only claimer backs out", async () => {
    const { sheet } = await createSheet(potluck())
    const input = writeInInputSchema.parse({ name: "Ben", title: "Cranberry sauce" })
    const { claimId, editToken, sheet: after } = await writeIn(sheet.slug, input, {})
    const added = after.items.at(-1)!
    expect(added.title).toBe("Cranberry sauce")
    expect(added.addedBy).toBe("Ben")
    expect(added.claims[0].name).toBe("Ben")

    const cleared = await removeClaim(sheet.slug, claimId, { editToken })
    expect(cleared.items.map((i) => i.title)).toEqual(["Pie", "Drinks"])
  })

  it("blocks write-ins when the host turned them off, and all claims when closed", async () => {
    const { adminToken, sheet } = await createSheet({ ...potluck(), allowWriteIns: false })
    const input = writeInInputSchema.parse({ name: "Ben", title: "Rolls" })
    await expectAppError(writeIn(sheet.slug, input, {}), 403, "write_ins_off")

    await expectAppError(setSheetClosed(sheet.slug, {}, true), 403)
    const closed = await setSheetClosed(sheet.slug, { adminToken }, true)
    expect(closed.isClosed).toBe(true)
    await expectAppError(claimSpot(sheet.slug, sheet.items[0].id, claim("Ana"), {}), 409, "closed")
  })

  it("edits items while protecting existing sign-ups", async () => {
    const { adminToken, sheet } = await createSheet(potluck())
    const [pie, drinks] = sheet.items
    await claimSpot(sheet.slug, pie.id, claim("Ana"), {})
    await claimSpot(sheet.slug, pie.id, claim("Ben"), {})

    const tooFew = sheetInputSchema.parse({
      ...potluck(),
      items: [{ id: pie.id, title: "Pie", slots: 1 }],
    })
    await expectAppError(updateSheet(sheet.slug, { adminToken }, tooFew), 409, "slots_below_claims")

    const next = sheetInputSchema.parse({
      ...potluck(),
      title: "Friendsgiving 2099",
      items: [
        { title: "Rolls", slots: 3 },
        { id: pie.id, title: "Pies (any kind)", slots: 4 },
      ],
    })
    const updated = await updateSheet(sheet.slug, { adminToken }, next)
    expect(updated.title).toBe("Friendsgiving 2099")
    expect(updated.items.map((i) => i.title)).toEqual(["Rolls", "Pies (any kind)"])
    expect(updated.items[1].claims.map((c) => c.name)).toEqual(["Ana", "Ben"])
    expect(updated.items.find((i) => i.id === drinks.id)).toBeUndefined()

    await expectAppError(updateSheet(sheet.slug, {}, next), 403)
  })

  it("summarizes progress for My sheets and deletes sheets for the host only", async () => {
    const { adminToken, sheet } = await createSheet(potluck())
    await claimSpot(sheet.slug, sheet.items[0].id, claim("Ana"), {})
    const [summary] = await lookupSheets([sheet.slug, "zzzzzzzzzz"])
    expect(summary).toMatchObject({ slug: sheet.slug, filled: 1, total: 3 })

    await expectAppError(deleteSheet(sheet.slug, { adminToken: "x" }), 403)
    await deleteSheet(sheet.slug, { adminToken })
    expect(await getSheet(sheet.slug)).toBeNull()
  })

  it("keeps future sheets during cleanup", async () => {
    const { sheet } = await createSheet(potluck())
    await cleanupExpired()
    expect(await getSheet(sheet.slug)).not.toBeNull()
  })
})

describe("validation", () => {
  it("rejects bad input with field-level messages", () => {
    const r = sheetInputSchema.safeParse({ title: "   ", items: [] })
    expect(r.success).toBe(false)
    const paths = r.error!.issues.map((i) => i.path.join("."))
    expect(paths).toContain("title")
    expect(paths).toContain("items")
  })

  it("normalizes optional fields and strips control characters", () => {
    const r = sheetInputSchema.parse({
      title: "BBQ\u0007",
      description: "  line one\nline two  ",
      location: "",
      eventDate: "",
      items: [{ title: "Burgers", slots: "3" }],
    })
    expect(r.title).toBe("BBQ")
    expect(r.description).toBe("line one\nline two")
    expect(r.location).toBeNull()
    expect(r.eventDate).toBeNull()
    expect(r.items[0].slots).toBe(3)
  })

  it("rejects impossible dates, times and the honeypot", () => {
    expect(sheetInputSchema.safeParse({ ...potluck(), eventDate: "2026-02-30" }).success).toBe(false)
    expect(sheetInputSchema.safeParse({ ...potluck(), startTime: "25:00" }).success).toBe(false)
    expect(sheetInputSchema.safeParse({ ...potluck(), website: "spam.biz" }).success).toBe(false)
  })
})
