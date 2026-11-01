import type { NextRequest } from "next/server"
import { z } from "zod"
import { trackClientEvent, trackPageview } from "@/lib/analytics"
import { clientIp } from "@/lib/http"

const beaconSchema = z.discriminatedUnion("k", [
  z.object({ k: z.literal("pv"), p: z.string().max(300), r: z.string().max(500).optional() }),
  z.object({ k: z.literal("ev"), e: z.string().max(32), d: z.string().max(32).default("") }),
])

// Usage beacon. Always answers 204 so it never affects the page, even on bad input.
export async function POST(req: NextRequest) {
  try {
    const text = await req.text()
    if (text.length > 2048) return new Response(null, { status: 204 })
    const parsed = beaconSchema.safeParse(JSON.parse(text))
    if (!parsed.success) return new Response(null, { status: 204 })

    const ua = req.headers.get("user-agent") ?? ""
    const body = parsed.data
    if (body.k === "pv") {
      await trackPageview(body.p, body.r ?? "", {
        ip: clientIp(req),
        ua,
        country: req.headers.get("x-vercel-ip-country"),
        host: req.headers.get("host"),
      })
    } else {
      await trackClientEvent(body.e, body.d, ua)
    }
  } catch (err) {
    console.error("analytics beacon failed", err)
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
}
