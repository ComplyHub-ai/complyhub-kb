# Audit - PR #459: Migration drift reconciliation (14-16 Aug 2026)

> **Date:** 17 August 2026
> **Scope:** Reconciliation of production migration drift accumulated 14-16 Aug 2026, plus two older orphaned migrations (June 2026) surfaced during CI/branch-DB validation, plus security findings from Cursor Bugbot and Vercel bot review
> **Project:** `gdwhlstfguxarnxasrrs`
> **Branch:** `fix/migration-drift-reconciliation-aug14-16`
> **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/459
> **Merge commit:** `783cdb766`
> **Merged:** 17 August 2026

---

## Summary

PR #459 reconciled ~64 production migrations that had been applied directly to the database between 14-16 August 2026 without matching git files, plus two further orphaned migrations from June 2026 (`sso_report_reminders`, `governance_clause_map`) that surfaced only when branch-DB validation failed on tables those June changes had created. The branch went through several rounds of Cursor Bugbot / Vercel bot review; every finding was independently verified against the live database before being treated as real, and each confirmed finding was fixed on the branch.

Post-merge, production was found to be running the *original, unfixed* versions of several objects this PR touched — because their migration versions were already recorded as "applied" in the production ledger from before this PR existed (that's what made them drift in the first place), so editing the git file after the fact did not retroactively re-run anything. Each fix was applied directly to production via Supabase MCP `execute_sql`, verified live, and the two genuinely-new migration versions were then repaired into the ledger.

---

## Migration drift reconciliation

- ~62 migrations dated 14-16 Aug 2026 that had been applied directly to production were captured as proper git migration files (content taken verbatim from `supabase_migrations.schema_migrations.statements`).
- Two additional orphaned migrations from June 2026 were found and reconciled after causing branch-DB failures:
  - `20260622231029` — `create_sso_report_reminders_table` (verbatim historical reconciliation; a *second*, completely untracked correction to this table's `billing_gate` policy — found only by live-auditing production — was captured in a separate new migration, `20260817091500`, rather than folded into the historical file).
  - `20260622235226` — `recreate_governance_clause_tables` (verbatim historical reconciliation; live-audited against production with no secondary drift found).
- Pruned both resolved entries from `.drift-baseline.txt`.
- Two follow-up "skip the table on a branch DB" guards were initially added to work around the two June tables, then removed once each table was properly reconciled with a correctly-ordered migration file, since the guards became unnecessary.

---

## Security findings (Cursor Bugbot / Vercel bot, verified before fixing)

Each finding below was checked against the actual migration file and/or live database state before being treated as real — none were fixed on the bot's word alone.

**Cron jobs (branch-DB portability, not a production functional gap):**
- Three migrations (`tga-nightly-sync-local-time`, `daily-invite-cleanup-and-summary`, `weekly-compliance-score-snapshot`) used a hardcoded numeric `pg_cron` job ID, which only exists on production — any fresh branch/test database has no cron jobs at all, so these failed with "Job N does not exist". Rewritten to look the job up by name instead, which works on both.
- Two similar cron migrations already had a safety guard and needed no change.

**Billing:**
- `billing.enforce_lockout`'s auto-unlock logic for invoice-billed tenants was missing one of the two lockout reasons it needed to recognise (`%subscription%`), meaning a paid invoice-billed tenant locked out with that specific reason could never be automatically released. Fixed.

**Storage (evidence documents / trainer credentials):**
- The UPDATE policy for the `ofi-evidence` and `evidence` buckets let a file's uploader move/rename it into a different tenant's folder while still passing the check, because the "owner" branch had no folder requirement. Fixed by requiring the owner branch to also match a folder the owner belongs to.
- INSERT/SELECT policies on those same buckets, and the `trainer-credentials` bucket's tenant closure, did not require the caller's tenant membership to be active — a deactivated member could still read/write. Fixed by adding the active-status requirement, consistent with the rest of the file.

**Privileged RPCs:**
- `persist_tga_scope_items` had no role restriction beyond bare tenant membership, so any seat (e.g. Student, Employer) could edit training/scope data; a defensive but effectively dead "treat missing JWT claims as authorized" fallback was also removed, since no legitimate caller depended on it. Fixed with a proper operational-role gate.
- `sa_delete_user(uuid, text)` had no authorization check at all and was executable by any authenticated user, who could use it to wholesale-delete another user's account, tenant memberships, and related records. Revoked `authenticated`/`PUBLIC` execute.
- `admin_convert_trial_to_paid(uuid, text)` (the 2-argument overload only) had no authorization check at all and could convert any tenant to a paid plan for free; its properly-guarded 3-argument sibling is the one actually used by the app. Revoked `authenticated`/`PUBLIC` execute.

**Branch-DB guard gaps (same class as the June table issue above, different tables):**
- A "restrictive SELECT closure" migration for 18 student-data tables had no guard for `trainer_unit_mapping_suggestions`, another table that only ever existed in production. Added the same "skip if the table doesn't exist yet" guard used elsewhere.
- A similar closure for 27 more tables was missing the same guard for `sso_report_reminders`; fixed the same way before that table was properly reconciled (see above).
- A migration creating `trainer_monthly_report_attachments` never got its intended access-restriction policy applied on a fresh branch DB, because the migration meant to add it ran (in file order) before the table existed yet. The original file is already merged to `main` and could not be edited (migrations are append-only), so a new follow-up migration was added to apply the same restriction directly.

**CI false positive:**
- CI's migration-guard check failed on the `governance_clause_map` reconciliation file because a code *comment* (copied verbatim from the original production SQL) happened to contain the literal phrase "SECURITY DEFINER" — the guard does a plain text search and doesn't distinguish comments from code. Reworded the comment (no functional change) to avoid the false trigger.

---

## Production execution and verification (post-merge)

Applied via Supabase MCP `execute_sql` (not `apply_migration`, not `supabase db push`, per the documented interim procedure), and each verified live afterward:

| Fix | Pre-apply live state | Post-apply verification |
|---|---|---|
| `persist_tga_scope_items` role gate | No authorization check at all in production (worse than the pre-fix git state) | Role gate confirmed present |
| Storage policies (ofi-evidence/evidence) | UPDATE/DELETE policies did not exist in production at all; INSERT/SELECT missing active-status filter | All 8 policies confirmed present and correct |
| `trainer_credentials_tenant_closure` | Missing active-status filter | Confirmed present |
| `billing.enforce_lockout` | Missing `%subscription%` unlock branch | Confirmed present |
| `sa_delete_user` revoke | `authenticated` could execute | Confirmed revoked |
| `admin_convert_trial_to_paid(uuid,text)` revoke | `authenticated` could execute | Confirmed revoked |
| Cron jobs 1/6/29 | Already matched the fix | No change needed |
| `governance_clause_map` policies | Already matched the reconciliation file verbatim | No change needed |
| `trainer_monthly_report_attachments` closure | Already present in production (gap was branch-DB only) | Confirmed present, re-applied as a safe no-op |
| `sso_report_reminders` `billing_gate` | Already the corrected tenant-scoped version | Confirmed unchanged, re-applied as a safe no-op |

Two migration versions had no ledger entry at all prior to this PR and were repaired after Brian ran, from `rto-compass-hub-C`:

```text
supabase migration repair --status applied 20260817090000
supabase migration repair --status applied 20260817091500
```

All other versions touched by this PR were already recorded as "applied" in the production ledger from before this PR existed — no repair was needed for those; only their SQL content needed to be brought up to date, which was done via `execute_sql` as detailed above.

Post-apply `get_advisors` (security) check confirmed no new issues introduced by these changes; the two remaining "authenticated-executable SECURITY DEFINER" notices for `persist_tga_scope_items` and `admin_convert_trial_to_paid`'s 3-arg overload are expected (both are the intentionally-callable, properly-gated versions).

---

## Verification performed

- `npx tsc --incremental --noEmit` / lint not applicable (SQL-only changes across most commits)
- CI migration-guards job (filename format, RLS-on-create-table, tenant_id index, `SECURITY DEFINER` search_path)
- Manual verification of every Bugbot/Vercel bot finding against the actual migration file and/or live Supabase state before fixing
- Live-audit of reconciled tables' policies against production before writing each reconciliation file
- Post-merge production verification of every applied fix (see table above)
- `get_advisors` (security) spot-check on the specific objects touched

---

## Follow-up

- The broader ~500-entry historical migration drift backlog (`supabase/migrations/.drift-baseline.txt`) remains a separate, dedicated reconciliation project — not addressed here beyond the two entries this PR's branch-DB failures surfaced.
- `20260622231029` (`sso_report_reminders` creation) and `20260817091500` (its `billing_gate` correction) must always be applied together, in version order, if ever run against a database that doesn't already have the corrected policy — the first file's verbatim historical SQL alone would reintroduce the old, insecure `billing_gate`.
