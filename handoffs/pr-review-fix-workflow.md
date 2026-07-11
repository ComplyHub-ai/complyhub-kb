# PR review + fix workflow

> **What this file is:** the step-by-step *procedure* for reviewing and landing a
> PR (agent steps, gates, post-merge checks). Moved from `CLAUDE.local.md`
> (10 July 2026). Light touch 11 July 2026 for Angela's automation context.
>
> **What this file is NOT:** it does **not** hold PR status, verdicts, or queue
> state. That lives in one place only:
> **`pr-review-open-prs.md`** (workspace root).

Carl has approved edits and commits on PR branches.

## Single source of truth

| Question | Read this |
|---|---|
| Which PRs are open, merged, blocked, verdict? | `pr-review-open-prs.md` |
| How do we run a `/pr-review` and land a merge? | This file + `.claude/commands/pr-review.md` |
| What did the 11 July automation audit find? | `pr-process-automation-audit-2026-07-11.md` (workspace root) |

`phase1-verdicts-partial.md` is **retired** — do not write new verdicts there.

## Automation context (11 July 2026)

Angela enabled Tier A/B labels, CODEOWNERS, auto-merge, and stale sweep on
`main`. **Her live config was not changed** by our audit. Until the legacy queue
(~28 PRs) is cleared manually:

- Older PRs may lack `tier-a` / `tier-b` labels and reviewer requests.
- Tier B still needs RJ or Khian — verified working on live PRs.
- Do **not** rely on unattended Tier A auto-merge until CI is re-enabled and
  required (see audit doc).

## Steps per PR

1. Read current queue state in `pr-review-open-prs.md`
2. Agent reviews PR diff + dry-run merge against `main`
3. Check tier labels (infer from paths if missing — see audit doc)
4. Plain English verdict to Brian
5. Brian decides: fix / close / defer
6. If fixing: checkout branch, pull, edit, verify, show diff
7. Brian says "commit it" → commit
8. Brian says "push it" → push
9. Merge (Tier B: RJ/Khian approval; Tier A: auto-merge only when CI gate restored)
10. Post-merge verification (below)
11. **Update `pr-review-open-prs.md`** with verdict, merge hash, deploy/migration notes
12. `git checkout main && git pull` before next PR

Full checklist: `.claude/commands/pr-review.md` (Tinker + Sentinel).

## Rules

- Never edit `main` directly
- Never commit or push without Brian's explicit words
- All PR outcomes logged in **`pr-review-open-prs.md` only**
- Treat sensitive paths as Tier B even if `tier-b` label is missing

## Post-merge checklist (mandatory)

1. `git checkout main && git pull` — report merge commit hash
2. Confirm remote branch deleted
3. Delete local branch if still present
4. Confirm Vercel production deploy **READY** for merge SHA
5. If migrations/edge functions: verify live production (Stage 5a in `/pr-review`)

Do not write `complyhub-kb/audit/` entries unless Brian asks.
