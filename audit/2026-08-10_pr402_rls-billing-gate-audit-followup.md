# Audit — PR #402

> **Date:** 10 August 2026 (audit written); **Merged:** 10 August 2026
> **Scope:** Security & Architecture Audit follow-up (Angela, 3 Aug 2026) — verification, schema
> cleanup, and a Switch Role discoverability fix
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `security-audit-2026-08-03.md` (deleted
> post-audit, per workflow)

---

## Summary

Angela's 3 Aug 2026 audit flagged two headline findings (55 tables missing `billing_gate`, three
`*_dd_status` tables anon-readable) and same-day remediated most of it herself directly against
production. This PR's work was the verification pass on that remediation, plus two smaller items
that came out of a live screenshot Brian raised mid-session (an admin needing trainer-report access,
and the Switch Role control being effectively undiscoverable).

**Branch:** `fix/rls-billing-gate-audit-followup` (not yet deleted) · **Merge commit:** `06ca942e8`
· **Merged:** 10 Aug 2026 · **Migration:** `20260810024546`

## Findings verified, no fix needed

- **Billing-gate remediation (50 tables, `billing_gate_active_tenant` RESTRICTIVE policy):**
  cross-checked Angela's four remediation migration files against both the repo and
  `list_migrations` — versions and names match exactly, no drift. Live `pg_policies` query confirmed
  50 tables carry the policy, matching her reported count.
- **Two anon-callable SECURITY DEFINER functions** (`rpc_get_aot_determination`,
  `rpc_create_ci_item_from_consultation_decision`) flagged for the "body-supplied tenant_id + definer
  bypass" risk shape: read both bodies directly from the live DB — both independently verify caller
  membership (`sec.is_tenant_authorized`, `sec.has_tenant_role`) before touching data. False alarm.
- **`gov_dd_status`/`pli_dd_status`/`dd_package_status` anon-readable:** already closed by Angela same
  day as false alarms (static lookup tables, no tenant data). No re-work needed.
- **`auth_otp_long_expiry` advisor WARN:** confirmed intentional by design (Brian). Discarded.

## Fixes shipped in PR #402

### Drop unused `notes.tenant_id` column — migration `20260810024546`

`notes.tenant_id` (bigint, not the platform's uuid convention) had zero rows populated, no FK, and no
code references anywhere in `src/`, `supabase/functions/`, or other migrations. Real access control on
`notes` runs through `user_id` + `profiles.active_tenant_id`, not this column. Confirmed dead schema,
dropped via `ALTER TABLE public.notes DROP COLUMN IF EXISTS tenant_id;` (idempotent).

**Production apply:** applied via `execute_sql` (column absence verified post-apply). Ledger repair
(`supabase migration repair --status applied 20260810024546`) handed to Brian to run from terminal per
the interim migration procedure — not yet confirmed back as of this audit's writing.

### Switch Role discoverability fix

Root cause: "Switch Role" was a plain, unstyled dropdown item inside the profile avatar menu in
`GlobalTopbar.tsx`, only rendered for multi-role users, with no visual signal it existed. Fix: added a
persistent pill in the topbar (current role + swap icon) that opens `SwitchRoleDialog` directly,
visible whenever `hasMultipleRoles` is true, with a tooltip on hover.

**Cursor Bugbot follow-up (same PR):** flagged the pill (a `Badge`/`div` with `onClick` only) as not
keyboard-accessible — no focus, no Enter/Space activation. Verified against HEAD (confirmed, not a
false positive) and fixed: added `role="button"`, `tabIndex={0}`, an `onKeyDown` handler for
Enter/Space, an `aria-label`, and a `focus-visible` ring.

### Trainer-report access for admins (investigated, no fix needed)

`cmargaritis@ahmrc.edu.au` (Aboriginal Health and Medical Research of NSW — a real, live, non-demo
tenant) already had `Trainer/Assessor` in `tenant_members.roles` and an active `tp_trainers` row.
Database setup was already correct; if he still can't submit a trainer report, that's a narrower,
separate bug in the submission flow itself, not a missing role/profile setup. Not investigated further
in this PR — flagged for a live repro if it recurs.

### Seed data — multi-role QA account

Every seed account in `seed.sql` had an empty `roles: []` array, so no branch DB had an account that
could exercise the Switch Role pill without touching a real tenant's login. `admin@complyhub-seed.com`
now holds `["Administrator","Trainer/Assessor"]` plus a matching `tp_trainers` row, mirroring the
`cmargaritis` case. Added matching `seed-qa.sql` verification checks (role count, trainer row exists).

**Known limitation:** this branch's own preview branch DB (`kncavuitrtylfpgkoryy`) could not be reset
to pick up the new seed state — `supabase db reset` failed with `ERROR: out of shared memory
(SQLSTATE 53200)` while dropping the existing schema's ~thousands of objects in one pass. This is a
branch-DB compute-tier capacity issue, not caused by this PR's changes; flagged for Carl/Dave, not
resolved here. The seed change will take effect on any *newly created* branch DB going forward.

## Still open / follow-up

- Migration ledger repair for `20260810024546` — awaiting Brian's terminal confirmation.
- Branch-DB reset shared-memory failure — infra capacity issue, needs Carl/Dave.
- `cmargaritis` trainer-report submission — re-open only if he reports it's still broken after a live
  test; DB setup itself is confirmed correct.
- Low-priority cleanup ticket for `notes` table's other legacy quirks — none identified beyond the
  dropped column; none outstanding.

## Soak status

N/A (schema cleanup + frontend UX fix, not a behavior-soak-sensitive change).
