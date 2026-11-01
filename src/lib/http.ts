import "server-only"
import { unstable_rethrow } from "next/navigation"
import { z } from "zod"
import { AppError } from "./errors"
import type { Auth } from "./sheets"
import { fieldErrors } from "./validation"

const MAX_BODY_BYTES = 64 * 1024

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  })
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return json(
      { error: { code: err.code, message: err.message, fields: err.fields } },
      { status: err.status },
    )
  }
  if (err instanceof z.ZodError) {
    const fields = fieldErrors(err)
    return json(
      { error: { code: "invalid", message: Object.values(fields)[0] ?? "Check the form and try again.", fields } },
      { status: 400 },
    )
  }
  console.error(err)
  return json(
    { error: { code: "server_error", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  )
}

/** Wraps a route handler so every thrown error becomes a consistent JSON response. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args)
    } catch (err) {
      // Let Next.js control flow (prerender bail-outs, notFound, redirect) pass through.
      unstable_rethrow(err)
      return errorResponse(err)
    }
  }
}

export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  const length = Number(req.headers.get("content-length") ?? 0)
  if (length > MAX_BODY_BYTES) throw new AppError(413, "too_large", "That's too much data in one go.")
  const text = await req.text()
  if (text.length > MAX_BODY_BYTES) throw new AppError(413, "too_large", "That's too much data in one go.")
  let body: unknown
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    throw new AppError(400, "bad_json", "The request body isn't valid JSON.")
  }
  return schema.parse(body)
}

export function authFrom(req: Request): Auth {
  return {
    adminToken: req.headers.get("x-admin-token"),
    editToken: req.headers.get("x-edit-token"),
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "local"
}

export const uuidParam = z.uuid({ error: "Not found" })
export const slugParam = z.string().regex(/^[a-z0-9]{6,16}$/, { error: "Not found" })

export function parseParam<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value)
  if (!result.success) throw new AppError(404, "not_found", "This sheet doesn't exist or was deleted.")
  return result.data
}
