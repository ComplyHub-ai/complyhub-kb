# Audit — PR #798

> **Date:** 26 August 2026 (audit written); **Merged:** 26 August 2026 06:08 UTC
> **Scope:** RBAC seeding backfill (#764), narrow Consultant trainer-document permission fix
> (#766), `register-evidence-manager` cross-register authorization hardening, TAS evidence index
> migration drift reconciliation (unrelated, surfaced by CI on this PR)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `pr-adversarial-review-aug22-aug26.md`
> (workspace root, Implementation plans B and C — the source of this PR's original scope; plan A
> from the same doc was already closed in the prior session and is not part of this PR)

---

## Summary

Implementation of the two remaining plans from a broader post-merge adversarial review
(`pr-adversarial-review-aug22-aug26.md`, covering ~135 PRs merged 22–26 Aug 2026): a data-hygiene
backfill for 34 tenants whose RBAC was never seeded, and a narrowed replacement for an over-scoped
Consultant permission grant. What started as a two-migration change grew substantially once review
began: a fresh-eyes pass and three separate rounds of Copilot PR review found the RBAC backfill was
copied from a stale, superseded source function (would have granted Governance capabilities to
Administrator/Compliance Manager against explicit policy, and omitted the Executive role entirely),
the Consultant fix would have been silently neutralized by a stale file still in the migration
chain, and — most seriously — the register-based authorization split at the edge-function layer was
itself bypassable: caller-controlled `record_id`/`subpath`/`upsert` fields meant a narrower
permission grant didn't actually constrain where a file could be written in the shared storage
bucket. All findings were confirmed real and fixed before merge. The PR also absorbed reconciliation
of unrelated migration drift (four TAS evidence-index migrations, plus a QI campaign
`apply_migration` wrong-version bug) that CI's migration-drift-check surfaced mid-session — this was
explicitly directed to be folded into the same PR rather than split out.

**Branch:** `fix/rbac-consultant-scope-aug26` (merged; not yet confirmed deleted) · **Merge commit:**
`9b2308a7a` · **Migrations:** 4 new + 1 deleted · **Edge functions:** 1 (`register-evidence-manager`,
+2 new helper files) · **Frontend:** 1 file (`src/pages/registers/ofi/index.tsx`)

**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/798

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| `rbac_roles`/`rbac_role_capabilities` | 34 tenants' Administrators (and other roles) had zero or partial permissions | `init_tenant_rbac()` only runs lazily when an Administrator opens the Role Access settings screen — never at signup, never via a DB trigger. A hardcoded client-side Administrator fallback had silently masked the gap until PR #764 removed it. |
| `role_permissions` (Consultant) | Consultant got `role_no_upload_permission` uploading a trainer credential | `trainer_document_upload` was `true` for Administrator, `false` for Consultant — the one genuinely confirmed bug. |
| **(prior PR #766, not this PR)** `role_permissions` | — | #766's fix over-scoped the above into a blanket 15-feature Administrator-parity copy for Consultant, including `trainer_document_delete` (explicitly Administrator-only by its own `system_features.description`) and `organization_settings`/`user_management`. Never applied to production. Superseded here. |
| **(fresh-eyes finding)** `20260826051510` v1 (RBAC backfill) | Would have crashed on first run | Copied `t.id` instead of `t.tenant_id` from `public.tenants` — `tenants.id` doesn't exist as a queryable alias in that form; the loop's `SELECT t.id` was silently wrong syntax-wise (Copilot bot caught this specific line; fresh-eyes caught the broader staleness issue it stemmed from). |
| **(fresh-eyes finding)** `20260826051510` v1 | Would have granted Administrator/Compliance Manager Governance-category capabilities (e.g. `governance.apex` — Governing Person authority) to 34 tenants | Migration body was copied from `20260822023610_secure_init_tenant_rbac_canonical_roles.sql`, superseded four times since (`20260822024615`/`031356`/`032124`/`032132`) — the live function excludes Governance from Administrator's catch-all grant and strips it from Compliance Manager entirely; the stale copy didn't. |
| **(fresh-eyes finding)** `20260826051510` v1 | Would have omitted the `Executive` role (16-capability set, live at 75 tenants) from the 34 backfilled tenants | Same stale-source issue — Executive was added by `20260822031356` after the source file this was copied from. |
| **(fresh-eyes finding)** `20260826051601` v1 (Consultant fix) | Would have been a silent no-op | The original #766 migration (`20260825150500`, never applied to production) remained in the git tree with a filename version sorting *before* this one — on any clean replay it would run first and apply the full blanket grant, leaving nothing for the narrow fix to do. |
| **(Copilot finding, round 1)** `register-evidence-manager` | `trainer_document_upload` gated uploads to **all 14 registers** (ofi/ct/pli/avr_report/qi/tas_evidence/evidence_adc/etc.), not just trainer ones | Single hardcoded action-key check applied unconditionally regardless of which register was requested. |
| **(Copilot finding, round 1)** `register-evidence-manager` JSON `delete` action | Any active tenant member of any role could delete any file in any register | Delete branch checked only `tenant_members` membership — no permission/role check existed at all. |
| **(Copilot finding, round 1)** `src/pages/registers/ofi/index.tsx` | Upload button shown/hidden inconsistently with what the server actually allowed | `OFI_EVIDENCE_UPLOAD_ROLES` still mirrored the old `trainer_document_upload` role set after the edge function moved OFI to `document_management`. |
| **(Copilot finding, round 2 — most severe)** `register-evidence-manager` trainer upload gate | The register-based permission split was itself bypassable | `record_id`, `subpath`, and `upsert` are all caller-controlled with no shape/ownership validation, and several registers (including `trainer_credentials`) share the single `tenant-documents` storage bucket — a caller permitted only for `trainer_credentials` could still write to (or overwrite) an arbitrary path used by another register. |
| **(Copilot finding, round 2)** `20260826051601` comment | Asserted `trainer_document_delete` exclusion "preserves" an Administrator-only delete boundary without confirming it was actually enforced | Comment predated the delete-gate fix in the same PR — corrected to point at the enforcing code instead of just asserting it. |
| **(Copilot finding, round 2, disclosed not fixed)** `20260826053216` (TAS reconciliation) | Second `DELETE` statement's cleanup of `tas_evidence_scores` is a silent no-op | Its `EXISTS` check depends on `tas_evidence_provenance_maps` rows the first statement in the same file already deleted — confirmed to be a bug already present in what was live in production, not introduced by this PR. See "Still open" below. |
| **(surfaced by CI, unrelated to RBAC)** Migration drift check | 6 production migrations flagged with no matching git file (2 QI campaign, 4 TAS evidence index) | QI: `apply_migration` recorded the correct SQL under auto-generated wrong versions with an `_mcp` suffix instead of the file's real version (documented pre-existing tool bug) — ledger-repaired, no new file needed. TAS: genuinely applied out-of-band with no git file at all (`git log -S` returned zero hits under any filename) — reconciled as 4 new migration files under their exact original production version+name. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `cfabdea51` | Initial two migrations — RBAC backfill (v1, later found stale) and narrow Consultant fix (v1, later found neutralized). |
| `e8783fba1` | Fresh-eyes findings fixed — RBAC backfill rebuilt against live `init_tenant_rbac`; stale `20260825150500` deleted (`.github/allowed-deletions.txt`); `register-evidence-manager` register-key split added. |
| `1c0156143` | Reconciled 4 orphaned TAS evidence-index production migrations (no git file existed anywhere in history). |
| `b37792779` | Copilot round 1 — OFI client gate parity; delete-action permission gate added (was membership-only); `roleGate.ts` extracted to stay under the 500-line cap. |
| `a14ec3756` | Copilot round 2 — trainer upload path-binding bypass closed (`record_id`/`subpath`/`upsert` validation against real `tp_trainers` ownership); `pathUtils.ts` extracted; migration comment corrected. |
| `9b2308a7a` (merge) | PR merged to `main`. |

---

## Fixes shipped

### Database

**New migrations (6):**
- `20260826051510_backfill_missing_tenant_rbac_seeding.sql` — loops over every tenant with zero
  Administrator `rbac_role_capabilities` rows, seeds all 11 canonical roles + capability catalog,
  mirroring the *current* live `init_tenant_rbac` function exactly (verified via
  `pg_get_functiondef` immediately before both writing and applying). `DO UPDATE` on
  capability/role text (self-healing stale rows); role-capability grant preceded by a
  `DELETE ... WHERE r.is_system = true` scoped to the tenant, matching the live function's own
  semantics — **not purely additive**, disclosed as such in the PR description after the first
  draft's summary undersold it.
- `20260826051601_fix_consultant_trainer_document_upload_only.sql` — single-row `UPDATE` scoped to
  `trainer_document_upload` only, superseding the deleted `20260825150500`.
- `20260826052954_fix_tas_evidence_index_consultation_scope_v2.sql`,
  `20260826053051_cleanup_tas_evidence_index_cross_contamination.sql`,
  `20260826053216_invalidate_stale_tas_evidence_derivatives.sql`,
  `20260826053244_remove_unscoped_content_assets_tas_evidence_fallback.sql` — reconciliation of
  out-of-band production changes, unrelated to the RBAC/Consultant work, filed under their exact
  original production version+name per `supabase/migrations/CLAUDE.md`.

**Deleted:** `20260825150500_align_consultant_permissions_with_administrator.sql` (#766's original,
never applied to production) — registered in `.github/allowed-deletions.txt` with justification per
the CI guard for protected-file deletions.

**Applied to production** 26 Aug 2026 via the interim procedure (`execute_sql`, not
`apply_migration`/`db push`) for the two new-content migrations
(`20260826051510`/`20260826051601`); the four TAS files needed no execute step (already live —
that's what made them reconcilable). Ledger repair run by Brian from terminal:
`supabase migration repair --status applied 20260826051510` and `...051601`. Post-repair ledger
verified: both `version`/`name` pairs match the git filenames exactly. QI campaign drift
(`20260826051035`/`051108` → `020000`/`021500`) resolved the same way earlier in the session — no
new file needed, the correct git files already existed under different (correct) versions.

**Live verification after apply:**
- All 34 target tenants' Administrator capability count confirmed non-zero (35, the full
  non-Governance canonical set) via the plan's own verification query — none show zero.
- Consultant/Administrator `role_permissions` diff confirmed exactly 14 remaining differing
  features (the deliberately excluded set) — `trainer_document_upload` no longer appears in the
  diff, `trainer_document_delete` still correctly excluded.

### Edge functions

**`register-evidence-manager`** (`supabase/functions/register-evidence-manager/index.ts`,
+2 new files) —
- Upload/delete permission checks now use a register-scoped action key: `trainer_document_upload`/
  `trainer_document_delete` for the two trainer registers, `document_management` (an existing,
  already-granted-to-5-roles permission) for the other 12.
- Delete action gated for the first time (was membership-only).
- Trainer-register uploads reject client-supplied `subpath`/`upsert` outright and validate
  `record_id`'s leading UUID segment against a real `tp_trainers` row owned by the caller's tenant
  — closes the path-binding bypass described above. Verified against every current caller in the
  codebase (`TrainerDocumentsTab`, `MyCredentialsTab`, `useOnboardingCredentialForm`,
  `useTrainerMatrixEngine`) that none use `subpath` and all already pass a real trainer UUID as
  `record_id` — zero legitimate flow depends on what was closed off.
- Split into `roleGate.ts` (permission-check helpers) and `pathUtils.ts` (sanitizers, tenant/register
  path scoping) to stay under the repo's 500-line `index.ts` cap after the above additions
  (final: `index.ts` 449 lines, `roleGate.ts` 116, `pathUtils.ts` 79).

Deployed automatically on merge to `main`. Verified via Supabase MCP `get_edge_function`: live
version 109, all three files' content matches the merged git source exactly.

### Frontend

**`src/pages/registers/ofi/index.tsx`** — `OFI_EVIDENCE_UPLOAD_ROLES` updated to match the
`document_management`-based gate (Administrator, Compliance Manager, Consultant, Governing Person,
Regulatory Officer, Student Support Officer, Trainer/Assessor), replacing the stale
`trainer_document_upload`-based list.

---

## Review rounds

1. **Fresh-eyes adversarial review** (`fresh-eyes` skill, mid-session, pre-PR) — found the stale
   RBAC source, the Governance over-grant, the missing Executive role, and the neutralized
   Consultant fix. All fixed before opening the PR.
2. **`ci-gate`-adjacent manual checks** — Supabase branch DB confirmed `MIGRATIONS_PASSED` before
   merge; lint clean on every changed TS file at every commit.
3. **Copilot PR review, round 1** — 3 confirmed findings (cross-register auth gap, ungated delete
   action, OFI client gate mismatch). All fixed in `b37792779`.
4. **Copilot PR review, round 2** — 4 confirmed findings, most significantly the trainer upload
   path-binding bypass (record_id/subpath/upsert). All fixed in `a14ec3756`, except the
   `tas_evidence_scores` cleanup bug, which was investigated and explicitly disclosed as
   unfixable-via-migration rather than patched with an unverified guess (see below).
5. **Migration drift check (CI)** — surfaced 6 orphaned production migrations unrelated to this
   PR's original scope; reconciled in the same PR per Brian's explicit direction rather than
   deferred to a separate PR (a suggestion Copilot's round-2 review made but was overridden).

**Zero false positives across both Copilot rounds and the fresh-eyes pass** — every finding raised
was verified real against either the live database or the actual call-site code before being
treated as confirmed.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_6dEsE5VccmLCeePLi8Hsq7VWMBdE`, `state: READY`,
   `target: production`, commit `9b2308a7a` (exact merge commit), `githubCommitVerification:
   verified`.
2. **Edge functions** — `register-evidence-manager` v109 confirmed live and matching git source
   exactly via `get_edge_function` (all 3 files).
3. **Migrations** — `20260826051510`/`20260826051601` applied via `execute_sql` + `migration
   repair`; ledger verified post-repair. Four TAS files and two QI files already correctly
   reconciled (ledger matched git before/without needing an execute step).
4. **Worktrees** — not yet released in `active-work.md` as of this audit; still shows worktree A
   claimed on `fix/rbac-consultant-scope-aug26` — needs updating to unclaimed/`main` now the branch
   is merged.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Confirm a Consultant on an affected tenant can now upload a trainer credential and gets a
  clean 200, not `role_no_upload_permission`
- [ ] Confirm a Consultant cannot delete a trainer document (should get
  `role_no_delete_permission`)
- [ ] Confirm a Consultant attempting to pass a custom `subpath` or `upsert=true` for a trainer
  register upload is rejected with `trainer_subpath_not_allowed`/`trainer_upsert_not_allowed`
- [ ] Spot-check one of the 34 backfilled tenants' Role Access settings screen renders correctly
  with all 11 roles and no visibly broken/empty role card
- [ ] Confirm OFI evidence upload button visibility now matches actual upload success/failure for
  a Trainer/Assessor and a Regulatory Officer test account (previously mismatched)

---

## Still open / follow-up

- **`tas_evidence_scores` cleanup gap (from `20260826053216`)** — the reconciliation migration's
  second statement is a confirmed no-op (depends on rows its own first statement already deleted).
  This is a bug in what's *already live in production*, not something introduced by this PR, and
  the migration file is a required byte-for-byte reconciliation of that live state — not rewritten,
  per this repo's reconciliation discipline. Investigated whether an independent follow-up fix was
  derivable: `tas_evidence_scores.breakdown` has no reliable structured evidence-item reference
  (table has 3 rows total; the sampled row is an unrelated manual operational-override note, not
  scoring data) — the link needed to identify which rows require cleanup is not currently
  recoverable. Needs its own dedicated investigation if the stale scores actually matter
  operationally; not resolved here.
- **Worktree A registry** — needs releasing in `active-work.md` (see rollout item 4 above).
- **`pr-adversarial-review-aug22-aug26.md`** — the living doc this PR implemented; scheduled for
  deletion once this audit entry exists (per the living-doc workflow), not yet deleted as of this
  audit.
- **Plan A (Trainer Matrix cross-tenant leak, #672/#670)** — from the same living doc, already
  closed in the prior session, not part of this PR. Ledger repair for that fix
  (`20260824161000`) was verified complete before this PR's work began.
- **#662/#663 (AQF `non_compliant`→`warning` downgrade)** — explicitly parked in the source living
  doc pending Angela's regulatory-interpretation decision; not part of this PR's scope by design.

---

## Soak status

No feature flag. RBAC backfill is a one-time data correction (34 tenants, converges to canonical
state, safe to re-run — `DO UPDATE`/`ON CONFLICT DO NOTHING` throughout). Consultant permission
change and edge-function hardening are live for all tenants immediately. Highest-risk surface: any
Consultant actively using trainer document upload/delete in the days following this deploy — watch
Supabase edge function logs for `trainer_subpath_not_allowed`/`trainer_upsert_not_allowed`/
`trainer_record_not_found`/`role_no_delete_permission` reason codes, which would indicate either a
legitimate caller unexpectedly hitting the new restrictions (investigate) or the restrictions
correctly blocking an out-of-scope attempt (expected, not a bug).

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/798
- Merge commit: `9b2308a7aa6629027de4412309c9a1f38bdc72a7`
- Migrations: `supabase/migrations/20260826051510_*.sql`, `20260826051601_*.sql`,
  `20260826052954_*.sql`, `20260826053051_*.sql`, `20260826053216_*.sql`, `20260826053244_*.sql`
- Edge function: `supabase/functions/register-evidence-manager/` (`index.ts`, `roleGate.ts`,
  `pathUtils.ts`)
- Source living doc: `pr-adversarial-review-aug22-aug26.md` (workspace root)
- Active work ledger: `active-work.md` (worktree A registry row — needs post-merge update)
