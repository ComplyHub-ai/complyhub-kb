---
name: pull-kb-clones
description: Pull `complyhub-kb/active-work-sync/` (the mirror written by /sync-kb-clones) into this machine's real workspace root, memory, and user-level skills — the counterpart pull-side skill. Diffs KB mirror against this machine's actual state in both directions, flags every new/changed/orphaned file, and only writes after Brian's go-ahead per file category. Trigger when Brian says "/pull-kb-clones", "pull the kb clones", "apply the kb sync", "pull down the mirror", or "bring this machine up to date from the kb".
---

# pull-kb-clones

`complyhub-kb/active-work-sync/` is a git-tracked mirror of three things that live outside `complyhub-kb/`
on whichever machine last ran `/sync-kb-clones`:

1. **Workspace-root `.md` files** — `CLAUDE.md`, `AGENTS.md`, `active-work.md`, and any other `.md` file
   directly in `/Users/khiansismundo/complyhubworkspace/`.
2. **Personal memory** — `complyhub-kb/active-work-sync/memory/` →
   `/Users/khiansismundo/.claude/projects/-Users-khiansismundo-complyhubworkspace/memory/`.
3. **User-level skills** — `complyhub-kb/active-work-sync/user-skills/` →
   `/Users/khiansismundo/.claude/skills/`.

`/sync-kb-clones` is one-way: real workspace → KB mirror, run on whichever machine made the changes. This
skill is the missing other half: KB mirror → this machine's real files, run on the machine that needs to
catch up. Without it, PC B pulls the KB repo but nothing ever applies those changes to PC B's actual
memory/skills/root docs — they just sit unread inside `complyhub-kb/`.

This is a **two-way diff, one-way-per-file write**: the comparison checks both directions (KB has
something new vs. this machine has something new), but nothing is overwritten automatically — every
category is reported first and applied only file-by-file with Brian's go-ahead.

---

## How to trigger

```
/pull-kb-clones
```

---

## Step-by-step process

### Step 1 — Pull latest KB state first

```bash
cd complyhub-kb && git pull --ff-only && cd ..
```

If this fails, stop and report — don't diff against a stale local KB checkout.

### Step 2 — Load the last-sync marker

Marker file: `complyhub-kb/active-work-sync/.last-pull-<hostname>.json` (per-machine — PC A and PC B each
keep their own, since they pull independently and shouldn't clobber each other's marker). Contents:
`{ "kb_commit": "<sha>", "synced_at": "<ISO date, only if explicitly passed in — never generate one with
Date.now()/`date` at write time inside a loop; a plain `date -u +%FT%TZ` shell call at the moment of the
Step 6 write is fine>" }`.

- **No marker found** → this is a first run on this machine. Treat every file in the mirror as needing a
  full diff against the real workspace (nothing is assumed new/changed/same — check them all).
- **Marker found** → run `git -C complyhub-kb diff --name-only <kb_commit> HEAD -- active-work-sync/` to
  narrow the file list to only what changed in the mirror since last pull. Still do the full per-file
  comparison in Step 3 for that narrowed list — the marker only limits *which files to check*, it doesn't
  decide the outcome.

### Step 3 — Diff each category, per file

For every file in scope (root `.md`s, memory files including `MEMORY.md`, user-skill files), compare the
KB mirror copy against this machine's real copy and sort into exactly one bucket:

- **KB has it, machine doesn't** → **new from KB** — propose creating it locally.
- **Machine has it, KB doesn't** → **local-only** — this machine has drift the KB never picked up (e.g.
  created here since the last `/sync-kb-clones` run elsewhere). Flag it; do not assume it should be
  deleted just because it's absent from the mirror — ask whether to keep it as-is, or push it up via
  `/sync-kb-clones` instead.
- **Both have it, identical content** → no action.
- **Both have it, content differs, only one side changed since the last common state** → treat the
  side that actually changed as authoritative and propose applying it — but still flag it, don't apply
  silently. ("Only one side changed" is a courtesy label, not a shortcut around confirmation.)
