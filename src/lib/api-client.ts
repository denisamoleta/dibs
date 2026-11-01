"use client"

import type { ApiErrorBody, SheetDTO, SheetSummaryDTO } from "./types"
import type { SheetInput } from "./validation"

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}

type Headers = { adminToken?: string | null; editToken?: string | null }

async function request<T>(
  method: string,
  path: string,
  { body, auth, etag }: { body?: unknown; auth?: Headers; etag?: string | null } = {},
): Promise<{ data: T | null; etag: string | null; status: number }> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth?.adminToken) headers["X-Admin-Token"] = auth.adminToken
  if (auth?.editToken) headers["X-Edit-Token"] = auth.editToken
  if (etag) headers["If-None-Match"] = etag

  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    })
  } catch {
    throw new ApiError(0, "network", "You seem to be offline. Check your connection and try again.")
  }

  if (res.status === 304) return { data: null, etag: etag ?? null, status: 304 }

  const payload = (await res.json().catch(() => null)) as (T & ApiErrorBody) | null
  if (!res.ok) {
    const e = payload?.error
    throw new ApiError(
      res.status,
      e?.code ?? "unknown",
      e?.message ?? "Something went wrong. Please try again.",
      e?.fields,
    )
  }
  return { data: payload as T, etag: res.headers.get("etag"), status: res.status }
}

const base = (slug: string) => `/api/sheets/${encodeURIComponent(slug)}`

export const api = {
  async createSheet(input: SheetInput) {
    const { data } = await request<{ adminToken: string; sheet: SheetDTO }>("POST", "/api/sheets", {
      body: input,
    })
    return data!
  },

  getSheet(slug: string, adminToken: string | null, etag: string | null) {
    return request<SheetDTO>("GET", base(slug), { auth: { adminToken }, etag })
  },

  async updateSheet(slug: string, adminToken: string, input: SheetInput) {
    return (await request<SheetDTO>("PUT", base(slug), { body: input, auth: { adminToken } })).data!
  },

  async setClosed(slug: string, adminToken: string, isClosed: boolean) {
    return (await request<SheetDTO>("PATCH", base(slug), { body: { isClosed }, auth: { adminToken } }))
      .data!
  },

  async deleteSheet(slug: string, adminToken: string) {
    await request("DELETE", base(slug), { auth: { adminToken } })
  },

  async claim(slug: string, itemId: string, input: { name: string; comment?: string }, adminToken: string | null) {
    const { data } = await request<{ claimId: string; editToken: string; sheet: SheetDTO }>(
      "POST",
      `${base(slug)}/items/${itemId}/claims`,
      { body: input, auth: { adminToken } },
    )
    return data!
  },

  async writeIn(
    slug: string,
    input: { name: string; title: string; comment?: string },
    adminToken: string | null,
  ) {
    const { data } = await request<{ claimId: string; editToken: string; sheet: SheetDTO }>(
      "POST",
      `${base(slug)}/write-ins`,
      { body: input, auth: { adminToken } },
    )
    return data!
  },

  async updateClaim(slug: string, claimId: string, patch: { name?: string; comment?: string }, auth: Headers) {
    return (await request<SheetDTO>("PATCH", `${base(slug)}/claims/${claimId}`, { body: patch, auth })).data!
  },

  async removeClaim(slug: string, claimId: string, auth: Headers) {
    return (await request<SheetDTO>("DELETE", `${base(slug)}/claims/${claimId}`, { auth })).data!
  },

  async lookup(slugs: string[]) {
    const { data } = await request<{ sheets: SheetSummaryDTO[] }>("POST", "/api/sheets/lookup", {
      body: { slugs },
    })
    return data!.sheets
  },
}
