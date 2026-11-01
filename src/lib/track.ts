"use client"

import type { ClientEvent } from "./analytics-shared"

const OPT_OUT_KEY = "dibs:notrack"

/** Honors Do Not Track, Global Privacy Control and the owner's "don't count me" switch. */
export function trackingDisabled(): boolean {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return true
    return window.localStorage.getItem(OPT_OUT_KEY) === "1"
  } catch {
    return false
  }
}

export function setTrackingOptOut(optOut: boolean) {
  try {
    if (optOut) window.localStorage.setItem(OPT_OUT_KEY, "1")
    else window.localStorage.removeItem(OPT_OUT_KEY)
  } catch {
    /* storage unavailable */
  }
}

function send(payload: Record<string, string>) {
  if (trackingDisabled()) return
  const body = JSON.stringify(payload)
  try {
    if (navigator.sendBeacon?.(`/api/t`, new Blob([body], { type: "application/json" }))) return
  } catch {
    /* fall through */
  }
  fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(
    () => {},
  )
}

let firstView = true
let last = { path: "", at: 0 }

export function trackPageview(path: string) {
  // Ignore duplicate fires for the same path (e.g. React Strict Mode re-running effects).
  const now = Date.now()
  if (last.path === path && now - last.at < 1500) return
  last = { path, at: now }
  // document.referrer only describes the first page of a visit; later client navigations reuse it.
  send({ k: "pv", p: path, r: firstView ? document.referrer : "" })
  firstView = false
}

export function track<E extends ClientEvent>(event: E, dim: string = "") {
  send({ k: "ev", e: event, d: dim })
}
