# Audit — PR #955

> **Date:** 2026-09-03; **Merged:** 2026-09-03 00:33:57 UTC
> **Scope:** Restore Consultant read access to the Trainers Matrix Engine page for client tenants.
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — tracked via `complyhub-bug-fix` skill flow in-session, worktree C

---

## Summary

PR #955 is a two-function database permissions fix, no frontend changes. Angela (`angela@vivacity.com.au`,
role `Consultant`) reported that the Trainers Matrix Engine page (VET Workforce section) showed "No
trainers added yet" and all-zero stat cards when viewing a client tenant (Total Training Solutions
Adelaide Pty Ltd), while the tenant's own Administrator users saw the full trainer list on the identical
page.

Root cause, confirmed live via `pg_get_functiondef` before any fix was written: `build_trainer_matrix`
and `get_trainer_matrix_stats` (the two `SECURITY DEFINER` RPCs the page's only data-fetching hooks call)
gated access with `sec.has_tenant_role_strict(p_tenant_id, ARRAY['Administrator','Compliance Manager'])`
— a literal, non-elevating role check that has no Consultant allowance. Angela's `tenant_members` row on
that tenant is genuinely active with `role = 'Consultant'`, so both RPCs raised `ACCESS_DENIED`. The
frontend hooks (`useTrainerMatrixEngine.ts`) had no error state for this failure mode, so a permissions
rejection rendered identically to "tenant has zero trainers" — a silent blackout, not a visible error.

This PR changed 1 file (+127/−0), pure SQL, no frontend or edge function changes. No feature flag. The
fix widens the role allow-list on exactly these two functions to include `Consultant`, matching the
Consultant-parity pattern already used elsewhere in the codebase (`sec.has_tenant_role`'s
Administrator-elevates-to-Consultant behaviour) and an existing-but-never-wired-in helper,
`sec.is_trainer_matrix_admin()`, that already had the correct role list. The shared `has_tenant_role_strict`
helper — used by 48 other genuinely Administrator/Compliance-Manager-only functions (user role management,
licensing decisions, governance sign-off) — was deliberately left untouched to avoid loosening those.

**Branch:** `fix/consultant-trainer-matrix-access` (merged; remote and local deleted) · **Merge commit:**
`39da9c6ae69404cf12339bb3b9efdb8f7b2f6fb5` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/955

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Trainers Matrix Engine page, Consultant sessions | "No trainers added yet", all stat cards zero, for a client tenant whose Administrator sees a full populated matrix | `build_trainer_matrix` / `get_trainer_matrix_stats` gated with `sec.has_tenant_role_strict(..., ARRAY['Administrator','Compliance Manager'])` — no Consultant allowance |
| Page error handling | RPC `ACCESS_DENIED` rendered identically to a genuinely empty tenant | `useTrainerMatrixEngine.ts`'s `useTrainerMatrix`/`useTrainerMatrixStats` hooks have no distinct error UI for this case (query `error` isn't surfaced) — parked, not fixed in this PR (see Still open) |
| Existing asymmetry (pre-existing, not introduced here) | `compute_trainer_classification` ("Recompute All") already worked for a Consultant on the same page where viewing the matrix did not | That function uses the non-strict `sec.has_tenant_role`, which already elevates Administrator-gated checks to include Consultant |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `5582bd5366bccbd332dff507437dc5d144a4f345` | Add migration widening `build_trainer_matrix` and `get_trainer_matrix_stats` role gates to include Consultant |
| `39da9c6ae69404cf12339bb3b9efdb8f7b2f6fb5` | Merge PR #955 into `main` |

---

## Fixes shipped

### Database

- **`supabase/migrations/20260903002918_allow_consultant_trainer_matrix_read.sql`** — `CREATE OR REPLACE FUNCTION` on `public.build_trainer_matrix(uuid, text)` and `public.get_trainer_matrix_stats(uuid)`. Every line carried forward unchanged from the live definitions (confirmed via `pg_get_functiondef` and a `git log -S` content search identifying `20260824161000_restore_trainer_matrix_tenant_gate.sql` and `20260825201100_fail_closed_trainer_classification_and_stats.sql` as the true latest versions) except the role array: `ARRAY['Administrator','Compliance Manager']` → `ARRAY['Administrator','Compliance Manager','Consultant']`.
- Applied to production via the documented interim procedure (`execute_sql`, not `apply_migration`, since `supabase db push` is currently blocked by unrelated ~2,000-version ledger drift) — see Production rollout below.
- No new tables, no RLS policy changes, no grant changes (confirmed `PUBLIC`/`anon` execute grants remain at zero, unchanged).

### Edge functions

None touched, none redeployed.

### Frontend

None touched — `src/hooks/useTrainerMatrixEngine.ts` and `src/pages/admin/trainers/TrainerMatrixEngine.tsx` were read and confirmed already correct (both use `useEffectiveRole().effectiveTenantId` properly); the bug was entirely at the RPC layer.

---

## Review rounds

