# Audit — PR #319: Bug 3 Batch-2 Follow-up (Stale `profiles.tenant_id` Sweep Completion) (28 July 2026)

**Date:** 28 July 2026  
**Branch:** `fix/bug3-batch-2-followup` (deleted post-merge)  
**PR:** [#319](https://github.com/ComplyHub-ai/rto-compass-hub/pull/319)  
**Merge commit:** `113b6b670c86a7fbc0fcb68deaa0b45c22f8ef23`  
**Prior work:** PR [#317](https://github.com/ComplyHub-ai/rto-compass-hub/pull/317) (27 Jul 2026) — Categories A–G read-filter fixes, Table #14, Bug 2, D1–D5/D7 RPC hardening  
**Living doc retired:** `bug3-stale-tenant-id.md` (workspace root) — deleted after this audit per living-doc workflow  
**Origin:** Deferred from `crosstenantleak.md` (PR #310); full sweep + diagnosis in `bug3-stale-tenant-id.md`

---

## Purpose

Close out the two-PR Bug 3 body of work: eliminate cross-tenant data exposure and data-integrity bugs caused by frontend/edge code reading the legacy `profiles.tenant_id` ("home org") field instead of the session-routing `profiles.active_tenant_id` / `useEffectiveRole().effectiveTenantId`. PR #317 fixed all diagnosed **read-filter** leak sites; PR #319 completed the **batch-2 follow-up** (D6 RPC rebuild, dead-code cleanup, write/insert-stamp sweep, documentation correction, CI hardening).

---

## What was implemented (PR #319)

### 1 — D6: Rebuild `auto_create_governance_entry` RPC (Decision 7 + 13)

Three migrations shipped and applied to production via interim procedure (`supabase db query --linked` + `migration repair`):

| Version | Name | What it does |
|---|---|---|
| `20260727060151` | `recreate_auto_create_governance_entry_rpc` | Initial 9-arg RPC with auth hardening, idempotency on `linked_*`, `source_type = auto_generated` |
| `20260728083000` | `widen_gov_register_id_and_extend_auto_create_governance_entry` | `register_id` uuid→text; drop/recreate `v_gov_reverse_links`; OFI/Risk cleanup triggers; 12-arg RPC with `p_register_*` traceability |
| `20260728094000` | `fix_auto_create_governance_entry_overload_and_idempotency` | Drop 9-arg overload (PGRST203 ambiguity); 12-arg only with register-pair idempotency |

**Call sites updated:** `useGovernanceLinks.tsx`, `ofi/index.tsx`, `continuous-improvement/index.tsx` — all pass `effectiveTenantId` and register traceability where applicable.

**Production verified:**
- `gov_register.register_id` → `text`
- Single 12-arg `auto_create_governance_entry` overload only
- Cleanup triggers on `ofi_register` and `risk_register`
- Ledger entries match version + name exactly

### 2 — Dead-code cleanup (Decision 8 + 9 expansion)

~36 files deleted including orphaned pages (`ImpersonatePage`, `CalendarNew`, `TrialOnboarding`, `UsersManagement`, etc.), unused hooks (`useActiveTenantId`, `useGovernanceAutomation`, `user-management/*`), and unreachable components. Pre-delete zero-consumer gate passed; no remaining imports of deleted paths in `src/`.

### 3 — Write/insert-stamp sweep (Decision 9 + Decision 12)

~130 live files updated to stamp/query with `useEffectiveRole().effectiveTenantId` (or `currentTenantId()` in non-hook utilities) instead of `profile.tenant_id`. Notable high-blast-radius fixes:

- `useAccessGate.ts` — billing/trial/paywall gate (11 consumers)
- `AuthContext.tsx` — `hasActiveTenant` / debug paths aligned to `active_tenant_id`
- `useGovernanceMeetingSchedules.ts` — create path tenant stamp
- `DocumentRepository.tsx` — shadowed `effectiveTenantId` local variable bug
- `CreateTrial.tsx` — onboarding redirect gate (resolved to `effectiveTenantId`)

**Post-merge grep on `main`:** ~148 hits across ~65 files remain — all triaged as dead/orphan/debug/intentional (see Deferred below), not live cross-tenant surface.

### 4 — `rto-compass-hub/CLAUDE.md` correction (Decision 10)

`profiles.role` documented as a stale signup-time snapshot (not platform-level-only); sibling ban example added mirroring the existing `profiles.tenant_id` guidance. Points contributors to `useEffectiveRole().effectiveRole`.

### 5 — Memory supersede (Decision 11)

Personal Claude memory `project_generate_audit_pack_role_bug` rewritten to mark PR #317 shipped and retract open-bug framing.

### 6 — CI/lint hardening

- 24 `.single()` → `.maybeSingle()` across changed files (single-guard CI clean)
- `@ts-nocheck` removed from changed files
- `Math.random` → secure crypto helpers where touched
- `prefer-const`, `react-hooks/exhaustive-deps` fixes on changed set
- Pre-commit `--max-warnings=0` parity

### 7 — Supabase Preview fix

Migration `20260728083000` initially failed preview (`ALTER COLUMN register_id` blocked by `v_gov_reverse_links` dependency). Fixed by `DROP VIEW` → `ALTER` → `CREATE OR REPLACE VIEW` before merge.

---

## What was already shipped (PR #317 — for audit completeness)

| Area | Outcome |
|---|---|
| Categories A, B, C (live register pages), E (live services), F (TenantGuard, TrainerPortalContext), G (edge functions) | ✅ `effectiveTenantId` / `effectiveRole` |
| D1–D5, D7 RPC hardening | ✅ Migration `20260727025244` + frontend swaps |
| Table #14 `doc_review_actions` | ✅ RESTRICTIVE policy migration `20260727025253` |
| Bug 2 `ai-router` | ✅ `.maybeSingle()` on tenant/role lookups |
| E-id `generateCustomId` call sites | ✅ All pass `effectiveTenantId` |
| Dead-code items (A2, A8, B3, E1–E5, E9, F2, F3) | Not fixed — flagged; many deleted in PR #319 Decision 8 |

---

## Review and verification

- **Checker (Grok 4.5):** D6 overload ambiguity, meeting-schedule stamp, register-pair idempotency — triaged real; fixed before merge
- **CI:** lint, type-check, migration guards, security checks, Supabase Preview — all green post view-drop fix
- **Post-merge production:** 3 migrations applied + ledger repaired; schema verification queries confirmed final state

---

## Post-merge deployment

| Surface | Action | Status |
|---|---|---|
| Vercel frontend | Auto-deploy from merge to `main` | ✅ GitHub commit status `success` on `113b6b670` |
| Production DB | Interim procedure for 3 migrations | ✅ Applied + ledger repaired |
| Edge functions | No changes in PR #319 | N/A |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Decision 1 — Route through `useEffectiveRole()` / `currentTenantId()`, never blind column swap | Applied across both PRs |
| Decision 4/7 — D6 rebuild as separate batch | ✅ Shipped PR #319 |
| Decision 5 — `profiles.role` is stale snapshot | Fixed in PR #317 (B4/B5/G3/G6); documented in PR #319 (Decision 10) |
| Decision 8 — Dead-code deletion | ✅ Shipped PR #319 |
| Decision 9/12 — Write-stamp sweep | ✅ Shipped PR #319; remainder is dead/orphan only |
| Decision 13 — Register traceability (`register_type`/`register_id`/`register_custom_id`) | ✅ Option A shipped; OFI + CI + Risk paths covered |
| Impersonate page | Deleted (Support Mode via `ImpersonationContext` is separate, unaffected) |

---

## Deferred items (not blocking closure)

| Item | Reason |
|---|---|
| Complaints/feedback governance auto-link | `ComplaintsAppealsForm.tsx` is an empty stub — missing feature, not Bug 3 |
| ~65 files / ~148 `profile.tenant_id` grep hits | Dead/orphan/debug: `RoleDebugPanel`, `TenantProtectedRoute`, `CalendarAISuggestionsPanel`, unrouted `industry-consultation/`, etc. — future housekeeping |
| `userTenantLinking.ts:426` | Reads *other users'* `profile.tenant_id` in orphan-repair flow (home-org semantics) — intentionally unchanged |
| D8 `invite_user` hook | Dead code deleted with `user-management/` folder; live invite path is `InviteUserModal` (fixed in sweep) |
| D9/D10 dead hooks | Deleted in Decision 8 cleanup |

---

## Files changed (summary)

**PR #319:** ~250 files (large deletion + sweep). Key surfaces:

- **Migrations (3):** `20260727060151`, `20260728083000`, `20260728094000`
- **Governance:** `useGovernanceLinks.tsx`, `useGovernanceMeetingSchedules.ts`, `ofi/index.tsx`, `continuous-improvement/index.tsx`
- **Access/billing:** `useAccessGate.ts`, `AuthContext.tsx`
- **Docs:** `rto-compass-hub/CLAUDE.md`
- **Deleted:** `ImpersonatePage.tsx`, `useActiveTenantId.ts`, `user-management/*`, ~30 other dead files

---

## Notes

- This audit closes the full Bug 3 body of work spanning PR #317 + PR #319. `bug3-stale-tenant-id.md` deleted per living-doc workflow.
- Multi-tenant isolation (Consultant/Administrator workspace switching) was P0 throughout; live DB was source of truth for diagnosis.
- No new living doc opened for the ~65 residual dead/orphan hits — treat as opportunistic housekeeping if those files are ever revived or deleted in bulk.
- Vivacity Testing Tenant QA recommended for: OFI/CI→governance auto-create, meeting schedule create, reverse-links panel on governance entries with `register_type` set.
