# Audit — PR #358, #361, #363

> **Date:** 4 August 2026
> **Scope:** 3 merged PRs on `rto-compass-hub`, one session — a governance-meeting RLS bug fix (with
> a data backfill and two Bugbot-found follow-up fixes folded in), plus a Documents Register bulk
> download feature and a governance Action Follow-up assignee feature (bundled together per Brian's
> instruction to keep them on one branch), plus a scoping fix on that new assignee feature.
> **Reviewer:** Cursor Bugbot (automated, PR #358 only) — findings verified and fixed before merge
> **Merge authority:** Brian (standing full merge authority — no Carl/Angela sign-off required per
> explicit instruction this session: "we do not flag carl, we own complyhub")

---

## Summary

Started from a user-reported bug: the Governance Meeting Manager's "Action Follow-up" tab showed
"No governance actions" / "No Action Items" for a meeting that clearly had 10 action items visible in
its own History → Action Items view. Root-caused to an RLS policy inconsistency on the shared `tasks`
table, fixed platform-wide (not just for this one meeting), backfilled the missing data for every
affected meeting found, and — while implementing a natural follow-up feature (letting users assign an
owner to an action item) — found and fixed a second, unrelated bug in the assignee list's scoping.

**Merge order:** #358 → #361 → #363 (PR #360 was opened, then closed and its commit moved into the
branch that became #361, per Brian's explicit instruction to keep related work on one branch).

---

## PR #358 — Fix tasks RLS blocking governance/register-linked task creation across tenants

**Branch:** `fix/governance-action-tasks-tenant-context-rls` (deleted post-merge) · **Merged:** 4 Aug 2026

### Root cause

`tasks_insert`'s RLS policy required `tenant_id = sec.current_tenant_id()` — the caller's single
"active workspace" at that moment. Every sibling table that creates a *linked* task
(`governance_meeting_minutes`, `gov_register`, `ci_register`, `ct_register`, `whs_register`,
`air_register`) instead authorizes writes via `sec.has_tenant_role(tenant_id, [...])` — a membership/role
check on the *explicit* tenant_id, independent of whichever workspace is currently active. Confirmed
`sec.has_tenant_role()` is genuinely membership-based (queries `tenant_members` directly), so this was a
real, verified inconsistency, not a guess.

For a Consultant/Consultant Assistant working across multiple client tenants, this let the source
record (meeting minutes, register entry) save successfully while every task insert in the same batch
failed RLS silently — caught and swallowed per-item in the calling code (`useGovernanceActionSync.ts`),
with the calling flow's own success toast never checking whether 0 or N tasks were actually created.
Result: action items visible in a meeting's own History tab, invisible in Action Follow-up and the
assignee's task list, with no error ever surfacing to the user.

Confirmed via live data — not assumed — across **5 affected governance meetings** spanning different
tenants and Nov 2025 – Aug 2026 (all had `governance_meeting_minutes.action_links = '{}'` despite having
`actions_json`), plus intermittent gaps in `ci_register` (188 rows / 84 tasks), `ct_register` (17/12),
`air_register` (6 qualifying rows / 0 tasks), matching the same signature.

**Explicitly ruled out** (checked, not assumed) as sharing this bug: `ien_register` and `tcr_register`
(via `trainer_matrix_credentials`) — both already use the same strict `current_tenant_id()`-style gate
on both sides, so no disagreement is possible there. `avr_register` was *initially* wrongly grouped with
those two (same wrong justification), corrected in the Bugbot follow-up below.

### Fix

Migration `20260804120000_fix_tasks_insert_tenant_context_gate.sql` — adds a scoped `OR` exception to
`tasks_insert`, one clause per confirmed module, each reusing the **exact** role array already granted
by that module's own source-table policy (verified against live `pg_policies`, not invented), so no
caller gains a `tasks` permission they didn't already have on the linked record. Ordinary/custom task
creation (no `linked_module`) is unaffected.

### Bugbot follow-up (same PR, before merge)

Two findings from Cursor Bugbot, both verified against the live DB before fixing:

1. **`avr_register` wrongly excluded** — its own INSERT policy (`avr_reg_insert`) is
   `has_tenant_role`-based, same vulnerable pattern as ci/ct/whs/air, just dormant in production (0 of
   119 rows ever had the qualifying `action_owner` field set). Added to the exception, with an extra
   `sec.is_tenant_member(tenant_id)` clause mirroring `avr_reg_insert_mirror`'s broader
   any-member-as-own-creator policy.
2. **`gov_register_linked_document_id_fkey` blocks document deletion** — added in the already-merged
   PR #357 with a bare `REFERENCES` (default `NO ACTION`). Confirmed `gov_register`'s *other* soft-link
   columns (`linked_ofi_id`, `linked_ci_id`, `linked_risk_id`) have no FK at all, so this one was the odd
   one out. Fixed via a **new** migration (append-only — never edit an already-merged file):
   `20260804130000_gov_register_linked_document_id_on_delete_set_null.sql`, switching to
   `ON DELETE SET NULL`.

### Data backfill (production, applied directly — no migration file, pure data repair)

Created the missing `tasks` rows for all 5 already-broken meetings (40 tasks total), matching exactly
what the code would have produced had the original insert succeeded: `title`/`description` from
`actions_json`, `task_type='governance_action'`, no `assigned_to` (the app never sets one on creation
either), `due_date` from the action's own date field, or — for the one meeting whose dates were fuzzy
text ("This week", "Immediate & ongoing") — computed via the same priority-based fallback the app's own
code already uses (critical +7d / high +14d / else +30d from the meeting date). Also updated each
meeting's `governance_meeting_minutes.action_links` to point at the new task IDs. Verified after:
`actions_count == tasks_count` for all 5 meetings.

### Branch-DB check — pre-existing, unrelated failure (documented, not fixed)

The PR's branch-DB provisioning check failed on a duplicate-key error for migration version
`20260618021900` (an unrelated, months-old migration). Confirmed this is the platform-wide ~2,000-version
ledger drift already documented in `supabase/migrations/CLAUDE.md` — production's own ledger already has
this exact version correctly recorded, `main`'s own persistent branch DB has shown `MIGRATIONS_FAILED`
since 1 July 2026, and two other unrelated open PRs showed the identical failure. Not caused by this PR,
not fixed here — merged on the merits of every other check passing, per the doc's own explicit guidance
not to fold that reconciliation into a normal PR.

### Production apply

Both migrations applied via `execute_sql` (not `apply_migration` — file already exists in repo; not
`supabase db push` — currently broken platform-wide per documented interim procedure). Verified live:
`tasks_insert`'s `with_check` and `gov_register_linked_document_id_fkey`'s `ON DELETE SET NULL` both
match the merged files exactly. Ledger repaired via `supabase migration repair --status applied` for
both versions (run by Brian), confirmed both `version` and `name` recorded correctly.

**Files changed:** 2 new migration files only (no application code).

---

## PR #361 — Bulk document download + governance Action Follow-up assignee control

**Branch:** `featuresandbugsfromAJ&Ezel` · **Merged:** 4 Aug 2026

Two unrelated features bundled onto one branch per explicit instruction (originally split across two
branches; the assignee-control commit was cherry-picked onto this branch and its original PR #360
closed once the instruction was clarified).

### Bulk document download

Adds a "Download" action to the Documents Register's floating bulk-selection toolbar. Downloads every
selected document sequentially (300ms gap between each — browsers can silently drop rapid-fire
programmatic downloads with no gap) via the existing `document-file-manager` edge function path, same
as single-document download. Skips documents with no `file_path`, reports succeeded/failed/skipped
counts separately. New `downloadDocumentFiles()` helper in `documentFiles.ts`, mirroring the existing
`deleteDocumentFiles()` batch pattern.

### Action Follow-up assignee control

The Assignee column in the governance Action Follow-up tab was display-only — no way to set it, the
only path was the separate Tasks dashboard page. Added an inline dropdown matching the existing Action
Status dropdown's UX pattern, backed by `useTenantMembersList` (already used elsewhere in governance).
No RLS change needed — `tasks` UPDATE policy already permits any tenant member, including cross-tenant
Consultants, to set an assignee.

**Files changed:** `BulkActionToolbar.tsx`, `DocumentsTable.tsx`, `bulkActionToolbarLogic.ts`,
`documentFiles.ts`, `DocumentsRegister.tsx`, `ActionFollowupTab.tsx`. No migrations.

---

## PR #363 — Scope Action Follow-up assignee dropdown to real tenant staff + named consultants

**Branch:** `fix/action-followup-assignee-tenant-scope` (deleted post-merge) · **Merged:** 4 Aug 2026

Follow-up bug found immediately after #361 shipped, live on Indie Education: the new assignee dropdown
listed every `tenant_members` row for the tenant, including Consultant-role rows that represent
firm-wide portfolio access, not real client-account staff — confirmed live, Indie Education had 19
members total: 8 real client staff, plus 11 rows with role "Consultant" that were essentially the entire
Vivacity/ComplyHub team (including Brian himself), most with zero actual connection to that specific
client.

**Investigated and rejected** a schema-level fix first: found and checked `is_internal_staff` (a real
column, cleanly separating 5 internal engineering/ops-only accounts — RJ, AJ Delostrico, Beverly
Pastor-Ambo, Sharwari Rajurkar, Nova Canto — from everyone else), but confirmed it does *not* fully solve
the problem: Angela, Gemma, Tanya, and Khian (Brian) all have `is_internal_staff = false`, same as the
legitimate account consultants Kelly and Ezel, so filtering on that field alone would still over-include.
Checked for a dedicated "assigned consultant per client" table/field (`consultant_affiliates`,
`tenants.owner_id`/`parent_consultant_org_id`) — none exist; `consultant_affiliates` only tracks
commission relationships, not account assignment.

### Fix (two layers)

1. **`useTenantMembersList`** now excludes `is_internal_staff = true` rows entirely — a correct, tenant-
   wide fix with no caveats, since those accounts should never appear in *any* people-picker. This also
   fixes `MeetingSetupTab`'s default-attendee list, which shares this hook.
2. **`ActionFollowupTab`** additionally excludes the Consultant/Consultant Assistant role by default (all
   real client roles always show), re-including a consultant only if their name is found as a
   case-insensitive substring somewhere in that specific meeting's own `governance_meeting_minutes.
   actions_json` text (e.g. "Kelly Xu (Vivacity) to share..." → matches tenant_members full_name
   "kelly"). Scoped per-meeting, not tenant-wide, since no structured per-client consultant-assignment
   field exists to key off instead.

**Known limitation, flagged to Brian explicitly before merge:** this is a text-substring heuristic
against AI-generated free text, not a hard guarantee — it will miss a consultant if the AI phrases an
action without naming them, and could rarely over-match on very short/common names. Accepted as the
pragmatic fix given no structured alternative currently exists.

**Files changed:** `useTenantMembersList.ts`, `ActionFollowupTab.tsx`. No migrations.

---

## DB/RLS impact (session-wide)

- `tasks_insert` policy — widened by exactly 6 scoped `OR` clauses (PR #358), each independently
  verified against the exact role list its linked source table already grants. No change to the default
  `current_tenant_id()` gate for ordinary task creation.
- `gov_register_linked_document_id_fkey` — `NO ACTION` → `ON DELETE SET NULL` (PR #358 follow-up).
- No RLS changes in #361 or #363 — both were read/filter-scope changes on the frontend only.

## Not yet tested

No browser/DevTools access in this session for #361/#363's UI flows — verified via source trace, live
DB queries confirming the exact data shape at each step, `tsc --noEmit`, and `eslint --max-warnings=0`,
not a live click-through. Brian to confirm live: Indie Education's Action Follow-up tab shows all 10
backfilled items with correct due dates; assignee dropdown shows only real client staff plus Kelly/Ezel
(not Angela/Gemma/Tanya/Khian, not the 5 internal-staff accounts); bulk download on Documents Register
downloads multiple files with correct skip/fail reporting.
