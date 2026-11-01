"use client"

// Everything the device remembers. Storage can be missing or throw (private mode, blocked
// site data), so every access is guarded and the app keeps working without it.

const KEYS = {
  name: "dibs:name",
  sheets: "dibs:sheets",
  claims: "dibs:claims",
  adminPrefix: "dibs:admin:",
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* storage unavailable */
  }
}

export type RememberedSheet = {
  slug: string
  title: string
  role: "host" | "guest"
  lastSeen: number
}

export const localStore = {
  getName: () => read<string>(KEYS.name, ""),
  setName: (name: string) => write(KEYS.name, name),

  getAdminToken: (slug: string) => read<string | null>(KEYS.adminPrefix + slug, null),
  setAdminToken: (slug: string, token: string) => write(KEYS.adminPrefix + slug, token),
  clearAdminToken: (slug: string) => remove(KEYS.adminPrefix + slug),

  /** claimId → edit token, for sign-ups made on this device. */
  getClaimTokens: () => read<Record<string, string>>(KEYS.claims, {}),
  setClaimToken: (claimId: string, token: string) =>
    write(KEYS.claims, { ...read<Record<string, string>>(KEYS.claims, {}), [claimId]: token }),
  removeClaimToken: (claimId: string) => {
    const all = read<Record<string, string>>(KEYS.claims, {})
    delete all[claimId]
    write(KEYS.claims, all)
  },

  getSheets: () =>
    read<RememberedSheet[]>(KEYS.sheets, []).sort((a, b) => b.lastSeen - a.lastSeen),
  rememberSheet: (entry: Omit<RememberedSheet, "lastSeen">) => {
    const all = read<RememberedSheet[]>(KEYS.sheets, [])
    const existing = all.find((s) => s.slug === entry.slug)
    const role = existing?.role === "host" ? "host" : entry.role
    const next = [
      { ...entry, role, lastSeen: Date.now() },
      ...all.filter((s) => s.slug !== entry.slug),
    ].slice(0, 50)
    write(KEYS.sheets, next)
  },
  forgetSheet: (slug: string) => {
    write(
      KEYS.sheets,
      read<RememberedSheet[]>(KEYS.sheets, []).filter((s) => s.slug !== slug),
    )
    remove(KEYS.adminPrefix + slug)
  },
}
