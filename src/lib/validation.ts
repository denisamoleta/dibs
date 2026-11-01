import { z } from "zod"

export const LIMITS = {
  title: 120,
  description: 1000,
  location: 160,
  hostName: 60,
  itemTitle: 100,
  itemNote: 200,
  maxItems: 100,
  maxSlots: 99,
  name: 60,
  comment: 140,
} as const

// Strip control characters (keeping newlines/tabs where text can be multi-line).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
const CONTROL_CHARS_INCL_NEWLINES = /[\u0000-\u001F\u007F]/g

function clean(multiline: boolean) {
  return (value: string) =>
    value.replace(multiline ? CONTROL_CHARS : CONTROL_CHARS_INCL_NEWLINES, "").trim()
}

const requiredText = (max: number, message: string) =>
  z
    .string({ error: message })
    .transform(clean(false))
    .pipe(z.string().min(1, message).max(max, `Keep it under ${max} characters`))

const optionalText = (max: number, multiline = false) =>
  z
    .string()
    .nullish()
    .transform((v) => (v == null ? "" : clean(multiline)(v)))
    .pipe(z.string().max(max, `Keep it under ${max} characters`))
    .transform((v) => (v === "" ? null : v))

const optionalDate = z
  .string()
  .nullish()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || isValidIsoDate(v), "Pick a valid date")
  .transform((v) => (v === "" ? null : v))

const optionalTime = z
  .string()
  .nullish()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Pick a valid time")
  .transform((v) => (v === "" ? null : v))

const optionalTimezone = z
  .string()
  .max(64)
  .nullish()
  .transform((v) => (v && isValidTimeZone(v) ? v : null))

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split("-").map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    y >= 2000 &&
    y <= 2100 &&
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  )
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export const itemInputSchema = z.object({
  id: z.uuid().optional(),
  title: requiredText(LIMITS.itemTitle, "Name this item"),
  note: optionalText(LIMITS.itemNote),
  slots: z.coerce
    .number({ error: "Spots must be a number" })
    .int("Spots must be a whole number")
    .min(1, "At least 1 spot")
    .max(LIMITS.maxSlots, `At most ${LIMITS.maxSlots} spots`),
})

export const sheetInputSchema = z
  .object({
    title: requiredText(LIMITS.title, "Give your sheet a title"),
    description: optionalText(LIMITS.description, true),
    location: optionalText(LIMITS.location),
    eventDate: optionalDate,
    startTime: optionalTime,
    endTime: optionalTime,
    timezone: optionalTimezone,
    hostName: optionalText(LIMITS.hostName),
    allowWriteIns: z.boolean().default(false),
    items: z
      .array(itemInputSchema)
      .min(1, "Add at least one item")
      .max(LIMITS.maxItems, `At most ${LIMITS.maxItems} items`),
    // Which template the host started from (for anonymous usage stats only).
    template: z.string().max(24).optional(),
    // Honeypot: real people never see or fill this field.
    website: z.string().max(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endTime && !value.startTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "Add a start time too" })
    }
    if (value.startTime && !value.eventDate) {
      ctx.addIssue({ code: "custom", path: ["eventDate"], message: "Add a date for this time" })
    }
  })

export const claimInputSchema = z.object({
  name: requiredText(LIMITS.name, "Add your name"),
  comment: optionalText(LIMITS.comment),
})

export const claimUpdateSchema = z.object({
  name: requiredText(LIMITS.name, "Add your name").optional(),
  comment: optionalText(LIMITS.comment),
})

export const writeInInputSchema = z.object({
  name: requiredText(LIMITS.name, "Add your name"),
  title: requiredText(LIMITS.itemTitle, "What are you bringing?"),
  comment: optionalText(LIMITS.comment),
})

export const sheetPatchSchema = z.object({
  isClosed: z.boolean(),
})

export const lookupSchema = z.object({
  slugs: z.array(z.string().regex(/^[a-z0-9]{6,16}$/)).max(50),
})

export type SheetInput = z.input<typeof sheetInputSchema>
export type SheetData = z.output<typeof sheetInputSchema>
export type ItemInput = z.input<typeof itemInputSchema>
export type ClaimInput = z.output<typeof claimInputSchema>
export type WriteInInput = z.output<typeof writeInInputSchema>

/** Flattens zod issues into { "items.2.title": "Name this item" }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_"
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
