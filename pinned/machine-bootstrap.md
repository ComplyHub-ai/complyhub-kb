> **Last updated:** 10 July 2026 · **OpenRouter secrets:** 11 July 2026 · **Confidence:** high — written and tested on the original machine.

# Machine bootstrap — local Claude Code artifacts not carried by git

## Why this file exists

`complyhubworkspace/` (the folder containing `complyhub-kb/`, `rto-compass-hub/`, and `CLAUDE.local.md`) is **not itself a git repo** — only `complyhub-kb/` and `rto-compass-hub/` inside it are. That means `.claude/settings.local.json` and anything under `.claude/hooks/` at the workspace root are 100% local to one machine: cloning `complyhub-kb` fresh on a new PC does NOT bring them along, and `CLAUDE.local.md` itself is personal/gitignored too.

The specific things this sets up: (1) a `SessionStart` hook that auto-injects the shared `complyhub-kb/pinned/*.md` docs (plus a few high-risk reminder rules) into context at the start of every session, so a new session doesn't have to be told to go read them, and (2) the MCP server connections (Supabase, Vercel) that let Claude query the database and check deployments — neither of which travels with a `git clone` of this repo. Without this file, both would silently not exist on a new machine and nobody would notice until a tool call failed or a rule got missed.

## When to run this

Any Claude Code session should follow this on its own, unencumbered by needing a human to ask, when either is true:
- `complyhub-kb` was just freshly cloned on a machine that has never had this workspace before, OR
- Session-start checked for `.claude/hooks/session-start-context.sh` (workspace root) and it's missing, OR
- The pinned docs clearly weren't auto-injected this session (nobody mentioned them, no `additionalContext` appeared) despite this file existing, OR
- A Supabase or Vercel MCP tool call fails with a "server not found"/"not connected" error and `<workspace-root>/.mcp.json` is missing or `claude mcp get vercel` reports not connected.

This is idempotent — safe to run even if some pieces already exist. Check before overwriting; don't clobber a machine that's already set up.

## Step 1 — locate the workspace root

The workspace root is the parent directory containing both `complyhub-kb/` and `rto-compass-hub/` as siblings. If unsure, resolve it from wherever this KB was cloned: `cd complyhub-kb && git rev-parse --show-toplevel` gives the KB repo root; its parent directory is the workspace root. All paths below are relative to that workspace root.

## Step 2 — create `.claude/hooks/session-start-context.sh`

Check if `<workspace-root>/.claude/hooks/session-start-context.sh` already exists. If not, create the directory and write this exact file (portable — resolves paths relative to itself, no hardcoded username or absolute path from any prior machine):

```bash
#!/bin/bash
# SessionStart hook: force-loads the shared KB "always load first" docs plus a
# short reminder of the highest-risk personal rules, instead of relying on the
# model to remember to go read them each session.
set -euo pipefail

# Resolve the workspace root relative to this script's own location, not a
# hardcoded path — this script lives at <workspace-root>/.claude/hooks/.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KB_DIR="$WORKSPACE_ROOT/complyhub-kb/pinned"

REMINDER='## High-risk rules (from CLAUDE.local.md — do not let these lapse)

1. **Plain English — always, not on request.** After any technical audit, diagnosis, or fix explanation, always follow with a plain-English summary (no jargon, no file paths, no code) without waiting to be asked.
2. **Never assume — always verify.** File content, DB state, migration status, branch, config — always re-check current state, never rely on memory or prior-session context.
3. **Branch verification before commit/push.** Always run `git branch --show-current` before every `git commit` or `git push`. If it shows `main` or anything unexpected, STOP and report — do not commit or push.'

jq -n \
  --rawfile guardrails "$KB_DIR/guardrails.md" \
  --rawfile session_protocol "$KB_DIR/session-protocol.md" \
  --rawfile conventions "$KB_DIR/conventions.md" \
  --rawfile decisions "$KB_DIR/decisions.md" \
  --arg reminder "$REMINDER" \
  '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: (
        "# Pinned KB docs (auto-loaded every session — complyhub-kb/pinned/)\n\n"
        + "## guardrails.md\n" + $guardrails + "\n\n"
        + "## session-protocol.md\n" + $session_protocol + "\n\n"
        + "## conventions.md\n" + $conventions + "\n\n"
        + "## decisions.md\n" + $decisions + "\n\n"
        + $reminder
      )
    }
  }'
```

Make it executable: `chmod +x <workspace-root>/.claude/hooks/session-start-context.sh`.

**Verify it works before wiring it up:**
```bash
echo '{}' | bash <workspace-root>/.claude/hooks/session-start-context.sh | jq -e '.hookSpecificOutput.hookEventName'
```
Should print `"SessionStart"` with no errors. If `jq` isn't installed on this machine, install it first (`brew install jq` on macOS) — the script depends on it.

## Step 3 — wire it into `.claude/settings.local.json`

