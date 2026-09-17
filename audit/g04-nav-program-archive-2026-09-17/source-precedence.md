# Source Precedence — Navigation Consolidation Initiative (G04)

> **Last updated:** 16 September 2026 · **Reconsider by:** whenever `g04-route-contract-foundation.md`
> is deleted per its own lifecycle rule (Phase 1 complete, audit written) — at that point this file's
> Phase-0/Phase-1 rows go stale and need pruning.
>
> Modeled on `unicorn-cms-f09c59e5/docs/kb/reference/source-precedence.md`. That file is the original;
> this one is scoped to the three docs in this folder only, not the whole workspace.

---

## The order

For any question about this program, in this order:

1. **`g04-route-contract-foundation.md`** — anything about the route-contract prerequisite: Phase 0
   decisions (pilot family, ID format, field subset), Phase 1 PR sequence, verification gates.
2. **`g04b-nav-source-recon.md`** — anything about *why* a navigation decision was made, or the
   original evidence behind it. Its Decision log (14 issues) is the historical record.
3. **`g04b-nav-optimization-plan.md`** — anything about PR sequencing/grouping for the catalog build
   itself (PRs 8–14), SOLID checks per slice, the anti-abstraction guardrail.
4. **The actual `rto-compass-hub` codebase** — ground truth, always. Any of the three docs above can
   be stale relative to it.
5. **Inference** — only with an explicit "Inferring from …" prefix, same as the wider workspace
   convention.

---

## When sources disagree

**Rule: the one closer to the code wins**, same as the wider KB's own rule.

| Conflict | Winner |
|---|---|
| Foundation doc vs. optimization plan | Foundation doc — the optimization plan's own header says so, and its §6 PR 7 row is explicitly marked superseded in favor of the foundation doc |
| Foundation doc vs. recon | Foundation doc for anything route-contract-shaped; recon for anything about *why* a pre-existing nav decision (Issues 1–14) was made — they answer different questions, not really in conflict |
| Recon vs. optimization plan | Recon — it's the source of truth for *why*; the optimization plan is execution structure only and explicitly defers to the recon rather than re-deciding anything |
| Any of the three vs. the actual codebase | Codebase. Always. |
| A doc's own internal status line vs. another doc's PR/SHA table | The PR/SHA table — it's closer to what actually shipped. This is a **real, recurring failure mode**: 7 of the recon's 14 issues had stale "Not yet implemented" status lines as of 16 Sep 2026, corrected only because someone cross-checked them against the optimization plan's PR register. Don't trust a bare status line without checking it against a PR/commit reference somewhere. |

When the codebase wins over any of these docs, say so in the reply and flag which file needs
correcting — don't silently answer from the code and leave the doc wrong for the next session.

---

## Staleness check ("Reflects commit")

Two tables in this folder describe current shipped code state rather than decisions, and carry a
**Reflects commit** tag for exactly that reason:

- `g04b-nav-source-recon.md` § "Role → live sidebar component mapping" — tagged `164280ac4`.
- `g04b-nav-optimization-plan.md` § "Baseline at `origin/main@eddc9065`" — tagged `eddc9065`.

Before trusting either table: compare its tag against current `main` HEAD. If HEAD has moved
materially since, re-verify against the actual source (`RootAppLayout.tsx`/`RoleSidebar.tsx` for the
first, the files it lists for the second) rather than assuming the table still holds.

Everything else in these three docs is a decision/evidence record, not a live-state snapshot — it
doesn't go stale the same way, but a **status line** (LOCKED / SHIPPED / OPEN) can still drift out of
sync with what actually merged, per the table above. Check a status line against a concrete PR
number or SHA when one is available; treat a bare "not yet implemented" with no PR reference as
unverified, not as fact.

---

## Fetch triggers

Don't read a whole doc to answer one question:

- **Why was a nav decision made** → `g04b-nav-source-recon.md` § Decision log, the specific Issue
  number (use its table of contents at the top, not physical scroll position — issues are numbered
  in discovery order, not file order: 1, 2, 3, 4, 5, 13, 6, 7, 9, 12, 10, 11, 8, 14).
- **What's next / current PR sequence** → `g04-route-contract-foundation.md` §5 for the route-contract
  prerequisite; `g04b-nav-optimization-plan.md` §6 for the catalog build itself.
- **Is this file/system actually live today** → recon's role→component mapping table — check its
  Reflects-commit tag first.
- **What's still open/undecided** → recon § Flagged (F-prefixed) and § PARKED — there are **two**
  PARKED sections in that file (one near the top, one much further down).
- **A known dead-code/structural-risk finding not yet a task** → recon § Architecture/bad-practice
  findings (B-prefixed) — cross-check against `active-work.md`'s Backlog first (workspace root); if
  it's not there, it needs to be added, not left doc-only. Items 25–27 there are the ones already
  promoted this way (16 Sep 2026).
- **Program status / what's claimed on which worktree** → `active-work.md` (workspace root) — these
  three docs never hold worktree/branch state, only planning and evidence.

## When to stay in one doc only

- Confirming a locked decision's exact wording → the recon's Decision log entry for that issue,
  nothing else.
- Confirming a PR's exact scope/files/SHA → whichever doc's PR-sequence table names it (foundation
  doc §5, or optimization plan §6) — don't cross-reference the other unless the two disagree.
