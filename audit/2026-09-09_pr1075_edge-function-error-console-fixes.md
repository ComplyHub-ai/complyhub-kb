# Audit — PR #1075

> **Date:** 9 September 2026; **Merged:** 9 Sep 2026 05:16:56 UTC
> **Scope:** Live-verify the Edge Function Error Console (shipped in PR #1027/#1029, part of the
> observability-restructure body of work) end-to-end for the first time since it shipped; fix the
> two real bugs found; add a reusable regression test.
> **Project:** `gdwhlstfguxarnxasrrs` (ComplyHub RTO production) · **Living doc:**
> `observability-restructure.md` (PR 5 entry — the doc is not yet deleted, still tracking the
> open Supabase support tickets below)

---

## Summary

The Edge Function Error Console was declared "shipped" across PRs #1027/#1029, but nobody had
ever actually invoked it end-to-end since its last fix — every prior verification was either a
raw SQL check or a doc claim. Asked to verify the whole observability-restructure body of work
was *actually* complete (not just merged), a live test was built: log in as a real super admin,
trigger a genuine edge-function error, load the page, and confirm it shows up.

It didn't. Two real bugs were found and fixed in `sa-query-function-logs/analytics.ts`:
`count(*)` (rejected outright by Supabase's ClickHouse-backed log-query engine — confirmed via
Supabase's own docs) and a silent-failure bug where an HTTP 200 response carrying an `{"error":
...}` body was being treated as "0 results" instead of surfaced as a failure — the worst possible
defect for a tool whose entire job is telling you when something's wrong.

Even with both fixes, the console still returns no data in production. Root-caused (not just
suspected) to a Supabase-side problem: every call to the Logs Analytics Management API endpoint
via the project's Personal Access Token returns a generic backend error, while the identical SQL
succeeds via a different, non-PAT query path, and the same PAT succeeds on a *different*
Management API endpoint. Two Supabase support tickets were filed as a result — one for this, one
re-raising a separately-discovered dead `pg_cron` job that no permission level available to the
team (including Dashboard Owner) can remove.

**Headline numbers:** 4 files changed, +186/-13 lines, 1 commit, 0 migrations, 1 edge function
touched (redeployed manually 6 times during live diagnosis before the final clean version was
committed).

**Branch:** `feat/observability-e2e-verification` (merged, local copy deleted, remote state
unknown/not checked) · **Merge commit:** `b72f06716558dc297d3e1f2091cf604bb4990443` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/1075

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Edge Function Error Console | Shows "Total errors: 0" / "No errors or warnings in this window" for a genuine error line seconds old | `buildCountSql()` in `analytics.ts` used `count(*)`, which Supabase's logs query surface explicitly rejects |
| Edge Function Error Console | Same symptom, persists after the above fix | `queryAnalytics()` only checked `res.ok` (HTTP status) before parsing `json.result` — a 200 response containing `{"error": "..."}` instead of a `result` array was silently treated as zero rows |
| Edge Function Error Console (external, not fixed here) | Console still returns no data even with both bugs fixed | Supabase's `/analytics/endpoints/logs.all` Management API endpoint returns `{"error":"Backend error! Retry your query..."}` (HTTP 200) for every query via `CH_MANAGEMENT_PAT`, confirmed down to a minimal 2-column no-filter query; isolated to this one endpoint/auth path (the same PAT works on `/functions`, and the identical SQL works via a different, non-PAT query path) — filed as Supabase Support Ticket 1 |
| `pg_cron` job 23 (`ops-run-diagnostics-15m`) | Re-confirmed still failing every 15 minutes, permanently | Owned by Supabase-internal role `supabase_read_only_user`; re-confirmed (again) that no permission level available to the team, including Dashboard Owner, can unschedule/delete it — filed as Supabase Support Ticket 2, bundled with Ticket 1 rather than opened separately since a ticket was being filed anyway |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `527f7744d` | `count(*)` → `count()`; added error-field check in `queryAnalytics()`; added the Playwright spec + `production-superadmin-read-only` lane; added the test-only trigger branch in `index.ts` |

Squash-style single commit — the branch's earlier iterative debugging (a temporary raw-response
debug branch, several intermediate edge-function deploys) never touched git; it was tested via
direct `deploy_edge_function` calls against production and cleaned up before the one commit was
made.

---

## Fixes shipped

### Edge functions — `sa-query-function-logs`

- **`analytics.ts`** — `buildCountSql()`: `count(*)` → `count()` (Supabase's log-query engine
  rejects the former, confirmed via their own docs: *"the logs query surface rejects `select *`
  and `count(*)`"*). `queryAnalytics()`: now throws when the parsed JSON response contains an
  `error` field, even on HTTP 200, instead of falling through to `json?.result ?? []` and silently
  returning an empty array.
- **`index.ts`** — added a permanent, harmless test-only branch: if a request carries header
  `x-e2e-test-trigger: true`, it emits one `log.error()` line with a random marker and returns
  immediately (no Management API call, no tenant data touched). Reachable only by an
  already-authenticated super admin — inherits the function's existing auth gate, no new attack
  surface. Exists so the new Playwright spec (and any future manual check) can generate a known,
  real error to look for without waiting for organic production traffic to fail.

### Testing infrastructure

- **`tests/e2e/safe/observability-edge-function-console.production-superadmin.spec.ts`** (new) —
  follows the repo's existing safe/gated production-test pattern
  (`complyhub-kb/reference/playwright-qa-conventions.md`): skipped unless
  `PLAYWRIGHT_SUPERADMIN_EMAIL`/`PASSWORD` are set, blocks every write request except a tight
  allowlist, logs in as a real super admin via the UI, calls the test-trigger, opens the console,
  filters to the triggering function + Error severity, polls (up to 2 minutes, accounting for
  Supabase's log-ingestion lag) for the marker to appear.
- **`playwright.config.ts`** — added a `production-superadmin-read-only` lane (mirrors the
  existing `production-vivacity-read-only` lane's safety model: locked to `https://rto.complyhub.ai`
  only, requires the new env var pair, no `webServer` spun up). Needed because none of the
  Vivacity Testing Tenant's members have platform-wide `super_admin`/`platform_owner` access
  (confirmed via a live DB query before writing this), so the existing lane's account could never
  reach a SuperAdmin-gated page.

