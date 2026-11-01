"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { track, trackPageview } from "@/lib/track"

/** Counts anonymous page views and app installs. Renders nothing. */
export function UsageBeacon() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname && !pathname.startsWith("/admin")) trackPageview(pathname)
  }, [pathname])

  useEffect(() => {
    const onInstall = () => track("install")
    window.addEventListener("appinstalled", onInstall)
    return () => window.removeEventListener("appinstalled", onInstall)
  }, [])

  return null
}