Read `<workspace-root>/.claude/settings.local.json` first (create it with just `{}` if it doesn't exist yet — don't overwrite an existing file's other settings, e.g. `permissions`). Merge in (don't replace) a `hooks.SessionStart` entry:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash <absolute-path-to-workspace-root>/.claude/hooks/session-start-context.sh"
          }
        ]
      }
    ]
  }
}
```

Substitute the real absolute path for `<absolute-path-to-workspace-root>` on this machine (the `command` field itself must be an absolute path — only the script's internals are relative).

Validate the JSON after editing: `jq -e '.hooks.SessionStart[0].hooks[0].command' <workspace-root>/.claude/settings.local.json` should print the command string with no error.

## Step 3b — recreate MCP server connections

MCP servers are configured in two places, **both outside any git repo** (same problem as `.claude/`, so neither travels with a KB clone):

### Supabase MCP — project-scoped, `.mcp.json` at the workspace root

Check if `<workspace-root>/.mcp.json` already exists. If not, create it with this exact content (no secrets embedded — it's an OAuth-based HTTP connection, not a stored token):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=gdwhlstfguxarnxasrrs"
    },
    "supabase-account": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

`supabase` is pinned to the production project ref (`gdwhlstfguxarnxasrrs` — see `complyhub-kb/reference/supabase-mcp.md`); `supabase-account` is unscoped (account-wide) and should not be used unless the user explicitly asks for it.

This alone is not enough — Claude Code also needs to be told to trust this project's `.mcp.json` without prompting every session. In `<workspace-root>/.claude/settings.local.json`, merge in (alongside the `hooks` block from Step 3):

```json
{
  "enabledMcpjsonServers": ["supabase"],
  "enableAllProjectMcpServers": true
}
```

**First use on a new machine still requires a one-time interactive OAuth connect** — this cannot be scripted or pre-approved by editing files, since it opens a browser login flow. The first time a Supabase MCP tool is called, the user will be prompted to authenticate; after that it persists on this machine. Tell the user this is expected the first time, not a misconfiguration.

### Vercel MCP — user-scoped, `~/.claude.json` (NOT this workspace, NOT project-scoped)

Unlike Supabase, Vercel MCP is registered at Claude Code's **user** level (`~/.claude.json` — home directory, not `complyhubworkspace/`), so it is per-machine/per-user regardless of which project is open, and is never carried by any git repo by design. On a brand-new machine, run:

```bash
claude mcp get vercel
```

If it reports not connected/not found, add it (HTTP transport, OAuth) — check current Claude Code docs/`claude mcp add --help` for the exact add syntax, since this is user-scope tooling rather than a file this doc can safely hand you verbatim (unlike the project-scoped `.mcp.json` above, there is no static config to copy — it's a live OAuth registration). Once connected, confirm state again with `claude mcp get vercel`. Team/project IDs to expect after connecting: team `team_oUNjuuI0xecWTumBWDTNZuEm` (slug `complyhub`), project `prj_PWwpFRTBB4i4RAni8diFr7YaFk89` (`complyhub-rto`) — see `complyhub-kb/reference/vercel-mcp.md`.

## Step 4 — report to the user

This is a local config change to Claude Code's own settings — treat it like any other "self-modification" action: tell the user what was created/edited (hook script, settings.local.json hooks + MCP entries, `.mcp.json`), and flag two things that are expected, not failures:
- `SessionStart` hooks fire outside the current turn, so if pinned docs don't appear to auto-load on the very next session, the settings watcher may need a one-time `/hooks` open or a restart to pick up the new file.
- The first real Supabase MCP tool call on this machine will trigger an OAuth browser login — that's expected, not a misconfiguration. Vercel MCP needs its own separate one-time `claude mcp add`/OAuth step since it's user-scoped, not part of this workspace's files at all.

## Step 5 — OpenRouter secrets (workspace-local, outside both git repos)

OpenRouter credentials for Claude Code live under `<workspace-root>/.secrets/`, which is **outside** `complyhub-kb/` and `rto-compass-hub/` (the workspace root is not a git repo). Cloning either repo does **not** bring the key.

1. Ensure the folder exists with mode `700`:
   ```bash
   mkdir -p <workspace-root>/.secrets && chmod 700 <workspace-root>/.secrets
   ```
2. If `openrouter.env` is missing, copy from the example and paste a real key from https://openrouter.ai/keys:
   ```bash
   cp <workspace-root>/.secrets/openrouter.env.example <workspace-root>/.secrets/openrouter.env
   chmod 600 <workspace-root>/.secrets/openrouter.env
   # edit openrouter.env — replace sk-or-v1-REPLACE_ME
   ```
3. Load before launching Claude Code (or add to `~/.zshrc`):
   ```bash
   source <workspace-root>/.secrets/load-openrouter.sh
   ```
4. Verify inside Claude Code with `/status` (base URL `https://openrouter.ai/api`). If a prior Anthropic OAuth login conflicts, `/logout` once, quit, relaunch.
5. Confirm `complyhub-kb/.gitignore` ignores `.secrets/`, `openrouter.env`, and `.env*` patterns (belt against accidental copies into the KB repo).

Never put the key in committed KB docs, `settings` files that might be synced, or chat logs. Full routing policy: `complyhub-kb/reference/ai-model-routing.md`.

## Keeping this file in sync

If the hook's behaviour or the reminder rules change on the original machine, update this file's embedded script in the same commit — this is the source of truth for any future machine, not the local `.claude/hooks/` copy on any one PC.
