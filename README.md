# Dibs

**Who's bringing what? Sorted in one link.**

Dibs is a free, ad-free sign-up sheet for potlucks, volunteer shifts, meal trains, team snacks and class parties. The host makes a sheet in about 30 seconds and drops the link in the group chat. Everyone taps a spot to call dibs. Nobody needs an account or an app.

- Live updates (adaptive polling with ETags)
- Chat-ready summaries ("full list" and "still needed" nudges), WhatsApp/email share, native share sheet
- Link previews that show live progress (dynamic Open Graph images)
- Add to Google Calendar / Apple / Outlook (.ics)
- Host tools: edit, close/reopen, remove sign-ups, CSV export, delete
- Write-ins ("I'll bring lemonade"), templates, dark mode, mobile-first, accessible

Product plan and rationale: [`docs/PRODUCT.md`](docs/PRODUCT.md).

## Tech stack

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Drizzle ORM · Postgres (Neon or Supabase) · Zod · Vitest · Vercel.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. No database setup is needed: without `DATABASE_URL`, dev uses an embedded Postgres (PGlite) stored in `./.data/` and migrates itself on boot. To start fresh, stop the dev server and delete `./.data/`.

Tip: open the app at http://127.0.0.1:3000 in another tab to act as a second person. It has separate storage, so it looks like a different device.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with the embedded database |
| `npm test` | Unit + data-layer tests (real Postgres via PGlite, in memory) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm run build` | Applies DB migrations (if `DATABASE_URL` is set), then builds |
| `npm run db:generate` | Create a new SQL migration after editing `src/lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `DATABASE_URL` manually |

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes, in production** | Postgres connection string (pooled is fine). Set automatically by the Neon integration on Vercel. `POSTGRES_URL` also works. |
| `DATABASE_URL_UNPOOLED` | Optional | Direct connection used only for migrations at build time (Neon sets it; Supabase's `POSTGRES_URL_NON_POOLING` is also detected). |
| `CRON_SECRET` | Recommended | Random string. Vercel Cron sends it to `/api/cron/cleanup`, which deletes expired sheets daily. |
| `RATE_LIMIT_SALT` | Recommended | Random string used to hash IPs for rate limiting. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Canonical origin (e.g. `https://dibs.example.com`). On Vercel it falls back to the production domain. |

Generate random values with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Never commit real values. `.env*` files are git-ignored, and `.env.example` documents the variables.

## Deploying (Vercel + Neon)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, then import the repo. The framework is detected automatically.
3. Before (or right after) the first deploy, open the project's **Storage** tab and choose **Create Database → Neon** (free tier). Connect it to all environments. This injects `DATABASE_URL`.
4. **Settings → Environment Variables**: add `CRON_SECRET` and `RATE_LIMIT_SALT`.
5. **Deploy**, or redeploy if the first build ran before the database existed. The build runs migrations automatically.

Supabase works too. Use its Postgres connection string as `DATABASE_URL` (the transaction pooler on port 6543 is supported). Note that free Supabase projects pause after a week of inactivity. Neon scales to zero and wakes automatically, which suits a free-tier app better.

## Managing the app

- **Updates:** push to `main` and Vercel builds and deploys automatically. Pull requests get preview URLs.
- **Schema changes:** edit `src/lib/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`. Production applies it on the next deploy.
- **Logs:** Vercel → Project → Logs. **Database:** Vercel → Storage → Neon console.
- **Cleanup:** the daily cron (`vercel.json`) deletes sheets 90 days after their event date, or after 180 idle days if they have no date. It also clears old rate-limit rows.
- **Abuse:** sheet creation is limited to 15/hour per IP and writes to 120/10 min per IP (`src/lib/rate-limit.ts`). To remove a sheet manually, delete its row in `sheets` (sign-ups cascade).

## How security works

- No user accounts. Hosts get a 192-bit **manage key**, and each sign-up gets an **edit key**. Only SHA-256 hashes are stored and compared in constant time.
- The manage key travels in the URL **fragment** (`#manage=…`), which browsers never send to servers. The app moves it into local storage and scrubs it from the address bar.
- Every input is validated with Zod (shared by client and server), length-capped and stripped of control characters. Request bodies are capped at 64 KB, and a honeypot catches simple bots.
- The last spot can't be double-booked: claims lock the item row inside a transaction.
- Sheets are `noindex` and disallowed in `robots.txt`. Security headers are set in `next.config.ts`. CSV export neutralizes spreadsheet formulas.

## Project layout

```
src/app/            routes: landing, /new, /s/[slug] (+ /edit, OG image), /my, legal, API
src/components/     UI (sheet/, editor/, landing/, ui/ = shadcn primitives)
src/lib/            data layer (sheets.ts), db/, validation, tokens, rate limiting, summaries, calendar
drizzle/            SQL migrations
tests/              Vitest suites
```
