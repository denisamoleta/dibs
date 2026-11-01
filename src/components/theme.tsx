"use client"

import { useCallback, useLayoutEffect, useSyncExternalStore } from "react"

export type ThemePreference = "light" | "dark" | "system"

const STORAGE_KEY = "dibs:theme"

/** Runs in <head> before first paint, so there's never a flash of the wrong theme. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");var d=t==="dark"||((!t||t==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}catch(e){}})()`

const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === "light" || v === "dark" ? v : "system"
  } catch {
    return "system"
  }
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function apply(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle("dark", dark)
  root.style.colorScheme = dark ? "dark" : "light"
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  const onSystem = () => {
    if (readPreference() === "system") apply("system")
    cb()
  }
  mq.addEventListener("change", onSystem)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    mq.removeEventListener("change", onSystem)
    window.removeEventListener("storage", cb)
  }
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const)
  const resolved = useSyncExternalStore<"dark" | "light">(
    subscribe,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => "light",
  )

  // React's dev remount can strip the class set by the inline script; re-apply it.
  useLayoutEffect(() => apply(readPreference()), [])

  const setPreference = useCallback((pref: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      /* storage unavailable: still switch for this page view */
    }
    apply(pref)
    listeners.forEach((l) => l())
  }, [])

  return { preference, resolved, setPreference }
}
