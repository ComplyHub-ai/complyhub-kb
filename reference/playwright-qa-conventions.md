> **Last updated:** 18 Sep 2026 · **Reconsider by:** 18 Dec 2026 · **Confidence:** high — reflects Brian's actual current practice, confirmed directly, not inferred from repo spec files. Read this before writing or running any Playwright spec against production.

# Playwright QA conventions

**Correction (18 Sep 2026):** the previous version of this doc documented `tests/e2e/*.spec.ts`
patterns (`tas-pdf-pagination.spec.ts`, `qi-public-survey-submission.spec.ts`) and, briefly, a set
of `tests/e2e/safe/` specs as the canonical approach. Neither reflects actual current practice —
confirmed disregarded, not just stale. `docs/quality/playwright-harness.md` (a codebase doc) is
**also** not relied on for the same reason. This doc is the authoritative source for Playwright
QA convention going forward, standing on its own.

## The real credential/lane convention: `.env.playwright.local`

Production-safe QA runs against the **Vivacity Testing Tenant** in production, authenticated with
role-specific test accounts. Credentials live in a gitignored file, `.env.playwright.local`, at the
root of each repo checkout:

```
PLAYWRIGHT_LANE=<name of the scenario/journey this run exercises>
PLAYWRIGHT_VIVACITY_TRAINER_EMAIL=...       PLAYWRIGHT_VIVACITY_TRAINER_PASSWORD=...
PLAYWRIGHT_VIVACITY_GOVERNANCE_EMAIL=...    PLAYWRIGHT_VIVACITY_GOVERNANCE_PASSWORD=...
PLAYWRIGHT_VIVACITY_CONSULTANT_EMAIL=...    PLAYWRIGHT_VIVACITY_CONSULTANT_PASSWORD=...
PLAYWRIGHT_VIVACITY_ADMIN_EMAIL=...         PLAYWRIGHT_VIVACITY_ADMIN_PASSWORD=...
```

(Values shown as `...` deliberately — never paste real credentials into this or any KB doc.)

**Setup — this file must exist in every repo checkout, not just one worktree.** Each of
`rto-compass-hub`, `rto-compass-hub-worktree-b`, and `rto-compass-hub-C` is a separate checkout;
an untracked, gitignored file in one does not appear in the others. Copy `.env.playwright.local`
into each worktree that will run production Playwright QA — it will not travel on its own via
`git fetch`/`git pull`. It's gitignored specifically because it holds real plaintext account
passwords; never remove it from `.gitignore`, never commit it, and never paste its contents into a
chat, doc, or commit message.

## Target practice, starting 18 Sep 2026 — tests must become persisted and rerunnable

**Historical practice (until this date):** a Playwright check against the Vivacity Testing Tenant
was written and run once, verified by hand, and whatever data it created was manually cleaned up
case by case — no reusable wipe mechanism, and the spec itself often wasn't kept afterward. This is
why the repo's existing `tests/e2e/` spec files don't reliably reflect current practice: they're
artifacts of that one-off pattern, not a maintained suite.

**This changes starting today.** Every new Playwright QA check written against the Vivacity Testing
Tenant must be:

1. **Persisted** — committed as a real spec file, not written and discarded after one manual run.
2. **Rerunnable** — safe to run again without manual pre-cleanup; it must not depend on the tenant
   being in whatever state the last run happened to leave it in.
3. **Self-cleaning** — the spec itself defines and performs its own cleanup of whatever it creates,
   as part of the test (e.g. a `finally`/teardown block scoped to that spec's own created records),
   not a manual follow-up step someone has to remember. There is no generic, reusable wipe utility
   today — each spec is responsible for its own scoped cleanup because what needs cleaning up
   genuinely differs case by case (a submitted report, a started meeting, a created record). Write
   that cleanup as part of writing the spec, not as a TODO.
4. **Verified clean** — the spec should assert its own cleanup succeeded (the created record no
   longer exists / the state it changed was reverted) rather than assuming the cleanup step ran
   without checking.

A spec that can't yet meet all four should not run against production — narrow it to a read-only
check, or hold it until its cleanup step is actually written.

## General gotchas (still accurate, unrelated to the disregarded spec files)

1. **`locator(...).count()` does not auto-wait.** It snapshots the DOM at that instant. If the page
   loads content asynchronously (an RPC call, a query), counting/looping over elements immediately
   after `page.goto()` returns 0 every time, silently. Always `.waitFor({ state: 'visible' })` on a
   real piece of loaded content first.
2. **A bare `npm run dev` does not pick up `.env` locally.** `vite.config.ts` reads
   `process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL` directly in its `define` block —
   this bypasses Vite's own `.env`-file auto-loading, and only sees vars actually exported into the
   shell. Before running `npm run dev` (or letting Playwright's `webServer` spawn it):
   ```bash
   set -a; source .env; set +a
   ```
3. **Cold Vite start + first-route compile can take 45–60s+.** Give `test.setTimeout(...)` and
   `page.goto(url, { timeout: ... })` real headroom beyond Playwright's defaults, especially on the
   very first test run after switching env vars.

## Supabase Branch DB for Playwright — separate future path, still parked

Investigated previously as a way to run broad, automatic, every-PR Playwright coverage without
touching production at all — genuinely separate from the Vivacity-Testing-Tenant practice above,
not a replacement for it. **Still parked, not wired up:** a fresh branch DB starts schema-only, no
seed data, so most existing specs would hang waiting for accounts that don't exist on a fresh branch
DB. Would also need a real GitHub Actions job — none runs Playwright today. Revisit only as a
distinct initiative, not folded into the production-QA practice above.
