---
name: feedback-ci-gate-exhaustive-service-role-check
description: "ci-gate's (formerly cichecker) service-role-key security check must scan every changed edge function file in one grep pass, never a manually-recalled subset"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-29T07:38:27.941Z
---

When running ci-gate's (renamed from cichecker 29 Jul 2026) Step 5.2 (exposed service-role key check), build the full list of changed
`supabase/functions/**` files first, then grep `SUPABASE_SERVICE_ROLE_KEY` against that *entire* list in
one pass — never substitute a subset recalled from memory of "which functions I added new service-role
code to this session."

**Why:** on PR #310 (24 Jul 2026, cross-tenant leak fix), `ci-overdue-check/index.ts` was in the branch's
changed-file set because a `isScheduledInvocation` auth gate was added in front of its *pre-existing*
service-role client — the service-role usage itself wasn't new. When manually re-running the security
check, only the 3 files with genuinely new service-role code were grepped (`clause-matcher`,
`generate-meeting-pack`, `tenant-documents-list`), and `ci-overdue-check` was skipped because it "wasn't
one I added service-role code to." CI's actual `security-guards` job doesn't reason about *why* a file
changed — it mechanically greps every changed file — so it failed on `ci-overdue-check` after the PR was
already pushed, a gap that should have been caught locally first.

**How to apply:** the correct check is always:
```bash
CHANGED_FN=$(git diff "$BASE"...HEAD --name-only --diff-filter=ACMR -- 'supabase/functions/**')
ALLOWED=$(grep -o 'ALLOWED="[^"]*"' .github/workflows/ci.yml | sed 's/ALLOWED="//;s/"$//')
grep -Hn "SUPABASE_SERVICE_ROLE_KEY" $CHANGED_FN 2>/dev/null | grep -v "README" | grep -vE "$ALLOWED"
```
Run this exact command against the full `$CHANGED_FN` list — don't hand-pick which files to check.
This has been folded into the `ci-gate` skill (user-level, `C:\Users\brian\.claude\skills\ci-gate\SKILL.md`)
Step 5.2 directly, so following the skill's literal instructions (not an ad-hoc approximation of them)
closes this gap.

See also [[feedback_role_casing_proper_case]] — found via the same PR's CI failure investigation.
