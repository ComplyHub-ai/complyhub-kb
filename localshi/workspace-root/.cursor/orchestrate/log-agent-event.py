#!/usr/bin/env python3
"""Shared Agent Office status logger — writes the same agents.jsonl format dispatch.sh uses,
so Claude-mode dispatches (Claude Code's own Agent tool, no cursor-agent/WSL involved) still show
up as real, live characters in the Agent Office UI.

Usage:
  log-agent-event.py start    <role> <model> <task>
      -> prints "AGENT_ID=<id>" and "STARTED_MS=<ts>" to stdout — capture both, pass back below.
  log-agent-event.py complete <role> <model> <task> <agent_id> <started_ms> <result_text>
  log-agent-event.py error    <role> <model> <task> <agent_id> <started_ms> <reason_text>
  log-agent-event.py blocked  <role> <model> <task> <agent_id> <started_ms> <reason_text>

(task is re-passed on every call, matching dispatch.sh's behavior of logging it on every line —
not persisted between the two invocations otherwise.)

Log file: complyhub-kb/agent-office/logs/agents.jsonl (path resolved relative to this script,
works identically from Windows-side Claude Code or from WSL).
"""
import json
import os
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
LOG_DIR = os.path.join(WORKSPACE_ROOT, "complyhub-kb", "agent-office", "logs")
LOG_FILE = os.path.join(LOG_DIR, "agents.jsonl")

def now_ms():
    return int(time.time() * 1000)

def append_event(event, agent_id, role, model, task, extra=None):
    os.makedirs(LOG_DIR, exist_ok=True)
    line = {"ts": now_ms(), "event": event, "agent_id": agent_id, "role": role, "model": model, "task": task}
    if extra:
        line.update(extra)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(line) + "\n")

def truncate(s, n):
    s = s or ""
    return s[:n]

def main():
    if len(sys.argv) < 2:
        print("usage: see module docstring", file=sys.stderr)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "start":
        _, _, role, model, task = sys.argv[:5]
        started = now_ms()
        agent_id = f"{role}-{started}-{os.getpid()}-claude"
        append_event("started", agent_id, role, model, truncate(task, 200))
        print(f"AGENT_ID={agent_id}")
        print(f"STARTED_MS={started}")

    elif cmd in ("complete", "error", "blocked"):
        _, _, role, model, task, agent_id, started_ms, text = sys.argv[:8]
        duration_ms = now_ms() - int(started_ms)
        field = "result" if cmd == "complete" else "reason"
        event = "completed" if cmd == "complete" else cmd
        append_event(event, agent_id, role, model, truncate(task, 200), {
            field: truncate(text, 500),
            "duration_ms": duration_ms,
        })

    else:
        print(f"unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
