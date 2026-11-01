import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto"

// No look-alike characters (0/o, 1/l/i) so slugs survive being read aloud or retyped.
const SLUG_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"

export function newSlug(length = 10): string {
  let out = ""
  for (let i = 0; i < length; i++) out += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)]
  return out
}

/** 192 bits of randomness, URL-safe. */
export function newSecret(): string {
  return randomBytes(24).toString("base64url")
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex")
}

export function secretMatches(secret: string | null | undefined, hash: string): boolean {
  if (!secret || secret.length > 128) return false
  const a = Buffer.from(hashSecret(secret), "hex")
  const b = Buffer.from(hash, "hex")
  return a.length === b.length && timingSafeEqual(a, b)
}
