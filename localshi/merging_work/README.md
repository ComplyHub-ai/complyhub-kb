# merging_work — Process Guide

This folder tracks the full branch cleanup plan. Every file here must be kept up to date as PRs are reviewed, fixed, and merged. This README is the single source of truth for when to update what.

---

## Files in this folder

| File | Purpose |
|---|---|
| `PLAN.md` | Master plan — phases, branch inventory, status table |
| `AGENT_PROMPT.md` | Prompt template used by the review agent |
| `phase1-verdicts-partial.md` | **Retired (11 July 2026).** Historical Phase 1 log only — active record is `pr-review-open-prs.md` at workspace root |
| `completed-prs.md` | Detailed write-up of every PR that has been merged and deleted |
| `phase5-conflict-tracker.md` | Running log of files that will conflict when `fix/local-run` is resynced with `main` |

---

## Update rules — do these automatically, no reminders needed

### After every PR review (verdict produced)

1. **`phase1-verdicts-partial.md`**
   - Add the full verdict block at the bottom of the reviewed PRs section
   - Update the status in the "Remaining PRs" table at the bottom (change "Not reviewed" to the verdict)

2. **`phase5-conflict-tracker.md`**
   - If the agent reports any conflicts with `fix/local-run`: add a new entry under "Conflict log" with the PR number, title, and the list of conflicting files
   - Update the "Running summary" table — add any new files, and flag ⚠️ Layered if a file already appears from a previous PR

### After a PR is merged and deleted

3. **`completed-prs.md`**
   - Add a full entry: what the PR did, issues found, changes we made, commit hash, dry-run result

4. **`phase1-verdicts-partial.md`**
   - Update the verdict for that PR to `MERGED AND DELETED` with the merge date
   - Update the status in the "Remaining PRs" table to `MERGED ✓`

5. **`PLAN.md`**
   - Update the PR's row in the branch inventory table to `✅ MERGED DD Month YYYY`
   - Update the Phase status table at the bottom when a full phase is complete

### After a PR is closed without merging

6. **`phase1-verdicts-partial.md`**
   - Update the verdict to `CLOSED` with the close date and reason

7. **`PLAN.md`**
   - Update the PR's row to `❌ CLOSED DD Month YYYY`

---

## Conflict tracker — how to update it

When the review agent says "Conflicts with fix/local-run: Yes":

1. Add a new `### PR #XX` block to `phase5-conflict-tracker.md` under "Conflict log"
2. List every conflicting file in the table with a short note on why
3. Check the "Running summary" table — if the file is already there, add the new PR number and mark ⚠️ Layered
4. Update the "Last updated" line at the bottom

**Do NOT mark conflicts as resolved when a PR merges to main.** The conflicts are against `fix/local-run` — they remain open until Phase 5 runs. The only time an entry in this tracker is resolved is when Carl manually resolves it during the Phase 5 resync.

---

## Checklist — per PR

```
[ ] Verdict added to phase1-verdicts-partial.md
[ ] Remaining PRs table updated in phase1-verdicts-partial.md
[ ] Conflict tracker updated (if conflicts reported)
[ ] completed-prs.md updated (if merged)
[ ] PLAN.md branch inventory updated (if merged or closed)
[ ] PLAN.md phase status updated (if phase complete)
```