### Database

None. No migrations in this PR.

### Frontend

None touched.

---

## Review rounds

1. **Live production verification (this session)** — not a fresh-eyes subagent pass; a
   first-hand, end-to-end test built specifically because the doc's "SHIPPED" status for 4 merged
   PRs had never been checked against actual runtime behavior. Found both bugs above by direct
   testing (Playwright + raw `fetch` calls bypassing the browser), not by reading code.
2. **`ci-gate` (this session)** — ran clean across all applicable steps (lint, service-role-key
   exposure via the real CI mechanism rather than the skill's own stale grep reference, config.toml
   coverage, `deno check`, dropped-file guard). `npm run type-check` was skipped per this repo's
   standing rule that it's vacuous; no `src/` files were touched in this diff regardless, so the
   `.single()`/role-casing/status-enum checks were all N/A.
3. **Diagnostic isolation of the remaining blocker** — systematic elimination, not a guess:
   confirmed the identical SQL succeeds via `query_logs` (non-PAT path); confirmed the same PAT
   succeeds on `/functions` (different Management API endpoint); confirmed the failure persists
   even for a minimal 2-column, no-filter, no-order-by query, ruling out query complexity as the
   cause. Concluded the fault is specific to `/analytics/endpoints/logs.all` access via this PAT,
   external to this codebase.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_AePkM8L8cHayXZ7SJ1H7fRc7ebi7` for merge commit
   `b72f06716`, `target: production`, `state: READY`. Confirmed via `list_deployments`.
2. **Edge functions** — `sa-query-function-logs` was deployed directly to production multiple
   times during live diagnosis (versions 4 through 9, each iteration narrowing the root cause),
   ahead of the PR being opened, with explicit approval each time given it was pre-review code
   reaching production. The final clean version (9) matches what's now in git. The
   `deploy-edge-functions.yml` workflow also fired automatically on the merge push (run
   `34314256077`) and completed with `conclusion: success` — a no-op in practice since production
   already had this exact code, but confirms the automated path also works correctly for this
   commit.
3. **Migrations** — none; nothing to apply.
4. **Worktrees** — worktree A (`rto-compass-hub`) fast-forwarded from `354be62e5` to `b72f06716`,
   local feature branch `feat/observability-e2e-verification` deleted, `active-work.md` registry
   row released back to unclaimed.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Log in as a real super admin and open **SuperAdmin → System → Edge Function Errors**
  (`/superadmin/system/logs`) — as of this write-up it will still show "0 errors" / "No errors or
  warnings in this window", because Supabase Support Ticket 1 is unresolved. This is expected,
  not a regression from this PR.
- [ ] Once Supabase support confirms Ticket 1 is resolved, rerun
  `tests/e2e/safe/observability-edge-function-console.production-superadmin.spec.ts`
  (`PLAYWRIGHT_LANE=production-superadmin-read-only`, with the env vars set) — this is the
  fastest way to get a definitive yes/no rather than manually clicking through the UI.
- [ ] If the Playwright spec passes, do one manual pass anyway: open the console with a real
  incident in the last 24h (if one exists) and confirm the grouping, message content, and
  time-window filters all look sane to a human, not just to the assertion.

---

## Still open / follow-up

- **Supabase Support Ticket 1 (Logs Analytics endpoint)** — the console cannot function until
  this is resolved on Supabase's side. No workaround available from our end; the failure is
  isolated to their Management API's `/analytics/endpoints/logs.all` behavior for PAT-based
  auth on this project.
- **Supabase Support Ticket 2 (stuck `pg_cron` job 23)** — cosmetic/noise only (job 23 fails
  before any code executes, job 58 is the real working diagnostics job and is unaffected), but
  now formally escalated rather than left as an accepted permanent state.
- **`observability-restructure.md` is not yet deleted** — per the living-doc workflow, it's
  deleted only once this audit entry exists *and* the remaining open item (Ticket 1) is closed.
  Since Ticket 1 is still open, the living doc should stay until Supabase responds — deleting it
  now would lose the only place tracking the two ticket numbers/text and the diagnostic trail.
- **The `ci-gate` skill's own service-role-key grep command is confirmed stale** (references an
  inline `ALLOWED="..."` env var that no longer exists in `ci.yml`; the real mechanism is
  `.github/allowed-service-role-functions.txt` via `grep -vFf`). This was already known (recorded
  during PR #1027's ship) but reconfirmed here. The skill itself has not been corrected as part of
  this PR — separate small fix, not urgent since the workaround (check the allowlist file
  directly) is simple and now recorded twice.

---

## Soak status

Not feature-flagged. This is a pure bugfix to an internal SuperAdmin-only tool with no end-user
(tenant) visibility or behavioral change — risk tier is low regardless of the fixes' correctness,
since the console either shows real data or shows nothing, never anything misleading in between
(the whole point of the error-swallowing fix). Nothing to actively monitor beyond the manual QA
checklist above once Ticket 1 closes.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1075
- Merge commit: `b72f06716558dc297d3e1f2091cf604bb4990443`
- Edge function deploy workflow run: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34314256077
- Vercel production deployment: https://vercel.com/complyhub/complyhub-rto/AePkM8L8cHayXZ7SJ1H7fRc7ebi7
- Source living doc: `observability-restructure.md` (PR 5 section — not yet deleted, tracks the
  two open Supabase support tickets)
- Active work ledger: `active-work.md`
