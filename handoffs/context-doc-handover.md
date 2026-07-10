# Context-md + handover workflow (added 10 July 2026)

> Moved from `CLAUDE.local.md` (10 July 2026). Content unchanged from the original.

For any task big enough to span multiple sessions or many discrete steps (a multi-PR cleanup, a migration audit, a large refactor, a multi-day investigation) — not small one-shot tasks — use this pattern instead of letting one chat carry the whole thing:

**1. Context md (per task/initiative)**
- Lives at the `complyhubworkspace` root, named for the task (existing examples: `pr-review-open-prs.md`, `migrationsissue.md`)
- Holds the durable record: findings, decisions, full history, status checklist — everything worth keeping once the session ends
- Updated in batches at natural checkpoints (a merge, a fix round, a decision point) — **not** after every micro-action. If gaps or issues are found mid-investigation, report them in chat first and get a decision on what to do; update the doc once, afterward, covering everything in that batch — not as each individual thing happens

**2. Handover text (between sessions/chats)**
- Plain text in the chat, never its own file
- Scoped to the **single next step only** — what just happened, what's next, and a pointer to the context md for full detail
- Never restates the whole remaining roadmap — that lives in the context md, not in every handover
- Written so a brand-new chat with no memory of this conversation can pick up cold by reading the handover + the context md

**3. Master index chat (this kind of chat)**
- Doesn't carry the full task long-term — either does one step and hands over, or delegates a step and reports back
- Job is continuity and routing across many steps/sessions, not being the single place all context lives
- When resuming after a gap, re-reads the context md rather than relying on its own memory of the conversation

**Trigger phrase → action**

**"start a context doc for [task]"** (or "create a context md for this")
- Create `<task-slug>.md` at the `complyhubworkspace` root with a header matching the existing style (`# <Title>`, `**Documented:** <date>`, `**Investigated by:**`), then begin logging findings there per the batching rule above.
