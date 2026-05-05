> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — canonical session protocol for Claude Code and Codex.

# Session Protocol

Shared start-of-session and end-of-session procedures for all AI tools in this workspace. The tool-specific adapter files (CLAUDE.md, AGENTS.md) point here for the full detail.

## Session start (mandatory first action)

Run in order before any other work:

1. `cd complyhub-kb && git pull --ff-only && cd ..`
   (pulls audit/ too, since it lives inside the same repo)
2. `cd rto-compass-hub && git fetch && git pull && cd ..`
3. Report: latest commit in `complyhub-kb` and `rto-compass-hub` after pulling

If any pull fails (conflict, divergence, dirty working tree): **STOP and report.** Do not attempt to resolve conflicts autonomously.

## Session end

1. Review changes made to `complyhub-kb/` this session
2. Commit with a conventional-commits message (`fix:`, `kb:`, `adr:`, `audit:`, etc.)
3. Push to the appropriate branch
4. Summarise: what changed, commit SHA

## Claude Desktop project sync

These files are loaded as static knowledge in the Claude Desktop project. After any session where one of them is modified and committed, update the Claude Desktop project knowledge manually.

| File | In Claude Desktop project |
|---|---|
| `CLAUDE.md` (workspace root) | yes |
| `AGENTS.md` (workspace root) | yes |
| `complyhub-kb/README.md` | yes |
| `complyhub-kb/pinned/guardrails.md` | yes |
| `complyhub-kb/pinned/session-protocol.md` | yes |
| `complyhub-kb/pinned/conventions.md` | yes |
| `complyhub-kb/pinned/decisions.md` | yes |
| `complyhub-kb/pinned/kb-hygiene.md` | yes |

**End-of-session reminder:** if any file in this table was modified this session, add to your session summary: "⚠️ Claude Desktop sync needed — update [filename] in the project knowledge before next session."

## Source precedence

When sources conflict, resolve in this order:

1. Pinned KB docs (`complyhub-kb/pinned/`) — highest authority
2. `complyhub-kb/` via filesystem or GitHub MCP
3. `rto-compass-hub/` via filesystem or GitHub MCP
4. Inference — flag explicitly: "inferring — not confirmed in KB"

When pinned KB and the live repo disagree, the live repo wins (it is more current).

## Token efficiency — layered loading

Load docs in layers, not all at once:

1. **Pinned docs** — already in context; don't re-read unless you need a specific fact
2. **Reference docs** — fetch from `complyhub-kb/reference/` or `handoffs/` only when needed for the task
3. **Codebase files** — read from `rto-compass-hub/` only when needed for the task
4. **Inference** — only when no doc covers the question; flag it clearly

## Session notes format

End-of-session notes go in `complyhub-kb/audit/YYYY-MM-DD-<slug>.md`. Capture decisions, mistakes, fixes, and next actions only — not a full conversation transcript.

```markdown
## DD Month YYYY — [topic]
**Decisions:** [bullet list]
**Fixed:** [bullet list, if any]
**Next:** [bullet list]
```

## Working memory vs permanent rules

Not every lesson becomes a permanent rule. Apply this test before adding anything to `pinned/`:

- **Permanent rule** — applies broadly, would save time in future sessions, is not obvious from the code or KB → add to `pinned/`
- **Working memory** — context for today, may not apply next session → session note in `audit/` only
- **Archive** — useful history that doesn't need to load by default → `complyhub-kb/reference/` or `audit/`
