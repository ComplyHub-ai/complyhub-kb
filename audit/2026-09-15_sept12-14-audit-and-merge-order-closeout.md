# Audit — Sept 12–14 audit and merge-order closeout

**Audit date:** 15 September 2026  
**Repositories:** `rto-compass-hub`; `complyhub-kb`  
**Scope:** Closeout of the session-scoped `sept12-14-audit-and-merge-order.md` review, including its findings, merge sequence, production-drift reconciliation, and subsequent replacement PRs.

## Summary

The Sept 12–14 review identified a production/app mismatch, a static-only CI safety net, migration drift, two latent customer-impacting defects, several security and billing weaknesses, and a merge process that accepted duplicate or empty work.

The principal remediation sequence was completed through 15 September 2026. The canonical migration reconciliation landed, duplicate PRs were superseded, the occupation-mapping and prediction-history defects were fixed, risk-to-meeting linking was repaired, billing/webhook protections were tightened, the TAS scope consumer was rebuilt against current `main`, Risk Register v2 was rebased and merged, and Risk Intelligence Phase 3 was reviewed and merged.

This entry records the verified closeout state. A merge is not treated as a frontend production deployment: the known Vercel account-level block remained in place, so no post-11-September Vercel production deployment is claimed here.

## Source review and evidence boundary

The source working document was a read-only review of `rto-compass-hub` from 12–14 September, cross-referenced against the open PR set, the Git object database, live Supabase metadata/data, and the Vercel deployment state available at the time. Its latest update recorded the #1123 finding as resolved by replacement PR #1152.

Current repository evidence was then checked against `origin/main`, GitHub PR metadata, the active-work ledger, and the recorded Supabase migration workflow/live-verification results. The code repository’s current branch is `standby/worktree-A` at `fe6db1b542d5b41d7f0193449868628e837ef5b8` (`origin/main`). The KB repository was refreshed from `origin` and was already at `bc706b83eda6b41050f44491fe9d5d3ab6db74f6`.

## Findings and remediation

### Production and CI

- Vercel production remained blocked at the account level; no application deployment after the 11 September baseline is recorded in this closeout.
- Supabase migrations continued to apply independently of Vercel. This created a real database/app version gap and required migration-ledger reconciliation before dependent PRs could safely proceed.
- The review found that CI had no Vitest job and did not execute SQL. Static checks therefore could not establish runtime behavior, database semantics, or caller-path safety. The follow-on local-first review-gate work is carried forward in the active-work ledger; GitHub Actions should remain limited to inexpensive sentinel checks until the local replay gate is established.

### Customer-impacting defects

- **D1/D2 — additive workforce mapping:** PR #1136 (`64ea1839d`) added a dedicated additive occupation RPC, preserved intentional full-list replacement semantics, changed the sandbox modal to use the additive path, and forwarded `qualificationCode`. The live verification recorded 144 tenant-scoped builds with matching UI/build qualification codes.
- **D3 — prediction history key mismatch:** PR #1136 restored UUID `row.id` at the three history call sites. PR #1103 was separately reviewed against current `main`; its dead duplicate prediction panel and dedicated unused hook were removed in commit `648935852` before PR #1103 merged as `b74229555c`.
- **Risk-to-meeting linking:** replacement PR #1138 (`42b1f1c95`) changed the invalid `linked` status to the database-valid `pending` status. PR #1131 was closed as superseded.
- **TAS scope authority:** replacement PR #1153 (`2437e4eaf`) rebuilt the consumer change against current `main`, used the Australia/Sydney business date, and preserved packaged-only derived units. PR #1132 was closed as superseded.

### Migration drift and merge sequencing

- PR #1133 (`eeca4b60a`) became the canonical reconciliation for the 15 direct-to-production migrations. The recorded comparison found 12 byte-identical files and three safer, documented idempotency differences; no unstamped production drift or edge-function drift was found in the reviewed set.
- PR #1130 and PR #1124 were superseded and closed. PR #1137 (`6e623902d`) replaced #1125 and hardened exact version/name matching plus helper/monitor failure handling. The recorded live reconciliation checked 117 migration rows against 117 matching files.
- The migration workflow succeeded for the reviewed replacement paths, including `20260914044341` (workforce mapping), `20260914120000` (TAS scope), `20260914074318` (billing writers), `20260915012232` (Risk Intelligence Phase 3), and the reconciled invoice migration `20260913113000`.

