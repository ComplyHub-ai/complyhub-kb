---
name: fable-audit-prompt
description: Location and purpose of the Fable full-platform audit prompt in the KB
metadata: 
  node_type: memory
  type: project
  originSessionId: 5dc01108-2f74-4fcc-8ceb-b274fbd3e23b
  modified: 2026-07-27T02:35:11.371Z
---

A comprehensive audit prompt for Fable (claude-fable-5) was created on 2 July 2026.

**File:** `complyhub-kb/reference/fable-audit-prompt.md`

**Why:** To run periodic full-spectrum audits of the ComplyHub platform covering security (RLS, Edge Functions, auth, OWASP), code quality, performance, SEO (https://rto.complyhub.ai), and KB gaps — all cross-referenced against the team's knowledge base.

**How to apply:** When Brian wants to run a platform audit, direct him to this file. Paste everything below the maintenance notes section into a fresh Fable session. Output lands in `complyhub-kb/audit/audit-[DD-MM-YYYY]-session-[N].md`.

**Key features of the prompt:**
- Loads KB (pinned/, codebase-state/, audit/) before auditing to avoid re-reporting known issues
- Labels each finding: NEW / KNOWN-OPEN / INTENTIONAL / CARL-RULE-VIOLATION / ADR-CONFLICT / KB-IMPROVE
- Session continuity: if context limit is reached, saves progress and auto-generates a continuation prompt
- 5 phases: Security → Code Quality → Performance → SEO → KB Gap
- P0 cross-tenant leakage findings surfaced immediately, not held for final output

**Last audit run:** Not yet run — prompt created 2 July 2026.
