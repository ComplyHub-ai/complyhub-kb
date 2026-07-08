# Staging → Main Reconciliation — 7 July 2026

Progress log for the drift audit, reconciliation, and follow-on fixes started 7 July 2026. Written for a quick read-back of what happened and why, not as a technical spec.

---

## 1. Findings — the audit

Ran `/audit-branch-drift` on `rto-compass-hub`, specifically checking for a repeat of the incident where Lovable deployed code directly to production and a later merge to `main` silently overwrote it.

**Branch drift:** `staging` had 77 commits `main` didn't have (mostly Lovable "Changes" commits, but centred on one real feature — skill-set support in the TAS builder). `main` had 15 commits `staging` didn't have (recent engineering fixes: trainer report race, ai-router regression, complybot feedback).

**Edge function drift — confirmed repeat of the exact same incident:** `tga-extract-packaging-rules` was live in production running the **staging** version (with new skill-set extraction logic) while `main` had none of it. Lovable had deployed it directly to production, bypassing git. If any unrelated PR touching `supabase/functions/**` had merged to `main` first, the automatic deploy would have silently reverted this feature in production — no error, no warning. This is the same failure mode that hit `ai-router` on 6 July (PR #129).

**Migration drift — same feature, worse than it looked:** 4 migration files existed only on `staging` (RPC changes to `rpc_get_build_readiness`, `rpc_get_aot_prerequisites`, `rpc_calculate_aot_engine`). Queried production directly and confirmed all three RPC functions **already had this logic live** — applied directly to the database, no matching file in `main`.

Also surfaced, while digging into production's migration history: **56 migrations merged to `main` were never applied to production**, and **479 production migrations have no matching file anywhere in git** — a much bigger version of the historical Lovable direct-to-prod drift already documented in this repo. Flagged for follow-up; not part of this fix.

---

## 2. Reconciliation — PR #131

Branch `fix/reconcile-skillset-edge-fn-migration-drift`, off `main`.

- Ported the live edge function source and the 4 migration files into `main`, so git finally matches what was already running in production.
- Renamed the 4 migration files (they had Lovable's UUID-style names, which fail this repo's filename guard) — content unchanged, filenames only.
- **Cursor and Vercel's bot review caught real, active bugs** in the ported code — not cosmetic issues:
  - `rpc_calculate_aot_engine` (the engine that calculates required training hours) was reading and writing database columns that don't exist under those names — meaning it was **actively broken in production** for both qualification and skill-set builds.
  - Its database save was missing a required field — the save would have failed outright the first time anyone tried it.
  - Its "is everything ready to calculate?" check was looking for a signal that the readiness function never sends — so that gate never actually blocked anything, regardless of real readiness.
  - A related function (`tga-extract-packaging-rules`) would tell the caller "saved successfully" even when the database save had actually failed.
- Fixed all four. Verified directly against the live database, before and after, that the broken version was actually running and the fixed version is now actually running.
- Merged to `main`, migrations applied to production, verified live.
- Post-merge check on the automatic redeploy: confirmed the edge function's skill-set logic survived (it did) — but also discovered the redeploy **never actually reached** that function at all, because of the issue below.

---

## 3. The MCP function — 25MB bloat, found and fixed

**How it surfaced:** checking whether the automatic redeploy after merging PR #131 actually ran cleanly. It didn't — it failed on an unrelated function called `mcp`, the same way several previous merges' redeploys had also failed.

**What `mcp` actually is:** a tiny connector that lets outside AI tools (Claude, Cursor) ask ComplyHub two trivial things — "echo this text back" (a connectivity test) and "what is ComplyHub" (one paragraph). Around 50 lines of real logic.

**Why it was 25MB:** it was built using a full third-party toolkit package (`@lovable.dev/mcp-js`) to handle the technical protocol, rather than anything hand-written. That package drags in a large tree of other libraries it depends on, and when the function gets bundled up for publishing, the *entire* dependency tree gets included — not just the small part actually used. Confirmed directly: removing that one package from the project caused 69 other, unrelated packages to be removed automatically, since they'd only ever been pulled in because of it.

**Why it mattered:** Supabase (our hosting provider) rejects any single function over a size limit — ours was going well over it, causing a `413` error every time. Because all backend functions get published together in one batch, this one oversized function could silently stop the *rest* of the batch from publishing too, exactly the mechanism behind the original incident this whole investigation started from.

**The fix — not a workaround, the actual cause:** rewrote `mcp` by hand, implementing only the small piece of the AI-tool protocol these two trivial tools actually need, with no third-party toolkit at all. Bundle size should now be a few KB instead of 25MB — roughly a 1,000x reduction. Added 13 automated tests proving the two tools still behave correctly (all passing). Also split the publishing process so `mcp` publishes on its own from now on — insurance so this one function can never again block every other feature's publish, even if it were to bloat again in future for some other reason.

**Verified working, end to end.** Pushed the rewrite as PR #132, which triggered a Supabase branch-preview deploy — the first one in days to actually show `FUNCTIONS_DEPLOYED` instead of failing. Sent the rewritten function real protocol messages (`initialize`, `tools/list`, `tools/call` for both tools) directly against the branch preview URL and got correct responses back for all of them. Cursor Bugbot then caught a second, separate real bug in the same PR — the workflow's function-exclusion list was a hand-maintained blocklist that missed two other non-function helper folders (`_sql`, `shared`); passing those to the deploy command could have failed the *entire* production deploy, not just skipped `mcp`. Fixed by flipping the logic to a positive check (a real function is a folder with an `index.ts` that isn't underscore-prefixed) instead of a list that can silently go stale. Merged as PR #132.

**Not yet verified:** whether a literal AI client app (Claude Desktop, Cursor) can connect to and use the rewritten version — that needs someone to actually try it, not something testable from here.

---

## 4. Discovered: GitHub Actions billing outage — blocking all production deploys today

While checking whether PR #131 and #132's merges had actually redeployed anything, found every GitHub Actions job on this repo failing in ~2 seconds with: *"The job was not started because recent account payments have failed or your spending limit needs to be increased."* This is a `ComplyHub-ai` org-level billing issue, unrelated to any code — it means **`deploy-edge-functions.yml` and `deploy-mcp-function.yml` have not actually run for any of today's merges**, including PR #131 and #132.

I can't view or fix this myself — it needs `admin:org` GitHub access, which requires an org Owner (Carl) to check **Settings → Billing and plans** on the `ComplyHub-ai` GitHub org and either update the payment method or raise the Actions spending limit.

**Temporary workaround, in use until billing is fixed:** manually deployed the two functions that had actually changed today (`mcp`, `tga-extract-packaging-rules`) straight to production via the Supabase MCP tool, using the exact file content already committed on `main` — not a shortcut around review, just a different delivery path for code that was already reviewed, tested, and merged. Confirmed both live afterward (`mcp` responded correctly to a real `initialize` request in production; `tga-extract-packaging-rules` version bumped to 408).

**Important — this does *not* create the risk it might look like it creates.** GitHub Actions has no memory of "the old version" — every run just deploys whatever is currently on `main`. Since these manual deploys pushed exactly what's already committed, git and production are in sync for both functions. When billing gets fixed and the workflow eventually runs (automatically on the next push, or via a manual re-run), it will deploy that same already-current code — a no-op, not a regression. **The only way this workaround becomes dangerous is if someone deploys directly to production again without committing to git first** — that's the exact drift pattern this whole investigation exists to fix. Rule for the duration of the outage: commit to `main` first, always, then manually deploy exactly that committed content. Never deploy anything uncommitted while this is unresolved.

---

## 5. `/branch-catchup` — porting the remaining staging-only work into main

With the skill-set backend (edge function + migrations) and the `mcp` bloat both already handled, ran `/branch-catchup` for what's left of the original 77 staging-only commits. Most of those commits are generic Lovable "Changes" placeholders, so reviewed the actual file-level diff instead of going commit-by-commit, and sorted what's left into three groups:

- **Group A — the skill-set feature's frontend half.** The backend (edge function + RPCs) was reconciled in PR #131, but the UI to actually use it was still stranded on `staging` — without it, the database supports skill-sets with nothing wired up to display it. Covers the AOT panel (shows NCVER-based baseline for skill-sets instead of AQF Volume of Learning), the units import flow, and the build progress bar / phase-gate logic that skips the AOT tab for standalone-unit builds and skips "unit rationale" for both unit and skill-set builds.
- **Group B — Login page changes** (hiding the tab bar, magic-link tab, footer links). Held back — this is a product/UX decision, not a bug fix, and the reasoning behind it isn't known. Queued for a separate diagnosis before any porting decision.
- **Group C — three small, unrelated items.** Checked each against the live database rather than porting blind:
  - A new assessment-tool default status of `'active'` (current `main` behaviour) — confirmed against real production data that `'active'` is never actually used anywhere in that table (only `approved`/`draft`/`published`/`under_review` are). Staging's fix to `'draft'` is a real bug fix, not a preference.
  - A tenant-creation hook missing `tenant_name` on insert — confirmed that column is `NOT NULL` with no default and no trigger to populate it, meaning the current `main` version would fail outright the first time anyone used it. Real bug, not cosmetic.
  - The generated `types.ts` — regenerated fresh from the live schema instead of porting Lovable's stale copy, since a hand-copied snapshot could silently miss or misrepresent anything changed since. Turned up one genuine drift item this way: a `kb_miss` column on `ai_router_logs` that exists live but wasn't reflected anywhere in git.
  - (A "logo size" asset was initially bundled into this group but pulled back out — its only actual consumer is `Login.tsx`, which is Group B, so it would have shipped as a dead, unused file on its own.)

Applied Groups A + C: 14 files, +352/-119. Checked every changed line against this repo's conventions (no new `console.*`, no `.single()`, no raw `supabase.from()` in components) — clean, nothing introduced beyond what was already there. Type-check and lint both clean. Added 4 new tests for the `productType` exemption logic in `readinessFromStepStates` (proving unit builds correctly drop the AOT phase from scoring, while skill-sets don't) — all passing.