### Billing and security

- PR #1122 (`e6b69f0dc`) stopped webhook code from discarding RPC errors and corrected the security-audit RPC path; the reviewed `.single()` calls were made safe and new audit errors use structured logging.
- PR #1140 (`249c694ee`) replaced #1127 and made `create_paid_invoice` idempotent on the canonical Stripe invoice identifier, including race handling and the recorded service-role-only ACL/search-path posture. PR #1127 was closed as superseded.
- PR #1141 (`3c506f623`) delivered the current internal-caller protection for the charge writer; PR #1116 was closed as superseded.
- Replacement PR #1152 (`3a37aa1fd`) replaced #1123. It targeted the live `extend_tenant_trial(uuid, integer, text)` overload, applied the paid-subscriber guard, added body gates for server-only writers, and hardened ACLs. The automatic Supabase workflow succeeded and the recorded live function/ACL checks passed.
- Earlier bot-caught security defects were confirmed and fixed: null-safe `sec.is_internal_caller()` behavior and the missing `SECURITY DEFINER` keyword on `billing.apply_revenue_audit_actions`. These fixes were treated as evidence that runtime/security review cannot be delegated to source-text assertions alone.

### Governance and risk-intelligence delivery

- PR #1134 (`5d788d4b3`) and PR #1135 (`b39fffed4`) completed the public-holiday avoidance implementation path that the source review had found incomplete. The merge is recorded; frontend production availability still depends on resolving the Vercel block and completing post-deploy verification.
- PR #1103 (`b74229555c`) merged the rebased Risk Register v2 frontend after dead-code cleanup and current-main verification.
- PR #1114 (`fe6db1b54`) merged Risk Intelligence Phase 3 after confirmed bot findings were separated from stale flags. The remediation included runtime-contract fixes, tenant/role/Support Mode/write-lock guards, scoped authenticated execution ACLs, and removal of authenticated/anon write privileges on `risk_relationships`. Focused contract tests passed 22/22; type-check, scoped lint, formatting, and whitespace checks passed. Its automatic Supabase migration workflow succeeded as run `34918435735`, and the recorded live function/ACL checks passed.

## Merge-process findings

The review also verified two null merges that should be prevented by process: PR #1120 merged an empty planning commit while still marked `[WIP]`, and PR #1126 merged zero files with the title “No changes made: session quota insufficient.” These events did not become successful remediation and are retained as process evidence, not counted as completed delivery.

The durable improvement is the local-first review gate now carried in `active-work.md`: start the local Supabase stack, replay migrations, execute focused tests and SQL/runtime checks locally, and use a blocking pre-push contract while keeping GitHub Actions inexpensive. The gate must also require current-main re-review, caller/schema/ACL evidence for database changes, and explicit distinction between merged, migrated, deployed, and browser-verified states.

## Production rollout and verification

- Supabase migration workflows and the relevant live migration/function/ACL checks are recorded in the active-work ledger and the remediation entries above.
- No frontend production deployment after the 11 September baseline is claimed. The Vercel account-level block remained the operational release blocker.
- The live snapshots used by the source review were bounded and dated: 45 active occupation rows with no qualification carrying multiple occupations, four active industry rows with no overlap with an active occupation, zero prediction rows, and zero meeting-link rows before their respective fixes. These measurements established latent risk and lack of observed destruction at review time; they are not a substitute for post-deploy regression evidence.

## Final status

The source review’s principal defect-remediation and merge-order work is closed through PR #1114’s merge on 15 September 2026. The remaining operational follow-up is the local-first verification gate and the Vercel account/deployment unblock, followed by explicit production and browser verification. Those are carried forward rather than silently marked complete.

## References

- GitHub PR [#1133](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1133) — canonical 15-migration reconciliation.
- GitHub PR [#1136](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1136) — workforce mapping and prediction-history fixes.
- GitHub PR [#1152](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1152) — live-trial and billing-writer gates.
- GitHub PR [#1153](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1153) — TAS date-window scope authority.
- GitHub PR [#1103](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1103) — Risk Register v2 frontend.
- GitHub PR [#1114](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1114) — Risk Intelligence Phase 3.
- `C:\Users\brian\complyhubworkspace\active-work.md` — current worktree, workflow, migration, and verification ledger.
- Source working document: `sept12-14-audit-and-merge-order.md` (deleted after this durable audit entry was verified).

