---
name: branch-catchup
description: Bring staging and main into sync after a drift audit. Ports staging-only (Lovable) changes into main via a PR, then resets staging to mirror main. Trigger when Brian says "/branch-catchup", "sync staging and main", "do the catchup", "bring staging up to date", or "port lovable changes to main".
---

# branch-catchup

Executes the full branch catch-up cycle after `/audit-branch-drift` has confirmed drift exists. Two phases, each gated by Brian's explicit approval:

1. **Phase 1** — Port staging-only (Lovable) changes into main via a branch and PR
2. **Phase 2** — Reset staging to mirror main (force-push)

At the end, both branches are at the same commit. Staging will diverge again as Lovable adds new work — that is expected and normal.

---

## How to trigger

```
/branch-catchup
```

Run `/audit-branch-drift` first if you haven't already — this skill assumes you know what's drifted.

---

## Phase 1 — Port staging-only work into main

### Step 1.1 — Confirm main is current

```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
```

Report the latest commit hash and message on main. If pull fails, stop.

### Step 1.2 — Create a sync branch off main

```powershell
git checkout -b feat/staging-sync
```

Branch name is always `feat/staging-sync` unless Brian specifies otherwise.

### Step 1.3 — Identify staging-only changes to port

Run:
```powershell
git log origin/main..origin/staging --oneline
```

List the commits to Brian in plain English. Ask: "Which of these do you want ported to main?" Wait for explicit answer before proceeding.

Do not assume all staging commits should be ported — some may be superseded, experimental, or already handled differently on main.

### Step 1.4 — Apply approved changes

For each approved commit, cherry-pick or manually apply the change. Present the diff to Brian before committing anything.

Follow all rules in `rto-compass-hub/CLAUDE.md` — no `.single()`, no raw `console.error`, no direct `supabase.from()` in component bodies.

**Gate: Brian must say "commit it" before any commit is made.**

### Step 1.5 — Push and open PR

**Gate: Brian must say "push it" before pushing.**

```powershell
git push -u origin feat/staging-sync
```

Open a PR against `main` on GitHub. Title: `feat: sync staging-only work into main (DD Mon YYYY)`.

Provide Brian with the PR link. Wait for Brian to review and merge — do not merge autonomously.

### Step 1.6 — Confirm merge landed on main

After Brian merges:

```powershell
git checkout main
git pull
git log --oneline -5
```

Confirm the merge commit is present. Report the commit hash.

---

## Phase 2 — Reset staging to mirror main

**Gate: Brian must explicitly say "reset staging" before this step runs.**

### Step 2.1 — Confirm main HEAD

```powershell
git log --oneline -1
```

Report the commit hash that staging will be reset to.

### Step 2.2 — Thorough pre-reset drift scan (mandatory, do not skip)

A force-push is irreversible for anything not already captured elsewhere. Before asking Brian for the "reset staging" go-ahead, verify nothing on staging would actually be lost — do not rely on the Phase 1 PR description alone.

```powershell
git fetch origin
git log origin/main..origin/staging --format="%h %ai %an %s" | cat
git diff origin/main..origin/staging --stat | cat
```

For every file that still shows a diff, check which branch touched it more recently — this tells you the direction of drift:

```powershell
git log origin/staging -1 --format="%h %ai %s" -- <file>
git log origin/main -1 --format="%h %ai %s" -- <file>
```

- If `main`'s last-touch commit postdates `staging`'s for every divergent file, main is a strict superset — safe to reset.
- If any file's last touch is more recent on `staging` than on `main`, stop — that content is not yet ported. Go back to Phase 1 and port it before proceeding.

For any staging-only commit whose intent isn't obviously covered by the Phase 1 PR (e.g. titles that don't match the PR's stated scope), inspect its actual diff:

```powershell
git show --stat --format="%H %s" <commit>
```

Confirm each one is either a no-op (e.g. only touches `.lovable/plan.md`), already reconciled into a differently-named file on main (e.g. a hand-named gap-fill migration matching a Lovable auto-named one — diff the content, not just the filename), or genuinely superseded by a later main commit.

Report the scan result to Brian in plain English before asking for the reset go-ahead: what was checked, what was found, and why it's safe (or not) to proceed. Only after this report, ask for "reset staging".

### Step 2.3 — Force-push main to staging

```powershell
git push origin main:staging --force
```

### Step 2.4 — Verify both branches match

```powershell
git ls-remote origin main staging
```

Both HEADs must show the same commit hash. Report the result in plain English:

> "Done. Both main and staging are now at [hash]. Staging mirrors main. RJ's Lovable will see the updated codebase on next sync."

---

## Rules

- Never touch main directly — all porting work goes through `feat/staging-sync` branch + PR.
- Never commit without Brian saying "commit it".
- Never push without Brian saying "push it".
- Never force-push staging without Brian saying "reset staging".
- Never ask for "reset staging" go-ahead without first running the Step 2.2 drift scan and reporting the result — no assuming the Phase 1 PR covered everything.
- These are THREE separate gates — approving one does not approve the next.
- Branch verify before every commit: run `git branch --show-current` and confirm it is NOT `main`.
- If Phase 1 takes more than one session, note the PR number and branch state so Phase 2 can be picked up fresh.
- Staging diverging again after this is expected — do not treat it as a problem.
