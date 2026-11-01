import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  date,
} from "drizzle-orm/pg-core"

export const sheets = pgTable("sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 16 }).notNull().unique(),
  adminTokenHash: varchar("admin_token_hash", { length: 64 }).notNull(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 160 }),
  eventDate: date("event_date", { mode: "string" }),
  startTime: varchar("start_time", { length: 5 }),
  endTime: varchar("end_time", { length: 5 }),
  timezone: varchar("timezone", { length: 64 }),
  hostName: varchar("host_name", { length: 60 }),
  allowWriteIns: boolean("allow_write_ins").notNull().default(false),
  isClosed: boolean("is_closed").notNull().default(false),
  // Bumped on every change; doubles as the ETag for cheap polling.
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 100 }).notNull(),
    note: varchar("note", { length: 200 }),
    slots: integer("slots").notNull().default(1),
    position: integer("position").notNull().default(0),
    // null = added by the host; otherwise the participant's name (write-in)
    addedBy: varchar("added_by", { length: 60 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("items_sheet_idx").on(t.sheetId, t.position)],
)

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sheetId: uuid("sheet_id")
      .notNull()
      .references(() => sheets.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    comment: varchar("comment", { length: 140 }),
    editTokenHash: varchar("edit_token_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("claims_item_idx").on(t.itemId), index("claims_sheet_idx").on(t.sheetId)],
)

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 96 }).primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
})

export type SheetRow = typeof sheets.$inferSelect
export type ItemRow = typeof items.$inferSelect
export type ClaimRow = typeof claims.$inferSelect
