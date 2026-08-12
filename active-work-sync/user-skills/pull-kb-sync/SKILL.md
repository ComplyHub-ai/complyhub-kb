---
name: pull-kb-sync
description: Pull complyhub-kb, then apply complyhub-kb/active-work-sync/ onto this machine — overwrite workspace-root .md files with the mirrored versions, and add any new user-level skills or memory files that exist in the mirror but not locally yet. This is the "arriving on the other machine" half of the cross-machine sync described in complyhub-kb/active-work-sync/README.md (the push half is the sync-kb-clones skill, run on the machine that has the newer local edits). Trigger when Brian says "/pull-kb-sync", "pull active work", "pull kb sync", "pull the kb clones", or "sync down from the kb" — especially right after switching to a second PC.
---

# pull-kb-sync

Companion to `sync-kb-clones`, running in the opposite direction. `sync-kb-clones` pushes this
machine's real files *into* `complyhub-kb/active-work-sync/`. This skill pulls the mirror *out* — for
when Brian sits down at a machine that's behind (classically: arriving at the 2nd PC after the other
one pushed).

Implements the "Pull (arriving on the other machine)" procedure already documented in
`complyhub-kb/active-work-sync/README.md` — read that file's "What's mirrored here, and where it
really lives" table fresh each run, since paths/scope there are the source of truth, not this skill
file.

---

## How to trigger

```
/pull-kb-sync
```

---

## Step-by-step process

### Step 1 — Pull complyhub-kb

```bash
cd complyhub-kb && git pull --ff-only && cd ..
```

If this fails (conflicts, diverged history), stop and report — don't force anything.

### Step 2 — Workspace-root `.md` files (overwrite, with a safety check)

For every file the README lists as workspace-root-mirrored (`active-work.md`, `AGENTS.md`, `CLAUDE.md`,
`crosstenantleak.md`, `pr-review-open-prs.md`, `support-tickets-triage.md`,
`trainer-report-period-resync-gap.md`, and any other root `.md` present in the mirror except the
deliberately-excluded `trigger-phrases.local.md`):

1. Diff the mirror copy against this machine's current local copy.
2. **Same content →** nothing to do.
3. **Mirror differs and local copy matches what's recorded from the last pull (i.e. local hasn't been
   edited on this machine since)** → overwrite local with the mirror copy. This is the normal case —
   the whole point of pulling.
4. **Local copy has changed on this machine since the last pull/push** (uncommitted local edits that
   the mirror doesn't have) → do NOT silently overwrite. Show Brian the diff and ask whether to keep
   local, take the mirror version, or merge by hand.
5. **File exists in the mirror but not locally at all** → treat as new, write it to workspace root.
6. **File exists locally but not in the mirror** → leave it; that's a local-only file or something not
   yet pushed from the other machine, not this skill's business to remove.

### Step 3 — User-level skills (add/update automatically)

For every folder under `complyhub-kb/active-work-sync/user-skills/<name>/`:
- Compare against this machine's own user-level skills directory (wherever Claude Code keeps it on
  this machine — not a fixed path, resolve it fresh, same caveat as the README).
- **New skill (folder not present locally at all)** → copy it in whole. No confirmation needed — per
  the README's design, the git diff already *is* the changelog, and a missing skill is unambiguous.
- **Existing skill, content differs** → copy the updated file(s) over the local copy. Same
  no-confirmation rule — skills are self-contained instructions, not working data, so this direction of
  overwrite (mirror → local) is exactly what "arriving on the other machine" means.
- **Local skill not present in the mirror** → leave it. Might be a machine-specific skill never pushed;
  not this skill's job to delete it.

### Step 4 — Memory (add/update automatically)

For every file under `complyhub-kb/active-work-sync/memory/` (including `MEMORY.md`):
- Compare against this machine's own Claude Code memory directory for this workspace (project-specific
  path, resolve fresh — do not hardcode from a prior session).
- **New memory file** → write it in.
- **Existing file, content differs** → overwrite with the mirror version.
- Same no-confirmation rule as skills — memory content itself already goes through its own save
  discipline before it ever reaches the mirror, so pulling it down is not a fresh judgment call.
- **Local-only memory file not in the mirror** → leave it (it just hasn't been pushed from wherever it
  was written yet).

### Step 5 — Report

One plain-English summary at the end: which root files were overwritten (and which were skipped because
of a local-edit conflict, if any), which skills were added/updated, which memory files were
added/updated. No need to list unchanged files.

### Step 6 — Record the pull

Update (or create) `complyhub-kb/active-work-sync/.last-pull-<hostname>.local.json` with the
`complyhub-kb` commit hash just pulled and a timestamp — this is what Step 2's "has local changed since
last pull" check reads on the next run. Commit/push this tracking file along with nothing else unless
Brian separately asks for a commit (see hard gates below) — it's fine for it to sit as a local
uncommitted change between runs if that's simpler; don't force a commit just to persist it.

---

## Rules

- This is a read-then-write-local operation, not a `complyhub-kb` write — Step 1's `git pull` is the
  only interaction with the KB repo itself, and pulling doesn't require Brian's go-ahead the way pushing
  does. Steps 2–4 write to the **local machine** (workspace root, skills dir, memory dir), not to
  `complyhub-kb` — the general "confirm before making any change" gate still applies for the one case
  that has real ambiguity (Step 2.4, a local edit conflicting with the mirror). Skills/memory overwrites
  don't need a prompt per the reasoning in Steps 3–4.
- Never push from inside this skill — if the mirror itself looks stale or wrong, that's a job for
  `sync-kb-clones` on whichever machine has the newer state, not this skill guessing and writing back.
- Never touch `trigger-phrases.local.md` — deliberately excluded from the mirror, per-machine on
  purpose.
- If a real local path (workspace root, skills dir, memory dir) can't be resolved, stop and report
  rather than guessing.
