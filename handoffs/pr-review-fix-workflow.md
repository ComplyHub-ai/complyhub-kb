# PR review + fix workflow

> Moved from `CLAUDE.local.md` (10 July 2026). Content unchanged from the original.

This is the approved workflow for clearing open branches into `main`. Carl has approved edits and commits on PR branches.

**Steps per PR:**
1. Agent reviews the PR diff + dry-run merge against current `main`
2. Plain English verdict and issues presented to Brian
3. Brian decides: fix on branch / close / defer
4. If fixing: `git checkout [branch] && git pull`
5. Make edits, verify thoroughly, present full diff to Brian
6. Brian says "commit it" → commit
7. Brian says "push it" → push
8. Brian approves PR on GitHub and merges to `main`
9. Verify merge landed on `main`, branch deleted
10. Update `phase1-verdicts-partial.md` with final verdict
11. `git checkout main && git pull` before next PR

**Rules:**
- Never edit `main` directly — all changes go through PR branches
- Never commit or push without Brian's explicit words
- Brian can merge approved PRs to `main` directly
- After each merge, verify on `main` before moving to the next PR
- All verdicts saved to `localshi/merging_work/phase1-verdicts-partial.md`

## Post-merge checklist (mandatory after every PR merge)

After Brian merges a PR and the branch is deleted, always complete these steps before moving on:

1. `git checkout main && git pull` — confirm the fix commit is on main, report the commit hash
2. Confirm the branch is gone from remote (`git ls-remote --heads origin <branch>` returns empty)
3. Delete the local branch if it still exists (`git branch -D <branch>`)
4. **Confirm the Vercel production deploy went Ready** — `list_deployments`, find the newest `target: production` deploy matching the merge commit SHA, confirm `state: READY`. If it errored, pull `get_deployment_build_logs`. This catches a broken production build (on `rto.complyhub.ai`) immediately rather than on next visit.

Do not write KB audit entries automatically. Only write to `complyhub-kb/audit/` if Brian explicitly asks for it.
