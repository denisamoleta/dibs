export const site = {
  name: "Dibs",
  tagline: "Who's bringing what? Sorted in one link.",
  description:
    "Free sign-up sheets for potlucks, volunteer shifts, meal trains and team snacks. Share one link in the group chat — people tap to call dibs. No ads, no apps, no accounts.",
}

/** Absolute origin for metadata and share links generated on the server. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, "")
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return "http://localhost:3000"
}
