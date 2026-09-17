# Navigation Consolidation Initiative — Documentation Map

> Formal initiative name: **Navigation Consolidation Initiative**, named 17 Sep 2026. Internal
> tracking code (used throughout these docs, branch names, and PR titles) stays **G04** / **G04-B**
> — that numbering is shared with the wider `lint-playwright-program.md` ledger (G00–G-LINT) and
> isn't being renamed; only this initiative's human-facing name is new.

Planning, decision-log, and recon docs for the Navigation Consolidation Initiative (internal codes
G04 / G04-B navigation-source work — route-contract foundation + navigation catalog). Lives at
`g04-nav-program/` in the workspace root.

> **Modeled on** `unicorn-cms-f09c59e5/docs/kb/README.md`'s layering — one index file, one explicit
> precedence file, plain prose everywhere else. Adopted 16 September 2026 after the three docs below
> had grown large enough that cross-references and stale status claims were getting lost.

## Folder contents

```
g04-nav-program/
├── README.md                          ← this file — the map
├── source-precedence.md               ← the rules for what wins when docs disagree, and fetch triggers
├── g04-route-contract-foundation.md   ← ACTIVE ENTRY POINT for the route-contract prerequisite
├── g04b-nav-optimization-plan.md      ← PR-sequencing wrapper for the catalog build (PRs 8–14)
└── g04b-nav-source-recon.md           ← source of truth for *why* — original evidence + per-issue decision log
```

## What each file is for

| File | Purpose | Status (16 Sep 2026) |
|---|---|---|
| `g04-route-contract-foundation.md` | Living-doc per `../CLAUDE.md`'s Living-doc workflow — Phase 0 decisions + Phase 1 PR sequence for the route-contract prerequisite that PR 7 of the catalog build depends on. **Disposable**: per its own lifecycle rule, it gets deleted once every item in it is done and an audit entry is written — don't reference it by name from a durable doc expecting it to still exist later. | Live, in progress. PR 1 (`nav-metrics` tool), PR 2 (route classification), and PR 3 (contract types + SSO pilot family, #1191) merged; PR 4 (pilot family catalog + one real consumer) next. |
| `g04b-nav-optimization-plan.md` | PR-sequencing, SOLID checks, and an anti-abstraction guardrail wrapped around the recon's already-locked decisions — execution structure, not a second place decisions get made. | Reference only for PRs 8+ (the catalog build itself); PRs 1–6 (dead-code retirement + label fixes) already shipped. |
| `g04b-nav-source-recon.md` | The original evidence and the full per-issue Decision log (14 issues) — *why* each decision was made. Has its own table of contents at the top (issues are numbered in discovery order, not file order). | Canonical for issue history; 12 of 14 issues shipped, 1 in progress (Issue 5, ongoing via the foundation doc), 1 independent/not started (Issue 14). |

## Source precedence

See **[source-precedence.md](source-precedence.md)** for the full rules. One-line summary: the route-contract
foundation doc wins on anything route-contract-shaped; the recon doc wins on *why* a nav decision was
made; the actual codebase always wins over any of the three when they disagree with it.

## How to update

- A locked decision, a new issue, or a status change → edit the relevant file directly, in place —
  this workspace's convention (see `../CLAUDE.md` § Living-doc workflow) is to replace stale text, not
  layer a correction on top of it.
- Cross-file status drift (a doc says "not yet implemented" for something another doc already shows
  merged) → fix it here, and note the correction inline so a reader knows it was cross-checked, not
  assumed. This happened once already (7 issues in the recon doc were stale as of 16 Sep 2026 — see
  its own Decision log entries for the corrections).
- A finding that reads as a real, standalone, actionable item (a confirmed dead file, a structural
  risk) but isn't part of any locked issue → promote it to `active-work.md`'s Backlog (workspace root)
  — these three docs are not the ledger; that file is. Don't leave a real finding doc-only.
- A body of work here growing "big/complex enough to need its own scoped project" → give it its own
  living-doc per `../CLAUDE.md`'s Living-doc workflow, don't fold it into one of these three as a
  growing subsection.

## What's NOT here

- The worktree/branch registry, backlog, and program status summary — all in `active-work.md`
  (workspace root). These three docs are planning/evidence, not the ledger.
- Anything about other programs (`lint-playwright-program.md`, `observability-restructure.md`, etc.)
  — separate bodies of work, separate docs, workspace root.
