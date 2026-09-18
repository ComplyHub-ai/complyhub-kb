# Audit — PR #1210

> **Date:** 2026-09-17; **Merged:** 2026-09-17 03:18:18 UTC  
> **Scope:** Fix the invitation register-link race that left users stuck after creating a password; make the Vivacity Playwright lane accept the explicit admin credential names.  
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — the work was tracked on the PR and active-work ledger

---

## Summary

PR #1210 fixed a real production failure in invitation acceptance. A valid invited user could enter a strong password, but the account-creation function treated the invitation as unavailable after the tenant-membership trigger had already marked it accepted. It then rolled back the new account, returned HTTP 409, and left the browser on the password page.

The fix makes the final invitation update address the invitation by ID, while retaining the earlier check that rejects invitations that were already invalid before account creation began. A regression assertion protects that distinction. The PR also aliases the explicit admin-suffixed Vivacity Playwright credentials to the existing lane names so the controlled production test uses the intended persona.

The substantive change was 3 files, with 16 additions and 3 deletions. It contained no database migration files and changed one Edge Function. The merge commit is `cf701a7939519245c4b6272ff1ba16d0cd9df9f5`.

**Branch:** `fix/playwright-vivacity-admin-env-alias` (merged; still present remotely) · **Merge commit:** `cf701a7939519245c4b6272ff1ba16d0cd9df9f5` · **PR:** [#1210](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1210)

---

## Before and after

| Stage | Before | After |
|---|---|---|
| Invitation finalization | Membership creation could accept the invitation before the Edge Function's final update. The final update only accepted `pending`/`sent`, returned PostgREST 406, and the function rolled back the new account. | The initial invitation-status guard still rejects stale or invalid invitations, but the final update completes by invitation ID even when the membership trigger has already changed the status. |
| User experience | The user stayed on the password page after clicking **Create Account & Continue**. No usable account remained. | The account is created, the invitation is accepted, and the user is returned to login with the success message. |
| Test-lane credentials | The lane expected generic Vivacity variable names even after the local file was made explicit about the admin role. | Admin-suffixed names are accepted and mapped to the lane's canonical variables; legacy names remain supported. |
| Verification | The original failure was reproducible in a controlled live test. | The post-deploy controlled live Playwright test passed, and disposable invitation, auth, profile, and membership records were all removed. |

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Invitation register flow | A valid invitee could submit a compliant password but remained on the invitation page and received a failed account-creation response. | The tenant-membership trigger changed the invitation to `accepted` before the Edge Function's final update. That update still filtered for `pending` or `sent`, so the object response returned 406/PGRST116. |
| Account creation rollback | A successful membership insert did not leave a usable account. | The function interpreted the final update's no-row result as a failure and deleted the newly-created auth user during cleanup. |
| Playwright production lane | The lane could not use the newly explicit admin credential names without manual renaming. | `playwright.config.ts` only read the legacy generic variable names. |
| CI/release signal | The PR view retained a failed `Supabase Preview` status for an external preview project even though the merge commit later had a successful Supabase Preview check and migration-drift monitor. | The preview status was not aligned with the post-merge project/check context; this is a release-process/integration discrepancy, not a code failure in this PR. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `b70e47a794c2aec1b0f36ff1d5735c6f1d49080a` | Removed the stale-status filter from the final invitation update, added the regression assertion, and accepted admin-suffixed Vivacity Playwright credentials. |
| `380173cfe09576d82a3e0e4099ce38e5d31fcaab` | Merged current `origin/main` into the feature branch before PR review/merge. |

---

## Fixes shipped

### Invitation acceptance

- **`supabase/functions/user-create-from-invitation/index.ts`** — preserved the early `sent`/`pending` status guard, but removed that status filter from the final update so trigger-driven acceptance cannot be mistaken for failure.
- **`tests/supabase/invitation-flow-hardening.test.ts`** — asserts both protections: the early status guard remains, and the final update uses the invitation ID without the stale status filter.

### Playwright lane

- **`playwright.config.ts`** — accepts `PLAYWRIGHT_VIVACITY_ADMIN_EMAIL` and `PLAYWRIGHT_VIVACITY_ADMIN_PASSWORD`, while preserving the legacy variable names for existing sessions. No credential values are stored in the repository or this audit.

### Database

None. No migration file was changed, no migration was applied, and no migration-ledger update was required.

### Edge functions

- `user-create-from-invitation` was deployed by the successful [Deploy Edge Functions workflow](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35177665595), which reported the changed function deployed to project `gdwhlstfguxarnxasrrs`.

---

## Review rounds

1. **Root-cause recon** — reproduced the failure with a disposable production invitation and traced the sequence through membership creation, the live invitation trigger, the final update, the 406/PGRST116 response, and account cleanup.
2. **Focused regression test** — the invitation-flow hardening test passed 4/4 after asserting the early status guard and the ID-only final update.
3. **Mechanical checks** — scoped ESLint, Prettier, `deno check`, and `git diff --check` passed.
4. **GitHub CI** — lint, type check, Edge Function type check, security checks, `.single()` guard, migration guards, config coverage, CodeQL, and runtime-contract checks passed. The PR view also showed a failed external `Supabase Preview` status; the merge commit later received a successful Supabase Preview check and successful migration-drift monitor run. This discrepancy remains recorded rather than treated as a clean all-green PR signal.
5. **Post-merge deployment** — the Edge Function deployment workflow completed successfully.
6. **Controlled live browser verification** — the valid invitation link completed account creation and returned to login with the success message. The first post-deploy attempt exposed an incorrect temporary test assertion for the login heading; that test-only assertion was corrected and the rerun passed.
7. **Cleanup verification** — the disposable invitations and created auth/profile/membership records were removed. Final verification returned zero remaining rows in all four cleanup categories.

No separate fresh-eyes adversarial subagent review was run for this PR.

---

## Production rollout (post-merge)

1. **Vercel production** — the GitHub Vercel status reported `SUCCESS` with “Deployment has completed” for the merge check. The Vercel MCP connector was unavailable during this audit, so a production target and `READY` state could not be independently confirmed through the required deployment listing. No stronger Vercel rollout claim is made here.
2. **Edge functions** — `user-create-from-invitation` deployed successfully in workflow run [35177665595](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35177665595), and the live register-link test passed afterward.
3. **Migrations** — none.
4. **Worktrees** — Worktree C is clean at the merged feature branch, but `active-work.md` still lists it as claimed by Khian for this task. It has not yet been released to a standby branch, so it should not be treated as free until that ledger/worktree teardown is completed.

---

## Manual QA checklist (post-merge — Brian-gated)

- [x] Controlled valid invitation link tested against the live application after the Edge Function deployment.
- [x] Strong password submission completed and redirected to login with the success message.
- [x] Invitation was accepted and linked to the created auth user, profile, and membership during the test.
- [x] Disposable test data and temporary test artifacts were removed; final counts were zero.
- [ ] Human click-through from a real invitation email has not been performed in this audit.
- [ ] Invalid, expired, revoked, and already-used invitation variants were not re-run as part of this PR's post-merge test.
- [ ] Vercel production deployment still needs independent connector verification when the Vercel connector is available.

---

## Still open / follow-up

- Resolve why the PR-level `Supabase Preview` status pointed at preview project `zjjyljqmxudmzerhrxlb` and failed while the merge commit's post-merge Supabase Preview check pointed at `gdwhlstfguxarnxasrrs` and succeeded. This should be clarified in the CI/release process so a stale external status cannot be mistaken for a code verdict.
- Independently verify the Vercel production deployment for merge commit `cf701a7939519245c4b6272ff1ba16d0cd9df9f5` once the Vercel connector is connected.
- Complete Worktree C teardown and update the worktree registry so the checkout is either released to standby or explicitly retained for a new task.
- Watch the invitation function for renewed 409 responses or `INVITATION_UPDATE_FAILED`/`INVITATION_UNAVAILABLE` errors after further invitation traffic.

---

## Soak status

No feature flag was introduced. Risk tier: medium-high because this is an authentication and account-creation path. The key regression signal is a valid invitation returning 409 or leaving the user on the password page. The fix is mitigated by the focused regression assertion, successful Edge Function deployment, and the controlled live end-to-end test, but the CI preview-context discrepancy and independent Vercel verification remain operational follow-ups.

---

## References

- PR: [#1210](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1210)
- Merge commit: `cf701a7939519245c4b6272ff1ba16d0cd9df9f5`
- Substantive commit: `b70e47a794c2aec1b0f36ff1d5735c6f1d49080a`
- Edge Function deployment: [workflow run 35177665595](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35177665595)
- Post-merge migration-drift monitor: [workflow run 35177832716](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/35177832716)
- Active work ledger: `active-work.md`

