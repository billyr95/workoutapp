# Billy's Training Log

Next.js + TypeScript + Tailwind v4 + Drizzle ORM (SQLite) training tracker.

## Setup

```bash
npm install
npm run dev
```

App runs at http://localhost:3000. The SQLite database (`db/training.db`) is already
seeded with your starting data (Upper A exercises, macros, first weigh-in, PR, etc).

If you ever need to reset/reseed the database:

```bash
rm db/training.db*
npx drizzle-kit push
npx tsx db/seed.ts
```

## Structure

- `app/` — pages: Today (`/`), Schedule, Progress, Profile, plus `app/api/*` routes
- `db/schema.ts` — Drizzle table definitions
- `db/seed.ts` — initial data seed
- `lib/data.ts` — server-side data access helpers used by API routes
- `lib/useAppData.ts` — client hook that fetches `/api/bootstrap` and exposes `refetch()`
- `components/NavBar.tsx` — tab navigation

## Apple Watch / Shortcuts integration

`POST /api/cardio` accepts `{ type, durationMinutes, distance?, averageHeartRate?, calories? }`
and is the endpoint an Apple Shortcuts automation should call after a Watch workout ends.

Set a `CARDIO_API_KEY` environment variable before deploying, and have the Shortcut send it
as an `x-api-key` header — otherwise the route is left open (fine for local dev only).

## Deploying

Currently uses SQLite via `better-sqlite3`, which is file-based and fine for local use but
won't persist on serverless platforms like Vercel (read-only filesystem in production).
To deploy:

1. Swap the Drizzle datasource from `better-sqlite3` to a hosted Postgres driver
   (Vercel Postgres or Supabase both work well with Drizzle).
2. Update `db/index.ts` to use the Postgres connection string instead of the local file.
3. Re-run `drizzle-kit push` against the new database, then re-seed.

Everything else (schema shape, API routes, pages) stays the same.
