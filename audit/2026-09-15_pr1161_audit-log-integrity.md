# Audit — PR #1161

> **Date:** 2026-09-15; **Merged:** 2026-09-15 07:13:18 UTC  
> **Scope:** Close the forged security-audit logging paths identified in Issue #1128.  
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — tracked on the PR branch and active-work ledger

---

## Summary

Issue #1128 found that signed-in users could call either public `log_security_audit_enhanced` overload and supply arbitrary event names, severity, and payload. The same roles also retained direct INSERT privilege on `public.audit_logs`. The result was an audit trail that could be polluted or forged by a browser caller.

PR #1161 kept both function signatures for compatibility, but restricted execution to `service_role`, added a service-role body gate, and removed browser table-write privilege. The existing Super Admin tenant-update audit event was preserved by writing its fixed event inside the already-authorized `sa_update_tenant` function.

The PR changed two files: one migration and one focused regression-test file, adding 267 lines with no deletions. It merged successfully, and the Supabase migration workflow applied the migration to the live project.

**Branch:** `fix/issue-1128-audit-log-integrity` · **Merge commit:** `754a41441d41a03bb523b5eb2795e3eeb77ddda0` · **PR:** [#1161](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1161)

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Security audit RPC | Any signed-in user could submit a fabricated security event. | Both `SECURITY DEFINER` overloads were executable by `authenticated` and accepted caller-controlled event data without an internal-caller check. |
| Audit table | A browser role could attempt direct audit-row insertion. | `anon` and `authenticated` retained table INSERT privileges and an authenticated INSERT policy. |
| Super Admin tenant audit | Locking the logger alone would have broken the tenant-update audit event. | `sa_update_tenant` ran as a user-JWT caller but called the now-restricted logger. |

---

## Commit history

| Commit | Summary |
|---|---|
| `b0d2102b637df4831c4f1ff986ec0afa1425cfad` | Restrict audit logging to trusted service callers, close direct browser INSERT access, preserve the Super Admin tenant-update event, and add regression coverage. |

---

## Fixes shipped

### Database

- `20260915064920_issue_1128_audit_log_integrity.sql` now gates both logger overloads to `service_role`, revokes browser execution, revokes browser INSERT privilege on `public.audit_logs`, removes the obsolete INSERT policies, reloads PostgREST, and aborts if the final privilege surface is wrong.
- `sa_update_tenant` writes the fixed `tenant_updated` audit event directly inside its existing authorization boundary instead of calling the restricted logger.
- The migration was applied by the successful [Apply Supabase Migrations workflow](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34940608848). The live migration ledger contains version `20260915064920` with name `issue_1128_audit_log_integrity`.

### Tests

- `tests/migrations/issue1128AuditLogIntegrity.test.ts` covers both overload gates, browser privilege removal, preservation of the tenant-update event, PostgREST reload, and migration postcondition checks.
- Focused test result: 4/4 passed. ESLint, Prettier, and whitespace checks also passed.

### Edge functions

None touched; none redeployed. The existing service-role Edge Function callers remain the intended internal callers.

---

## Review rounds

1. **Issue and live-state recon** — confirmed both live overloads, their ACLs, the direct `audit_logs` INSERT path, the live `sa_update_tenant` caller, and the service-role Edge Function callers.
2. **Migration review** — checked exact overload signatures, SECURITY DEFINER search paths, idempotent revoke/drop statements, PostgREST reload, and fail-closed privilege assertions.
3. **Focused regression test** — 4/4 tests passed.
4. **Mechanical checks** — ESLint, Prettier, and `git diff --check` passed.
5. **GitHub CI** — CI and Apply Supabase Migrations succeeded for merge commit `754a41441d41a03bb523b5eb2795e3eeb77ddda0`.

---

## Production rollout and verification

1. **Supabase migration** — applied successfully by the automatic migration workflow. Live checks confirm both overloads are still `SECURITY DEFINER`, deny `anon` and `authenticated`, allow `service_role`, contain the service-role gate, and leave authenticated without table INSERT privilege.
2. **Super Admin tenant update** — live function inspection confirms it writes to `audit_logs` directly and no longer calls the restricted logger.
3. **Vercel production** — no frontend source was changed. Vercel connector verification was unavailable because the connector was not connected; no Vercel deployment is claimed.
4. **Worktrees** — worktree B was confirmed clean, reset to `origin/main` at merge commit `754a41441`, and released as `standby/worktree-B` in `active-work.md`.

The unrelated automated Version bump workflow failed because its push to `chore/version-bump` was rejected as non-fast-forward. It did not affect this PR or the Supabase migration. The Code Quality workflow was still in progress when this audit was written and is not treated as a required success here.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] As an authenticated browser user, confirm both direct RPC calls fail closed and do not create audit rows.
- [ ] As an authenticated browser user, confirm direct INSERT access to `public.audit_logs` is denied.
- [ ] Trigger a Super Admin tenant update and confirm exactly one fixed `tenant_updated` audit event is recorded.
- [ ] Trigger the relevant service-role Edge Function paths and confirm their trusted audit events still record successfully.

These checks were not performed through a browser or user-role session during this audit.

---

## Still open / follow-up

- Several frontend security-telemetry callers still attempt the now-denied RPC and swallow the resulting error. They no longer have write access, but should be removed or routed through an authenticated internal telemetry path in a separate scoped change to avoid noisy failed calls.
- The broader Supabase security-advisor findings were outside Issue #1128 and remain separate work.

---

## Soak status

No feature flag was introduced. Risk tier: high for audit integrity. Watch the service-role email/webhook audit paths and Super Admin tenant-update audit records after the migration; browser telemetry failures should be treated as expected until the follow-up cleanup is addressed.

---

## References

- Issue: [#1128](https://github.com/ComplyHub-ai/rto-compass-hub/issues/1128) — closed automatically by the merged PR.
- PR: [#1161](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1161)
- Merge commit: `754a41441d41a03bb523b5eb2795e3eeb77ddda0`
- Migration workflow: [run 34940608848](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34940608848)
- Source commit: `b0d2102b637df4831c4f1ff986ec0afa1425cfad`
- Active work ledger: `active-work.md`
