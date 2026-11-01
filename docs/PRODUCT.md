# Dibs — MVP plan

**One-liner:** Free, ad-free sign-up sheets for "who's bringing what". Make a sheet in 30 seconds, drop the link in the group chat, everyone taps to call dibs. No accounts, no app, no ads.

## Why this, why now

- The category leader (SignUpGenius) is a 2000s-era product. Free-tier users and their participants see pop-ups and video ads, and reviewers complain about upsells.
- Alternatives are fragmented and niche (schools only, meal trains only) or cap free sheets (e.g. 3 sheets then $9/mo).
- Group chats are where coordination actually happens, yet nobody designs for them: link previews, copy-paste summaries, "what's still needed" nudges.
- Each sheet reaches 10–50 people, and every participant sees "Made with Dibs", so growth comes built in.

## Target users

Parents and PTAs, teachers, team managers, church and community groups, office party organizers, friend groups (Friendsgiving, BBQs), and people organizing meal trains for a friend.

## Core features (v1)

| Organizer | Participant |
| --- | --- |
| Create a sheet from a template or blank (title, date/time, location, notes) | Open the link, no sign-up |
| Items with N spots each ("Dessert × 3") | Tap a spot, type a name (remembered), optional note ("vegan lasagna") |
| Private manage link (no account); sheets remembered on this device | Edit or remove their own sign-up (device-held secret token) |
| Edit items/details, close/reopen sign-ups, remove anyone's sign-up, delete sheet | "Bringing something else?" write-ins, if the host allows |
| Copy a chat-ready summary or "still needed" nudge; CSV export | Add to calendar (.ics / Google Calendar) |
| Live updates (adaptive polling) | Live updates |

Link previews per sheet (dynamic Open Graph image showing progress), dark mode, mobile-first.

## Not in v1 (future)

Email/SMS reminders · recurring sheets · co-hosts · hidden participant names (school privacy mode) · custom fields (phone/email) · payments/ticketing · org workspaces & branding (→ Pro) · localization.

## Monetization later

Participants stay free with no ads, always. **Dibs Pro** for organizations ($5–8/mo): reminders, recurring sheets, co-hosts, branding, contact fields, exports, ticketed events (Stripe Connect fee).

## User journeys

1. **Host:** Landing → "Create a sheet" → pick template → edit → Create → share panel (copy / WhatsApp / native share) + save private manage link → watch sign-ups arrive live → paste "still needed" nudge into chat.
2. **Guest:** Taps link in chat → sees what's covered → taps an open spot → name (+ note) → "Call dibs" → done. Can come back to change their mind.

## Pages

`/` landing · `/new` create (`?template=`) · `/s/[slug]` sheet (guest view; host view when the device holds the manage key, delivered via `#manage=` fragment) · `/my` sheets on this device · `/privacy` · `/terms` · not-found / error.

## Data model (Postgres)

- `sheets`: id, slug (unique, 10 chars), admin_token_hash, title, description, location, event_date, start_time, end_time, timezone, host_name, allow_write_ins, is_closed, created_at, updated_at
- `items`: id, sheet_id → sheets (cascade), title, note, slots, position, added_by (null = host), created_at
- `claims`: id, sheet_id → sheets (cascade), item_id → items (cascade), name, comment, edit_token_hash, created_at
- `rate_limits`: key (hashed IP + bucket), count, window_start

## Auth model

No user accounts in v1, a deliberate choice. Capability links:
- **Manage key**: 192-bit random token, shown once, stored on the host's device; only its SHA-256 hash is stored server-side. Sent in the URL *fragment* (never reaches server logs or Referer) and to the API in a header.
- **Edit token** per sign-up: same scheme, held by the participant's device.

## API

`POST /api/sheets` · `GET|PUT|PATCH|DELETE /api/sheets/:slug` · `POST /api/sheets/:slug/items/:itemId/claims` · `PATCH|DELETE /api/sheets/:slug/claims/:claimId` · `POST /api/sheets/:slug/write-ins` · `POST /api/sheets/lookup` · `GET /api/cron/cleanup` (Vercel Cron, bearer `CRON_SECRET`).

## Privacy & security

- No accounts, no ads, no third-party trackers. Only names/notes people type are stored.
- Sheet pages are `noindex`. Slugs are unguessable.
- Tokens hashed at rest; constant-time comparison.
- Zod validation + length limits on every input; body-size cap; honeypot on create.
- DB-backed rate limiting per hashed IP.
- Atomic claim (row lock) so two people can't take the last spot.
- Security headers (frame-ancestors none, nosniff, referrer policy, permissions policy).
- Auto-deletion: 90 days after the event date (or 180 days of inactivity if no date).
