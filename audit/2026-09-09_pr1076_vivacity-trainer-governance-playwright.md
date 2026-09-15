# Audit — PR #1076

> **Date:** 2026-09-09; **Merged:** 2026-09-09 05:42:41 UTC
> **Scope:** Add a reusable hosted Playwright lane for the Vivacity trainer monthly-report and governance-meeting lock workflow
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `trainer-monthly-report-governance-playwright.md`

---

## Summary

PR #1076 added a production-targeted, sandbox-scoped Playwright lane for the Vivacity Testing Tenant. The lane loads credentials from the ignored `.env.playwright.local` file, allows only the explicitly required write endpoints, records RPC responses and browser-console messages, and exercises the trainer-to-governance lock workflow.

The hosted QA run proved trainer submission, governance meeting start, and the trainer's locked report state. Generated report data was deleted after each run, the meeting was returned to `scheduled`, and the Vivacity tenant was restored to its suspended/write-locked state. No Australian College production data was used.

Two files were changed: 271 additions and 11 deletions. No migrations or Edge Functions were touched.

**Branch:** `feat/trainer-report-governance-meeting-playwright` (merged) · **Merge commit:** `65f899ee4309f008defba68760afc9b42edb4185` · **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/1076

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Governance access | `briansismundo@gmail.com` authenticated but could not see the scheduled meeting | The account had primary tenant role `Compliance Manager`, but the restrictive governance-meeting read policy also required `Consultant` or another read role. |
| Playwright coverage | No reusable browser lane covered the full trainer-report → governance-start → trainer-lock journey | The existing configuration only covered anonymous and read-only lanes. |
| Test reliability | The first implementation missed the final lock screen and later retries reused submitted report state | The final assertion used the report-list route instead of `/dashboard/trainer-portal/monthly-report?edit=...`, and failed attempts were not isolated from later attempts. |
| Dashboard noise | Browser evidence contained unrelated request failures | Existing hosted-app issues include the `ofi_register.source` HTTP 400 and blocked third-party telemetry; these were recorded as noise, not treated as flow failures. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `d7121616780c6d430b143d5230561421194a6321` | Added the reusable Vivacity trainer-report Playwright lane and local env-file loading. |
| `435a605f0e4e3d1a62d01cb9eba974581ac85723` | Merged current `origin/main` into the branch and resolved the `playwright.config.ts` conflict while preserving the existing super-admin lane. |
| `65f899ee4309f008defba68760afc9b42edb4185` | GitHub merge commit for PR #1076. |

---

## Fixes shipped

### Playwright configuration

- **`playwright.config.ts`** — Loads ignored local credentials, preserves the existing Vivacity read-only and super-admin lanes, and adds the `production-vivacity-trainer-report` lane targeting only `https://rto.complyhub.ai`.
- **`playwright.config.ts`** — Validates the four trainer/governance credential variables before the write-capable lane starts.

### Hosted browser test

- **`tests/e2e/safe/trainer-report-governance.production-vivacity-trainer-report.spec.ts`** — Adds the sandbox write allowlist, trainer/governance authentication, meeting discovery, report submission evidence, meeting-start evidence, final report-lock assertion, meeting undo cleanup, and console capture.
- The test uses RJ's trainer persona and `briansismundo@gmail.com` as the governance persona in the Vivacity Testing Tenant.

### Database

None. No migration was added or applied by PR #1076.

The QA setup separately added `Consultant` to the governance user's Vivacity `tenant_members.roles` array. That was sandbox test data, not a repository change.

### Edge functions

None touched, none redeployed.

---

## Review rounds

1. **Live diagnosis and role-policy review** — Confirmed valid authentication, distinguished tenant role `Compliance Manager` from profile role `Administrator`, inspected governance RLS behavior, and identified the missing `Consultant` read role.
2. **Hosted Playwright QA** — Passed trainer submission with HTTP 200, governance meeting start, and the trainer lock assertion. Captured meeting ID `36efee1a-0dd9-45cf-ba2b-df0d9ce0f8e2` and report submission responses.
3. **Sandbox cleanup verification** — Confirmed the generated report was deleted and the meeting returned to `scheduled` with `started_at = null` after each final run.
4. **Mechanical checks** — Scoped ESLint passed; `npm run type-check` passed; `git diff --check` passed; repository pre-commit Prettier and ESLint hooks passed.
5. **Merge-conflict resolution** — Reconciled PR #1076 with `origin/main`, preserving the newly-added trainer-report lane and main's super-admin lane. The post-resolution diff remained limited to the two intended files.

No fresh-eyes/adversarial review was run because this was a focused test-harness change with no production application or database logic change.

---

## Production rollout (post-merge)

1. **GitHub main CI** — Passed for merge commit `65f899ee4309f008defba68760afc9b42edb4185`: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34315982050
2. **Code Quality: Push on main** — Passed: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34315982080
3. **Vercel production** — Not independently verified in this audit because the Vercel connector was not authenticated. The PR's Vercel Preview Comments check passed, but that is not treated as proof of a production deployment.
4. **Edge functions** — None.
5. **Migrations** — None.
6. **Worktrees** — Worktree C remains checked out on the merged branch pending explicit teardown. The workspace `active-work.md` registry still needs its stale C claim refreshed/released.

The unrelated automated Version bump workflow failed because its `chore/version-bump` push was rejected as non-fast-forward; this did not fail PR #1076 CI or the application change.

---

## Manual QA checklist (post-merge — Brian-gated)

- [x] Pre-merge hosted sandbox QA completed against `https://rto.complyhub.ai`.
- [x] Trainer can submit a monthly report in the Vivacity Testing Tenant.
- [x] Governance account can start the linked meeting.
- [x] Trainer sees `Report locked — already submitted` after meeting start.
- [x] Test report and meeting state were cleaned/restored after the run.
- [ ] Repeat the lane once after the merged production deployment is independently confirmed.
- [ ] Confirm the ignored `.env.playwright.local` file remains local and contains no committed secrets.

---

## Still open / follow-up

- Release Worktree C and refresh the Worktree C row in `active-work.md`; it still records the pre-merge task claim.
- Verify the Vercel production deployment for merge commit `65f899ee4309f008defba68760afc9b42edb4185` when the Vercel connector is available.
- Consider adding first-class automatic report cleanup to the sandbox lane; the final QA runs used authenticated sandbox cleanup outside the committed test.
- Investigate the pre-existing `ofi_register.source` HTTP 400 separately; it was outside PR #1076 and did not block the tested flow.

---

## Soak status

No feature flag. The lane is a controlled QA-only write path against the Vivacity Testing Tenant, with an explicit endpoint allowlist and sandbox cleanup expectation. Risk is medium because it writes hosted test data; the lane must not be pointed at Australian College or another real-client tenant.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1076
- Merge commit: `65f899ee4309f008defba68760afc9b42edb4185`
- Main CI: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34315982050
- Main Code Quality: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34315982080
- Source QA flow: `trainer-monthly-report-governance-playwright.md`
- Active work ledger: `active-work.md`
