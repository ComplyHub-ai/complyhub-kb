#!/bin/bash
# SessionStart hook: auto-loads OpenRouter env vars + injects shared KB docs +
# highest-risk personal rules, all at session start. No manual setup needed.
#
# Uses python3 (not jq) to build the JSON output — confirmed 16 Jul 2026 that `jq` is not installed
# anywhere on this machine (Windows PATH, Git Bash, or WSL), which means the previous jq-based version
# of this hook could never have actually run successfully. python3 is already relied on elsewhere in
# this workspace (.cursor/orchestrate/dispatch.sh's JSON escaping) and confirmed present.
#
# Token-efficiency note (16 Jul 2026): guardrails.md and session-protocol.md are small and
# universally relevant (write perms, session ritual) — injected in full. conventions.md and
# decisions.md are much larger (~3.2k / ~1.2k tokens) and mostly relevant only to specific task
# types (migrations/RLS/storage, bug-vs-by-design triage) — injected as a short summary + pointer
# instead, matching session-protocol.md's own "layered loading" principle. Read the full file when
# a task actually touches that area. CLAUDE.md (renamed from CLAUDE.local.md) is auto-loaded by
# Claude Code's native project-memory convention, not this hook — don't re-add it here.
set -euo pipefail

# Resolve the workspace root relative to this script's own location, not a
# hardcoded path — this script lives at <workspace-root>/.claude/hooks/.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
KB_DIR="$WORKSPACE_ROOT/complyhub-kb/pinned"
SECRETS_DIR="$WORKSPACE_ROOT/.secrets"

# Load OpenRouter env vars if openrouter.env exists
if [ -f "$SECRETS_DIR/openrouter.env" ]; then
  set -a
  source "$SECRETS_DIR/openrouter.env"
  set +a
fi

python3 "$SCRIPT_DIR/session-start-context.py" "$KB_DIR"
