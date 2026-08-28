# Playwright QA conventions

> Last updated: 28 August 2026 · Proven end-to-end via `tests/e2e/qi-public-survey-submission.spec.ts`
> (PR #811 follow-up, `rto-compass-hub` PR #813). Read this before writing a new Playwright spec.

## Two gated, production-safe patterns

Both patterns run against **real production data**, gated behind env vars so they never run
unattended or in CI — skipped by default unless a human deliberately sets the vars to opt in.

### 1. Authenticated feature check

Pattern: `tests/e2e/tas-pdf-pagination.spec.ts`.

- `test.skip(!email || !password || !buildId, ...)` at the top of the `describe` block.
- Signs in directly via `@supabase/supabase-js` (`auth.signInWithPassword`), then injects the
  session into `localStorage` before navigating — not a UI login flow.
- Use this for any feature behind a login.

### 2. Public (no-login) feature check

Pattern: `tests/e2e/qi-public-survey-submission.spec.ts`.

- Same `test.skip` gating shape, but on whatever identifiers the public route needs (e.g. survey
  slugs) — no email/password, no session injection.
- Navigates straight to the public route.
- If the form renders its fields dynamically (question bank varies per tenant/type) and has no
  `data-testid` attributes, answer generically by rendered control type (radiogroup, textarea,
  combobox, star rating) rather than hardcoding field identifiers.

Pick whichever of the two matches the feature being tested — most of the app needs pattern 1.

## Gotchas that will bite any new spec written this way

1. **`locator(...).count()` does not auto-wait.** It snapshots the DOM at that instant. If the
   page loads content asynchronously (an RPC call, a query), counting/looping over elements
   immediately after `page.goto()` returns 0 every time, silently. Always `.waitFor({ state:
   'visible' })` on a real piece of loaded content first.
2. **A bare `npm run dev` does not pick up `.env` locally.** `vite.config.ts` reads
   `process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL` directly in its `define` block —
   this bypasses Vite's own `.env`-file auto-loading, and only sees vars actually exported into the
   shell. Before running `npm run dev` (or letting Playwright's `webServer` spawn it), run:
   ```bash
   set -a; source .env; set +a
   ```
   Confirmed live 27 Aug 2026 — a bare `npm run dev` threw `"supabaseUrl is required"` in the
   browser until this was done, even with a fully populated `.env`.
3. **Cold Vite start + first-route compile can take 45–60s+.** Give `test.setTimeout(...)` and
   `page.goto(url, { timeout: ... })` real headroom beyond Playwright's defaults, especially on the
   very first test run after switching env vars (forces a dependency re-optimization).

## Supabase Branch DB for Playwright — investigated, parked (not wired up)

Investigated 27–28 Aug 2026 while looking for a way to run broad, automatic, every-PR Playwright
coverage without touching production.

**What works:** `supabase branches get <branch> --project-ref <ref> -o env` (Supabase CLI) returns
real, usable branch DB credentials — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
etc. — matching the exact env var names `vite.config.ts` already reads. This is a viable mechanism
for a future CI job, if one gets built.

**Why it's parked:** a fresh branch DB starts with schema only, no seed data (`with_data: false`).
Existing specs like `tenants.spec.ts` require a pre-seeded super-admin account
(`admin@complyhub.io`) that doesn't exist on a fresh branch DB — so most current specs simply hang
waiting for a login that can never succeed. No `.github/workflows/*.yml` job runs Playwright today
either way; this would be new CI surface area needing Carl's review (`.github/workflows/` is his
owned territory per `rto-compass-hub/CLAUDE.md`'s roles table).

**If this gets picked up again:** the missing piece is a seeding story for branch DBs (either a
`seed.sql` addition covering the accounts existing specs expect, or new specs written to create
their own fixtures on the fly), plus an actual GitHub Actions job to wire it together.

## See also

- `rto-compass-hub/supabase/migrations/CLAUDE.md` § "Branch DB testing" — Supabase Branching
  background, and the separate migration-drift issue that makes most branch DBs fail to build at
  all (`MIGRATIONS_FAILED`) regardless of the seeding gap above.