- **Both have it, content differs, and both sides changed since the last common state (true conflict)**
  → flag explicitly as a **conflict**. Show both versions (or a diff against the last-known-common
  version if the marker makes one identifiable). Ask Brian which wins, or whether to hand-merge. Never
  auto-merge.
- **Existed in both before, now gone from KB only** → the KB mirror no longer has it (someone deleted it
  via `/sync-kb-clones`'s orphan-removal step, or another machine's edit). Flag first, then — once
  Brian confirms — delete the local copy to match. Never delete without flagging first, per Brian's
  explicit call on this edge case.
- **mtime check for skills**: if a user-skill file's local mtime is newer than this machine's last-pull
  marker timestamp AND its content differs from the KB version, treat it as a **conflict** (Step 3's
  true-conflict path) even if the marker's commit-range diff would otherwise call it a clean "new from
  KB" — Brian may be actively mid-edit on this machine.

**MEMORY.md handling**: diff and resolve individual memory content files first using the rules above.
Only after those are settled, reconcile `MEMORY.md`'s index lines as a derived step — check for index
lines pointing at files that didn't survive the sync, and memory files with no corresponding index line.
Do not treat `MEMORY.md` as just another flat file diffed independently of its content files.

**No exclusions**: `active-work.md` and every other root `.md` file go through the same rules above —
there is no special-cased file in this skill.

### Step 4 — Report in plain English before touching anything

Summarise, per category (root docs / memory / skills):
- Count of new-from-KB, local-only, one-side-changed, true-conflict, and KB-deleted files
- Name each one; for conflicts and one-side-changed, show enough of the diff for Brian to judge
- For local-only files, explicitly ask: keep as machine-local drift, or push to KB via
  `/sync-kb-clones` afterward?
- For KB-deleted files, explicitly ask: confirm local deletion, or keep the local copy anyway?

Then **wait for Brian's go-ahead** before writing anything — same "confirm before any change" hard gate
as the rest of this workspace.

### Step 5 — Apply, one file at a time

Apply approved changes sequentially, not batched:
1. Write/delete one file.
2. Log it as done (append to an in-memory or scratch checklist you report back at the end) before
   moving to the next file.

This makes a mid-run interruption safe to resume — re-running the skill will re-diff and only the
files not yet applied will still show as pending; anything already written now matches KB and drops out
of the diff.

Never touch a local-only or conflict file without Brian's explicit per-file (or explicit blanket)
approval from Step 4.

### Step 6 — Write the sync marker

After applying (even if some files were left pending per Brian's choice), write
`complyhub-kb/active-work-sync/.last-pull-<hostname>.json` with the KB repo's current commit sha. This
file is local bookkeeping for this skill only — it is not part of `/sync-kb-clones`'s mirror scope and
should not be treated as a root `.md`/memory/skill file by that skill.

---

## Rules

- Two-way diff, never a two-way auto-write: KB→machine and machine→KB directions are both surfaced, but
  only KB→machine is ever applied by this skill. Local-only files get flagged for Brian to route to
  `/sync-kb-clones` by hand, never pulled the other way from here.
- No silent deletes: a file gone from KB deletes locally only after Brian confirms, per file or per
  batch — never inferred.
- No silent overwrites: any content difference is a conflict or one-side-changed call that Brian sees
  before it's applied — never assume KB is always right just because it's the shared source.
- Verbatim apply, not paraphrase — copy exact content, this is a mirror operation, not a summary.
- Respect the workspace's existing hard gates: confirm before writing. This skill does not commit or
  push anything (it only writes to the local filesystem, not `complyhub-kb/`), so the commit/push gates
  don't apply here — but the "confirm before any change" gate still does.
- If the real workspace root, memory directory, or skills directory can't be read (path wrong, moved),
  stop and report rather than guessing a path.