1. **Root-cause (Scout, Explore subagent)** — traced the page → hooks → RPC call chain, identified the two candidate functions and the `has_tenant_role_strict` vs `has_tenant_role` asymmetry from migration files, code-only confidence initially.
2. **Live DB confirmation** — pulled actual deployed `pg_get_functiondef` for both RPCs and for `sec.has_tenant_role_strict`/`sec.has_tenant_role`/`sec.is_trainer_matrix_admin`; confirmed Angela's real `tenant_members` row (`role = 'Consultant'`, `status = 'active'`) on the affected tenant. Upgraded diagnosis from code-only to live-confirmed before any fix was planned.
3. **Blast radius check** — grepped all frontend callers (one caller each, both in `useTrainerMatrixEngine.ts`); queried every function using `sec.has_tenant_role_strict` (48 total) to confirm the shared helper must not be touched; confirmed via `git log -S` (content search, not filename search, per this repo's migration-authoring rule) that the two identified migration files are genuinely the latest versions of these functions.
4. **DB & security safety checks** — confirmed no RLS/table/trigger involvement (pure `SECURITY DEFINER` function bodies), confirmed existing `EXECUTE` grants have no `PUBLIC`/`anon` entries and are unaffected by a same-signature `CREATE OR REPLACE`.
5. **Post-merge live verification** — after production apply, simulated Angela's actual session (`request.jwt.claim.sub`/`.role` GUCs matching her real user id and `authenticated` role) and called both RPCs directly against production: `build_trainer_matrix` returned 6 real trainer rows, `get_trainer_matrix_stats` returned consistent real stats, both previously would have raised `ACCESS_DENIED`. Negative-case check: same session requesting a different tenant she's also a Consultant on still correctly raised `ACCESS_DENIED`, confirming tenant isolation was not weakened.

No fresh-eyes/adversarial subagent pass was run on this PR — the fix was small enough (2 function bodies, byte-for-byte diff against live definitions except one array literal) that the live-DB verification above served as the primary confidence check instead.

---

## Production rollout (post-merge)

1. **Vercel production** — `dpl_3C2N7y2XSReKuXckUw6HGAvH2wtS`; `state`/`target`: **READY** / **production**; SHA `39da9c6ae69404cf12339bb3b9efdb8f7b2f6fb5` (merge commit itself, since this PR has no frontend files to build differently). Inspector: https://vercel.com/complyhub/complyhub-rto/3C2N7y2XSReKuXckUw6HGAvH2wtS
2. **Edge functions** — none.
3. **Migrations** — applied via the interim procedure: exact SQL run through Supabase MCP `execute_sql` post-merge; verified both function bodies now contain `Consultant` via `pg_get_functiondef`. Ledger reconciled via `supabase migration repair --status applied 20260903002918` (run by Brian from terminal); confirmed via `list_migrations` — `version=20260903002918`, `name=allow_consultant_trainer_matrix_read` present, matching the file exactly. No drift introduced.
4. **Worktrees** — worktree C (`rto-compass-hub-C`) on `main` at `39da9c6ae`, clean working tree (aside from a pre-existing untracked `test-results/` directory, unrelated to this work), local and remote feature branch deleted. Registry row to be released to unclaimed.

---

## Manual QA checklist (post-merge — Brian-gated)

The RPC-level fix is verified live and working (see Review rounds #5) using Angela's real account
details via a database-level session simulation — this is not a browser/UI pass. Not done in-session:

- [ ] Angela (or another Consultant) logs in for real and confirms the Trainers Matrix Engine page
      itself renders the trainer list and stat cards for Total Training Solutions Adelaide Pty Ltd
      (not just that the underlying RPC returns data)
- [ ] Confirm an Administrator/Compliance Manager on the same tenant still sees identical behaviour
      (no regression)
- [ ] Spot-check one other client tenant where a different Vivacity consultant has access, to confirm
      this isn't tenant-specific

---

## Still open / follow-up

- **No distinct error UI for RPC access-denial on this page** — `useTrainerMatrixEngine.ts`'s query
  hooks don't surface a permissions-error state distinct from "empty tenant." This exact bug shape
  (silent blackout instead of a visible error) could recur for any other role/RPC combination and
  wouldn't be reported as clearly as this one was. Not fixed here — needs its own FRAME if Brian wants
  a systemic fix (e.g. distinguishing PostgREST/RPC `42501` errors in the UI).
- **Pre-existing asymmetry, not addressed** — `compute_trainer_classification` ("Recompute All") already
  used the non-strict, Consultant-elevating helper before this fix, while viewing the matrix did not.
  This PR removes the inconsistency by bringing the read path in line with the write path; no further
  action needed unless a similar gap is found on another trainer-matrix-adjacent RPC.
- **`sec.is_trainer_matrix_admin()` remains unused** — the helper already had the correct role list
  (`Administrator`, `Compliance Manager`, `Consultant`) but this fix widened the existing inline
  `has_tenant_role_strict` calls directly rather than switching to it, to keep the diff minimal and
  exactly traceable against the live definitions. A future cleanup could switch both functions to call
  the helper instead, if consolidation is wanted.

---

## Soak status

No feature flag. Risk: low — narrowly scoped (2 function bodies, no schema/table/RLS change, single
frontend caller each, shared strict helper untouched, live-verified positive and negative cases
post-deploy). Watch: any report of a Consultant seeing a client tenant's trainer data they shouldn't
(would indicate the tenant-match guard was somehow affected, which the negative-case test already
rules out) — otherwise no expected fallout.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/955
- Merge commit: `39da9c6ae69404cf12339bb3b9efdb8f7b2f6fb5`
- Production deploy: https://vercel.com/complyhub/complyhub-rto/3C2N7y2XSReKuXckUw6HGAvH2wtS
- Migration file: `supabase/migrations/20260903002918_allow_consultant_trainer_matrix_read.sql`
- Active work ledger: `active-work.md`