Committing also caught a pre-existing lint problem this repo's zero-warnings pre-commit hook wouldn't let through: `UnitsPipelineStepper.tsx` mixed a component export with a plain function/interface export, which breaks React Fast Refresh. Split `deriveUnitsPipeline` + `UnitsPipelineStep` out into their own file (`src/lib/deriveUnitsPipeline.tsx`) to fix it — pure mechanical cleanup, no behaviour change. Committed as `91978e010`.

**Group B — resolved.** Confirmed with Brian all three Login page changes are intentional: hiding Magic Link and Google sign-in (underlying auth code untouched, just not shown for now), and replacing the "Create your RTO / Join existing RTO / Explore Trial" footer links with a "Powered by Vivacity" attribution block. Applied, verified clean, committed as `537ad1b4a`.

Pushed both commits as PR #133, merged into `main` (`f3923829a`). Post-merge checklist run: merge confirmed on `main`, remote branch deleted, local branch cleaned up, Vercel production deploy confirmed building/ready for the merge commit.

---

## 6. Phase 2 — staging reset

Ran the mandatory pre-reset drift scan (not just trusting the PR #133 description) across all 49 files still showing a diff between `main` and `staging`. Checked the actual last-touch commit date on both branches for every one:

- **~35 real application files** — `main` is ahead. Includes everything reconciled today, plus earlier separate PRs (#128 trainer report race, #129 ai-router restore, #130 ComplyBot feedback) that `staging` never received at all.
- **8 files `main`-only** — new files added today (the `mcp` rewrite's `protocol.ts`/`types.ts`, test files, `deploy-mcp-function.yml`) — nothing to reconcile, `main` simply has more.
- **4 migration files, "missing" on `main` by path** — verified these are true renames: 3 are byte-identical to their `staging` originals under the old Lovable UUID filenames, the 4th differs only because `main` has the AOT engine bug fixes already confirmed live in production. Nothing lost.
- **3 files genuinely newer on `staging`** — `.lovable/mcp/manifest.json`, `.lovable/plan.md`, `bun.lock`. All Lovable-internal tooling files (this repo builds via npm/Vercel, not Lovable), never real application code, already excluded from every porting decision made today.

**Verdict: safe to reset.** Every file where `staging` was genuinely ahead was Lovable's own tooling, not app code. Force-pushed `main` → `staging`. Both branches now point at the same commit.

---

## What's next

1. **Resolve the GitHub Actions billing issue** — needs an org Owner (Carl) in the `ComplyHub-ai` GitHub org billing settings. Still blocking every automated production deploy.
2. **Real-world MCP client test** — connect Claude Desktop or Cursor to the live `mcp` endpoint to confirm a literal client (not just raw protocol requests) works end-to-end.
3. **Test the AOT engine fix for real** — so far verified the database function's *code* is fixed and live; still want to see it actually run against a real qualification or skill-set build in the app itself.
4. **QA the ported skillset UI and Login page changes** in the live app.
5. **The 6 orphaned production migrations with no git file anywhere**, and the wider 56-unapplied / 479-orphaned migration backlog surfaced during the original audit — needs its own dedicated investigation before any gap-fill migration can be written. Not urgent, but growing.
6. **Once billing is fixed:** confirm the next real `deploy-edge-functions.yml` / `deploy-mcp-function.yml` run actually goes green — first genuine end-to-end proof the whole pipeline works again, not just the manual workaround.
7. **Staging will diverge again** as Lovable keeps writing to it — expected and normal, not a problem to solve.
