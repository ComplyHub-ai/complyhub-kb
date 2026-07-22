#!/usr/bin/env bash
# Dispatch a read-only cursor-agent subprocess for the ComplyHub orchestration workflow.
# Runs from WSL. Claude Code shells out to this for the two read-only agents: scout, reviewer.
# Fixer (code edits) never goes through this script — edits stay in Claude Code under the
# commit/push gates. (Collapsed from 6 named callsigns to scout/reviewer on 20 Jul 2026 — the
# ROLE arg is a free-text log label, so any string works, but scout/reviewer are the two in use.)
#
# Usage: dispatch.sh <role> <model> "<prompt>" [extra cursor-agent args...]
#   role:   scout | reviewer
#   model:  any cursor-agent --model id, e.g. kimi-k2.7-code, gpt-5.3-codex, composer-2.5-fast
#   prompt: the task, quoted
#
# --mode ask keeps this read-only for file/shell actions regardless of --force.
# --force is required for MCP tool calls (list_tables/execute_sql) to actually execute instead of
# being rejected with "User rejected MCP" (--approve-mcps alone only approves the server, not each
# tool call) — verified empirically 15 Jul 2026. Safety instead comes from the MCP server itself:
# .cursor/mcp.json scopes Supabase to --read-only --features database,docs,debugging, which was
# proven (live, against prod) to hard-reject apply_migration with "Cannot apply migration in
# read-only mode." execute_sql is forced read_only:true at the query layer. So --force widens what
# this process COULD ask permission for, but the DB tool it actually has access to cannot write.
# Must be run with cwd = complyhubworkspace root (or a path under it) so cursor-agent resolves the
# real .cursor/mcp.json, not a subrepo's example/placeholder file (rto-compass-hub/.cursor/mcp.json.example
# caused a silent "server not found" the first time this was tested).
#
# Status logging (added for the Agent Office UI, 16 Jul 2026): every dispatch appends JSONL status
# lines to complyhub-kb/agent-office/logs/agents.jsonl — started, then completed/error/blocked.
# This is additive only; it does not change dispatch's actual behavior or return value.

set -uo pipefail

ROLE="${1:?role required: scout|reviewer}"
MODEL="${2:?model required, e.g. kimi-k2.7-code}"
PROMPT="${3:?prompt required}"
shift 3 || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$WORKSPACE_ROOT/complyhub-kb/agent-office/logs"
LOG_FILE="$LOG_DIR/agents.jsonl"
mkdir -p "$LOG_DIR"

cd "$WORKSPACE_ROOT" || exit 1

if [ ! -f ".cursor/mcp.json" ]; then
  echo "ERROR: .cursor/mcp.json not found at $WORKSPACE_ROOT — refusing to run (would silently lose MCP access)." >&2
  exit 1
fi

now_ms() { echo $(( $(date +%s%N) / 1000000 )); }

AGENT_ID="${ROLE}-$(now_ms)-$$"
STARTED_MS=$(now_ms)
TASK_PREVIEW=$(printf '%s' "$PROMPT" | tr '\n' ' ' | cut -c1-200)

json_escape() {
  # Minimal JSON string escaper for log fields (no external deps).
  printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

log_event() {
  local event="$1" extra="$2"
  local ts
  ts=$(now_ms)
  printf '{"ts":%s,"event":%s,"agent_id":%s,"role":%s,"model":%s,"task":%s%s}\n' \
    "$ts" \
    "$(json_escape "$event")" \
    "$(json_escape "$AGENT_ID")" \
    "$(json_escape "$ROLE")" \
    "$(json_escape "$MODEL")" \
    "$(json_escape "$TASK_PREVIEW")" \
    "$extra" >> "$LOG_FILE"
}

log_event "started" ""

OUT_FILE=$(mktemp)
cursor-agent \
  --print \
  --output-format json \
  --mode ask \
  --trust \
  --approve-mcps \
  --force \
  --model "$MODEL" \
  "$@" \
  "[$ROLE] $PROMPT" > "$OUT_FILE" 2>&1
EXIT_CODE=$?

RESULT_TEXT=$(python3 -c '
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(d.get("result", ""))
except Exception:
    print(open(sys.argv[1]).read())
' "$OUT_FILE" 2>/dev/null || cat "$OUT_FILE")

DURATION_MS=$(( $(now_ms) - STARTED_MS ))
RESULT_PREVIEW=$(printf '%s' "$RESULT_TEXT" | tr '\n' ' ' | cut -c1-500)

if [ $EXIT_CODE -ne 0 ]; then
  # Best-effort classification: known permission/MCP-rejection strings -> "blocked", else "error".
  if printf '%s' "$RESULT_TEXT" | grep -qiE 'rejected MCP|not found|permission denied|not approved|read-only mode'; then
    log_event "blocked" ",\"reason\":$(json_escape "$RESULT_PREVIEW"),\"duration_ms\":$DURATION_MS"
  else
    log_event "error" ",\"reason\":$(json_escape "$RESULT_PREVIEW"),\"duration_ms\":$DURATION_MS"
  fi
else
  log_event "completed" ",\"result\":$(json_escape "$RESULT_PREVIEW"),\"duration_ms\":$DURATION_MS"
fi

cat "$OUT_FILE"
rm -f "$OUT_FILE"
exit $EXIT_CODE
