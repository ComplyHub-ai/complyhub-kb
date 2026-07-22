#!/usr/bin/env python3
"""SessionStart hook context builder — see session-start-context.sh for why python3 instead of jq."""
import json
import sys

kb_dir = sys.argv[1]

with open(f"{kb_dir}/guardrails.md", encoding="utf-8") as f:
    guardrails = f.read()
with open(f"{kb_dir}/session-protocol.md", encoding="utf-8") as f:
    session_protocol = f.read()

reminder = """## High-risk rules (from CLAUDE.md — do not let these lapse)

1. **Plain English — always, not on request.** After any technical audit, diagnosis, or fix explanation, always follow with a plain-English summary (no jargon, no file paths, no code) without waiting to be asked.
2. **Never assume — always verify.** File content, DB state, migration status, branch, config — always re-check current state, never rely on memory or prior-session context.
3. **Branch verification before commit/push.** Always run `git branch --show-current` before every `git commit` or `git push`. If it shows `main` or anything unexpected, STOP and report — do not commit or push."""

conventions_summary = """**Summary only — read complyhub-kb/pinned/conventions.md in FULL before: writing/reviewing any migration, touching Supabase Storage, writing a test for a logic change, or handling any credential/URL.**
- Storage RLS from the browser is unreliable (internal Supabase storage tables you cannot fully policy). First-fix instinct should be the Edge Function gateway pattern, not more RLS policies — see `patterns/storage-gateway.md`.
- Migrations: write `.sql` on a branch → push → branch DB confirms green → merge to `main` → **apply to PRODUCTION manually via MCP `apply_migration` immediately** (merging never auto-applies). Reconciliation files must be named with the original prod `version`+`name`, not the reconciliation date.
- Never read/grep `supabase/migrations/_archive/` (3,600+ dead Lovable-era files) when diagnosing migration issues.
- Logic changes (mutations/hooks/conditionals) need a real unit test that would fail if reverted — but the test client is mocked, so RLS bugs still need branch-DB verification, not just green tests.
- Never hardcode service URLs or credentials, even as a fallback — env vars only, fail loudly if missing."""

decisions_summary = """**Summary only — read complyhub-kb/pinned/decisions.md in FULL before filing a bug or designing a feature that might already be "by design."**
- PD-001: AU-only platform — AU date formats/terminology are not bugs.
- PD-002: multi-tenant isolation is P0/Critical — any cross-tenant data leak, escalate immediately regardless of apparent severity.
- PD-003: role hierarchy (Tenant/Consultant/SuperAdmin) — test every critical feature per-role, log the role in every bug report.
- PD-004: AI response variation is not a bug — only crashes, failed calls, or consistently harmful/wrong output are.
- PD-005: TGA data accuracy is training.gov.au's responsibility — verify against the source before flagging sync-displayed data as wrong.
- PD-006: Stripe billing gate enforces feature access — test with Stripe test-mode cards only, never real cards.
- Storage-gateway architecture decisions (documents / trainer-evidence buckets) are also logged there."""

additional_context = (
    "# Pinned KB docs (auto-loaded every session — complyhub-kb/pinned/)\n\n"
    f"## guardrails.md\n{guardrails}\n\n"
    f"## session-protocol.md\n{session_protocol}\n\n"
    f"## conventions.md (summary — read in full when relevant)\n{conventions_summary}\n\n"
    f"## decisions.md (summary — read in full when relevant)\n{decisions_summary}\n\n"
    f"{reminder}"
)

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": additional_context,
    }
}))
