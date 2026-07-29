# active-work-sync — cross-machine sync staging area

**Purpose:** Brian works from two machines (Windows work PC, Mac home PC). Only
`complyhub-kb` and `rto-compass-hub` are real git repos — anything living outside
them (workspace-root docs, user-level Claude Code skills, Claude Code memory) has
no way to travel between machines on its own. This folder is the git-tracked
carrier for that content. It is a staging area, not a permanent home — the real
copies live at the workspace root / Claude's own directories on each machine.

Nothing in here auto-syncs. It moves only when Brian explicitly triggers a push
or pull.

---

## What's mirrored here, and where it really lives

| In this folder | Real location | Same on both machines? |
|---|---|---|
| `active-work.md`, `pr-review-open-prs.md`, `crosstenantleak.md`, `support-tickets-triage.md`, `trainer-report-period-resync-gap.md` | Workspace root | Yes — same relative path on both |
| `AGENTS.md`, `CLAUDE.md` | Workspace root | Yes — kept OS-agnostic on purpose (no hardcoded absolute paths; anything that differs by OS, e.g. WSL vs native, is worded as an either/or in the file itself rather than forked into two files) |
| `user-skills/<name>/` | Wherever Claude Code keeps **user-level** skills on that machine (its own skills directory, not tied to any repo) | Content yes, location no — each machine has its own path for this |
| `memory/` (`MEMORY.md` + individual memory files) | Wherever Claude Code keeps its **memory** for this workspace on that machine | Content yes, location no — the path is machine/project-specific by design (it's derived from the workspace path, which differs Windows vs Mac), so don't hardcode it anywhere |

**Not included on purpose:** `trigger-phrases.local.md` (the `.local` name is
deliberate — it's allowed to hold real per-machine differences, e.g. shell
syntax, and syncing it would fight that). Anything inside `rto-compass-hub/`
(including project-scoped skills like `checker`, `fix-qa-finding`,
`verify-bot-fix` under `rto-compass-hub/.claude/skills/`) — those are committed
to that repo already and travel via its own ordinary `git pull`, no help needed
from this folder.

---

## Push (leaving a machine)

1. Copy the current content of each real location above into its mirror here,
   overwriting what's there.
2. For `user-skills/` and `memory/`: if a skill or memory file is new since the
   last push, just add it — no manifest or changelog entry needed, the git diff
   *is* the changelog.
3. `git add` / commit / push in `complyhub-kb`.

Trigger phrase: **"sync work to home/work pc"** or **"push active work."**

## Pull (arriving on the other machine)

1. `git pull` in `complyhub-kb` first.
2. For the workspace-root files (including `AGENTS.md`/`CLAUDE.md`): diff each
   mirrored file against the current local copy before overwriting. If the local
   copy has changed since the last sync (uncommitted local edits), show the diff
   and ask before overwriting — don't silently clobber newer local work.
3. For `user-skills/`: for each folder here, write/update the matching skill at
   wherever *this* machine's Claude Code user-level skills directory is — same
   skill name, same file(s), just placed at this machine's own path.
4. For `memory/`: for each file here, write/update the matching file at wherever
   *this* machine's Claude Code memory directory is for this workspace — same
   filenames, same content, this machine's own path. Update the local `MEMORY.md`
   index the same way.

Trigger phrase: **"pull active work."**

---

## Why this design (not a single log file)

An earlier attempt at this (a one-time "reconstruction prompt" dump of 5 skills,
and a frozen snapshot of the workspace root) both went stale almost immediately —
they were exports, not a maintained mechanism, and there was no ritual forcing
anyone to update them. Both were deleted 29 Jul 2026. Mirroring real folders and
relying on git's own diff avoids that: there's no separate document to remember
to update, and no embedded copy of file content that can drift from the source.
