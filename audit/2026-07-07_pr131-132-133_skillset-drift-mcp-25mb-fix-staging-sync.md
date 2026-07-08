# Audit — PRs #131 + #132 + #133: Skillset drift reconciliation, mcp 25MB fix, staging sync (07 July 2026)

**Date:** 07 July 2026
**Branches:** `fix/reconcile-skillset-edge-fn-migration-drift` (PR #131) · `fix/mcp-function-bundle-size` (PR #132) · `feat/staging-sync` (PR #133)
**PRs:** #131 · #132 · #133 — all merged
**Merged by:** Brian (Khian)
**Merge commits:** `e19d3d291` (PR #131) · `3f767a610` (PR #132) · `f3923829a` (PR #133)

This closes the `mcp` 25MB deploy blocker flagged as "next priority item" in the PR #128/129/130 audit entry, and reconciles a fresh round of staging/main drift discovered via `/audit-branch-drift` — a repeat of the exact incident pattern documented in that same entry (direct-to-production deploys bypassing git, later silently reverted by an unrelated merge).

---

## Trigger

Ran `/audit-branch-drift`, specifically checking for a repeat of the `ai-router` incident (PR #129): Lovable deploying code or schema changes directly to production, then a later unrelated merge to `main` silently reverting it via `deploy-edge-functions.yml`'s blanket redeploy.

**Drift at time of audit:** `staging` had 77 commits `main` didn't have (mostly generic `gpt-engineer-app[bot]` "Changes" commits, centred on one real feature — skill-set support in the TAS builder). `main` had 15 commits `staging` didn't have (PR #127, #129, #130).

---

## PR #131 — Skillset edge function + migration drift reconciliation

### Root cause

`supabase/functions/tga-extract-packaging-rules/index.ts` was live in production running content matching `staging`'s version byte-for-byte (confirmed via `get_edge_function` + diff) — a new branch that deterministically parses `SkillSetRequirements` HTML (`contentTypeCode '0126'`) for skill-set builds, instead of routing them through the qualification packaging-rules AI-extraction path. `main` had none of it. Cross-checked `updated_at` (`2026-07-05T23:43:46Z`) against `deploy-edge-functions.yml`'s run history — confirmed direct deploy, not git-triggered.

4 migration files existed only on `staging`, all part of the same feature (`rpc_get_build_readiness` AQF/VoL and Market Needs carve-outs for unit/skillset builds; `rpc_get_aot_prerequisites`'s NCVER-coverage skillset branch; an attempted fix to `rpc_calculate_aot_engine`'s `tas_aot_packs` INSERT columns). Queried production directly (`pg_get_functiondef`) — all three RPCs **already had this logic live**, applied directly with no matching file in `main`. Filenames used Lovable's UUID convention, failing this repo's filename guard.

**Exposure:** the next merge touching `supabase/functions/**` would trigger a blanket redeploy from `main`'s git state, silently reverting the live skillset feature — identical mechanism to the `ai-router` incident.

**Also surfaced while verifying:** the repo's own `Migration drift check` logic, run manually, found **56 migrations merged to `main` never applied to production**, and **479 production migration records with no matching file anywhere in git** — a much larger instance of the historical Lovable direct-to-prod drift (`20260624000100_gap_fill_tenants_schema_drift.sql` precedent). Not fixed in this round — flagged for a dedicated reconciliation pass. 6 of the 479 fall in the 6–7 Jul window this feature was built (`20260706043712`, `20260706043811`, `20260707020620`, `20260707020720`, `20260707021220`, `20260707021303`) — likely part of the same feature, called out for priority in that future pass.

### Fix

Ported the live edge function source and the 4 migration files verbatim, renamed to satisfy the filename guard (content unchanged): `20260706214824_carve_out_skillset_from_build_readiness_aqf_vol.sql`, `20260706220632_carve_out_skillset_from_build_readiness_market_needs.sql`, `20260707014837_patch_aot_prerequisites_skillset_ncver_coverage.sql`, `20260707015731_fix_aot_engine_insert_column_names.sql`.

### Bugs found (Cursor Bugbot + Vercel reviewer, all verified against live schema/data before fixing)

| # | Bug | Verification | Fix |
|---|---|---|---|
| 1 | `rpc_calculate_aot_engine` read/wrote `qualification_context.vol_min_hours`/`vol_max_hours` — columns that don't exist (real: `volume_of_learning_min`/`volume_of_learning_max`) | `information_schema.columns` — confirmed the named columns don't exist under those names | Corrected all 4 references to real column names |
| 2 | `INSERT INTO tas_aot_packs` omitted `breakdown`, `jsonb NOT NULL` with no default | `information_schema.columns` — `is_nullable = 'NO'`, `column_default = null` | Added `breakdown` to INSERT column list and `ON CONFLICT DO UPDATE SET` |
| 3 | Prerequisite gate checked `v_prereq->'blockers'`, a key `rpc_get_aot_prerequisites` never returns (it returns `is_ready`/`missing_fields`/`lock_reason`) — gate never engaged | Pulled live function definition via `pg_get_functiondef` | Rewrote gate to check `(v_prereq->>'is_ready')::boolean`, synthesising a `blockers` array from `lock_reason` |
| 4 | `tga-extract-packaging-rules`: a failed `q1_tas_builder` update on the skillset save path was only logged; response still claimed `success: true` | Code inspection | Added early return with `success: false`, `status: 500` on `saveError` |

**Verified live before and after fixing:** pulled `rpc_calculate_aot_engine`'s definition from production before the fix (matched the broken ported code exactly), applied the fix via `apply_migration`, re-pulled and confirmed the corrected code was now live.

**Merged, migrations applied to production, verified live.** Post-merge check found the automatic redeploy never actually reached `tga-extract-packaging-rules` at all — root cause below.

---

## PR #132 — `mcp` function rewrite (closes the deploy blocker flagged in PR #129's audit)

### Root cause

`gh run list --workflow=deploy-edge-functions.yml` showed the PR #131 merge's redeploy as `failure`. Log: `unexpected create function status 413: request entity too large` on `mcp`. `supabase/functions/mcp/index.ts` was ~50 lines of real logic (two read-only tools: `echo`, `app_info`) wrapping `npm:@lovable.dev/mcp-js@0.20.0` for JSON-RPC/MCP protocol handling. That package's own dependency tree balloons the deploy bundle to ~25MB — confirmed directly: removing it from `package.json` and running `npm install` removed **69 other packages** automatically, none used directly.

Because `deploy-edge-functions.yml` deployed all ~209 functions in one `supabase functions deploy` call with no function list, this one oversized function could stop the whole batch partway through — same mechanism as the `ai-router` incident (PR #129).

### Fix

Full rewrite, not a workaround — zero external dependencies:
- `src/lib/mcp/types.ts` — plain `McpTool`/`McpToolResult` types + `defineTool` identity helper
- `src/lib/mcp/protocol.ts` — hand-rolled JSON-RPC 2.0 handling (`initialize`, `ping`, `tools/list`, `tools/call`, notification handling, batch requests)
- `src/lib/mcp/tools/{echo,app-info}.ts` — same two tools, plain JSON Schema instead of zod
- `supabase/functions/mcp/index.ts` — hand-bundled Deno entrypoint (this directory's existing convention)
- `@lovable.dev/mcp-js` removed from `package.json`
- 13 tests (`tests/lib/mcp/protocol.test.ts`)

Also split `deploy-edge-functions.yml` so `mcp` deploys on its own via a new `deploy-mcp-function.yml` — insurance so this one function can't again block the other ~340.

### Verification

Pushed as PR #132 → triggered a Supabase branch-preview deploy that showed `FUNCTIONS_DEPLOYED` (first one in the observed history to succeed, versus repeated failures on prior merges). Confirmed `mcp` present in `list_edge_functions` on the branch project (version 1, `ACTIVE`). Sent real JSON-RPC requests via `curl` directly against the branch preview URL — `initialize`, `tools/list`, `tools/call` (both tools) all returned correct `HTTP 200` responses.

**Not verified:** a literal MCP client application (Claude Desktop, Cursor) connecting and using the endpoint — raw protocol tests pass, a real client handshake hasn't been tried.

### Second bug caught by Bugbot on the same PR

The workflow split used a hand-maintained exclusion blocklist that missed two non-function helper directories (`_sql`, `shared` — distinct from `_shared`) lacking an `index.ts`. Passing those to `supabase functions deploy` risked failing the entire production deploy job, not just skipping `mcp`. Fixed by replacing the blocklist with a positive check: a real function is a folder with an `index.ts` that isn't underscore-prefixed (verified `_shared/index.ts` is a barrel-export file, not an entrypoint, so the underscore check is necessary in addition to the `index.ts` check). Verified against the actual tree — 342 real functions correctly included, all 6 known non-function directories correctly excluded.

**Merged** (`3f767a610`).

---

## GitHub Actions billing outage — discovered mid-session, unrelated to any code

While checking whether the #131/#132 merges had actually redeployed anything, found every GitHub Actions job failing in ~2 seconds: *"The job was not started because recent account payments have failed or your spending limit needs to be increased."* Confirmed via `gh api orgs/ComplyHub-ai/settings/billing/actions` that the session token lacks `admin:org` scope — needs an org Owner (Carl) to check **Settings → Billing and plans** on `ComplyHub-ai`.

**Effect:** `deploy-edge-functions.yml`/`deploy-mcp-function.yml` did not run for the #131, #132, or #133 merges.

**Workaround:** manually deployed `mcp` and `tga-extract-packaging-rules` to production via the Supabase `deploy_edge_function` MCP tool, using the exact content already committed on `main` — a substitute delivery mechanism for already-reviewed/merged code, not a bypass. Confirmed live afterward (`mcp` v1→2, correct `initialize` response in production; `tga-extract-packaging-rules` v407→408).

**Why this doesn't recreate the drift risk it resembles:** GitHub Actions has no concept of a "previous version" — every run deploys whatever is on `main` at trigger time. Since the manual deploys pushed exactly what was already committed, a later Actions run (once billing is fixed) would just redeploy the same code — a no-op. The risk only reappears if something is deployed to production that was never committed to `main` first. Documented as a standing rule in `CLAUDE.local.md` (flagged for removal once billing is confirmed resolved).

---

## PR #133 — Branch-catchup: skillset UI, Login page, misc bug fixes

Ran `/branch-catchup` for the remainder of the 77 staging-only commits. Reviewed the file-level diff (most commits are generic "Changes" placeholders) and sorted into three groups.

### Group A — skillset feature frontend (ported)

The backend (PR #131) had nothing wired up to display it. Ported: `AOTPanel.tsx` (NCVER-based baseline UI for skillsets, consuming the exact extra fields `rpc_get_aot_prerequisites` now returns), `ElectivesSection.tsx` (skillset-aware labels), `TasBuildProgressBar.tsx` (drops the AOT tab for standalone-**unit** builds only — skillsets keep it, they still run the engine with an NCVER baseline), `UnitsPipelineStepper.tsx` (rationale exemption extended to unit + skillset), plus the supporting hooks (`useTasStepStates.ts`, `useTasPhaseGateState.ts`, `useTasDerivedReadiness.ts`, `tasStepStateReadiness.ts`, `pages/tas/builder-sandbox/index.tsx`) threading `productType` through consistently.

### Group B — Login page changes (confirmed intentional, then ported)

`src/pages/auth/Login.tsx`: hides Magic Link tab and Google sign-in (auth code untouched, just not rendered); replaces the "Create your RTO / Join existing RTO / Explore Trial" footer + tagline with a "Powered by Vivacity" attribution block. Initially held back — no matching feature-flag convention found elsewhere in the codebase, reasoning undocumented. **Confirmed by Brian as all three intentional** before porting.

### Group C — three small items, each verified against production before porting

| Item | Verification | Verdict |
|---|---|---|
| `AddAssessmentToolModal.tsx` created tools with `status: 'active'` | `SELECT DISTINCT status, count(*)` on `assessment_tools` → only `approved`/`draft`/`published`/`under_review` ever used, `'active'` appears nowhere | Real bug — fixed to `'draft'` |
| `useCreateConsultingOrg.ts` omitted `tenant_name` on insert | `information_schema.columns`: `NOT NULL`, no default; `information_schema.triggers`: nothing populates it | Real bug — would fail outright on first use. Fixed |
| `types.ts` | Regenerated fresh from live schema instead of porting staging's copy | Surfaced `ai_router_logs.kb_miss` — exists live, reflected nowhere in git before this |
| `vivacity-logo.png` | `git grep` — only consumer is `Login.tsx` (Group B); unrelated `TemplateManagementSection.tsx` refs point to an already-broken path on both branches | Moved from Group C to ship with Group B, not standalone |

**Applied Groups A + C** (14 files, +352/-119) — verified against `CLAUDE.md` conventions (no new `console.*`, `.single()`, raw `supabase.from()`), type-check/lint clean. Added 4 tests for the `productType` exemption logic. Committing surfaced one more pre-existing issue: `UnitsPipelineStepper.tsx` mixed a component export with plain function/interface exports, breaking React Fast Refresh (caught by the zero-warnings pre-commit hook) — split `deriveUnitsPipeline`/`UnitsPipelineStep` into `src/lib/deriveUnitsPipeline.tsx`, verified zero behaviour change.

Group B applied and verified separately after confirmation. Both pushed as PR #133, merged (`f3923829a`).

---

## Phase 2 — pre-reset drift scan and staging reset

Per the branch-catchup skill's mandatory step, scanned all 49 files still diffing between `main` and `staging` post-merge, checking last-touch timestamps on both branches:

| Category | Count | Detail |
|---|---|---|
| `main` ahead | ~35 | This round's work, plus earlier PRs (#127, #129, #130) `staging` never received |
| `main`-only additions | 8 | New files from this round (`mcp` rewrite files, test files, `deploy-mcp-function.yml`) |
| "Missing on `main`" by path, actually renamed | 4 | The 4 migration files — verified via content diff: 3 byte-identical under old UUID names, 4th differs only because `main` has the confirmed-live bug fixes |
| Genuinely newer on `staging` | 3 | `.lovable/mcp/manifest.json`, `.lovable/plan.md`, `bun.lock` — Lovable-internal tooling, never application code |

**Verdict: safe to reset** — every genuinely-ahead `staging` file was Lovable tooling, not app code. Force-pushed `main` → `staging`; verified both at `f3923829aa3c48bd0d87edeaa8733fac9e7081f8`.

---

## Files changed across #131/#132/#133

| File | PR(s) | Change |
|---|---|---|
| `supabase/functions/tga-extract-packaging-rules/index.ts` | #131 | Skillset extraction branch + save-error fix |
| `supabase/migrations/20260706214824_*.sql`, `20260706220632_*.sql` | #131 | `rpc_get_build_readiness` unit/skillset carve-outs |
| `supabase/migrations/20260707014837_*.sql` | #131 | `rpc_get_aot_prerequisites` NCVER-coverage branch |
| `supabase/migrations/20260707015731_*.sql` | #131 | `rpc_calculate_aot_engine` column names, gate, NOT NULL fix |
| `src/lib/mcp/{types,protocol}.ts`, `src/lib/mcp/tools/*.ts` | #132 | **NEW** — hand-rolled MCP protocol, zero dependencies |
| `supabase/functions/mcp/index.ts`, `README.md` | #132 | Rewritten, hand-bundled |
| `.github/workflows/deploy-edge-functions.yml` | #132 | Excludes `mcp`; blocklist → positive `index.ts`/underscore check |
| `.github/workflows/deploy-mcp-function.yml` | #132 | **NEW** — standalone `mcp` deploy |
| `tests/lib/mcp/protocol.test.ts` | #132 | **NEW** — 13 tests |
| `src/components/tas/builder-sandbox/AOTPanel.tsx`, `ElectivesSection.tsx`, `TasBuildProgressBar.tsx`, `UnitsPipelineStepper.tsx` | #133 | Skillset UI |
| `src/hooks/useTasStepStates.ts`, `useTasPhaseGateState.ts`, `useTasDerivedReadiness.ts`, `src/lib/tasStepStateReadiness.ts`, `src/lib/deriveUnitsPipeline.tsx` (new) | #133 | `productType` threading, Fast Refresh split |
| `src/pages/tas/builder-sandbox/index.tsx` | #133 | Skillset UI wiring |
| `src/pages/auth/Login.tsx`, `src/assets/vivacity-logo.png` (new) | #133 | Magic link/Google hidden, Vivacity footer |
| `src/components/tas/builder-sandbox/AddAssessmentToolModal.tsx` | #133 | `status: 'active'` → `'draft'` |
| `src/hooks/superadmin/useCreateConsultingOrg.ts` | #133 | Missing `tenant_name` on insert |
| `src/integrations/supabase/types.ts` | #133 | Regenerated fresh — `ai_router_logs.kb_miss` |
| `tests/lib/tasStepStateReadiness.test.ts` | #133 | **NEW** — 4 tests |

---

## Notes

- All migrations applied to production and verified live via direct `pg_get_functiondef` pulls before and after — not assumed from the migration file content alone.
- `mcp` and `tga-extract-packaging-rules` were manually deployed to production during this session due to the GitHub Actions billing outage — see dedicated section above. Both confirmed live via direct function checks, not CI status.
- **Not resolved in this round:** the 479-orphan / 56-unapplied migration backlog (flagged for a dedicated reconciliation pass); the GitHub Actions billing outage (needs Carl); a real MCP client handshake test; end-to-end exercise of the AOT engine fix through an actual build in the app; the 15+ open-branch sweep and Conversation History conflict flagged in earlier audit entries (untouched this round).
- Full working notes (evidence trail, exact commands, intermediate findings) logged separately at `stagingTomainjuly7.md` and `staging-sync-findings.md` (personal workspace, not KB).
