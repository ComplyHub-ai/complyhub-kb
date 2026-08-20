# Audit — PR #427

> **Date:** 13 August 2026 (audit written); **Merged:** 13 August 2026
> **Scope:** Governance Register status filter returning blank results for any specific status
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked directly in conversation, no
> intermediate `.md` file created for this body of work

---

## Summary

Reported by Louisa (louisa@thinkrealestate.net.au, Administrator, "Think Real Estate" tenant, worktree B)
as "Glitch on Governance register - searching by status of task" — selecting any specific status filter
on the Governance Register page returned a blank list; only "All" showed her tasks. Root-caused to a
casing/spelling mismatch between the hardcoded Title Case filter options (`Open`, `In Progress`, `Pending`,
`Completed`, `Closed`) and the actual raw values stored in `ci_register.status`/`action_status` and
`risk_register.status` (lowercase/snake_case/mixed: `identified`, `in_progress`, `Mitigated`, etc.).
2 commits, no migrations, 3 frontend files, on branch `fix/governance-register-status-normalization`.

**Branch:** `fix/governance-register-status-normalization` (local copy deleted post-merge; remote branch
still present on GitHub, not auto-deleted, not yet manually removed) · **Merge commit:** `d29ada73c`
· **Merged:** 13 Aug 2026 · **Migrations:** none

## Root cause

`useGovernanceRegister.ts` derived each item's displayed/filterable status directly from the raw DB
columns (`item.status || item.action_status || 'Open'`) with no normalization. The Status filter and KPI
counts (`Open/Active`, `Overdue`) then did exact string comparisons against a hardcoded Title Case list.
Confirmed live: `ci_register.status` for Louisa's tenant held 35 rows, all `completed` (lowercase) —
querying `governance_actions`/`governance_register`/`gov_register` (initially suspected tables) returned
zero rows platform-wide or zero rows for this tenant, ruling those out before the actual live page
(`unified-register.tsx` → `useGovernanceRegister.ts` → `ci_register`/`risk_register`) was identified.

A broader recon pass (Scout, read-only) found the same casing inconsistency independently reinvented
across ~15 hooks, 4 separate hardcoded status enum/array definitions, a DB-driven dropdown system
(`risk_dd_status`/`dd_status`), and multiple edge functions/migration-defined RPCs — each with its own
literal set, none agreeing with each other (e.g. one baseline SQL function introduces a third "closed"
value, `treated`, unused anywhere else). Decided against a full platform-wide DB value rename (too large,
too many independent writers, no shared choke point to fix it through) in favour of a single shared
normalization function as the immediate fix, with the wider inconsistency flagged as separate follow-up
work rather than bundled into this PR.

## Fix shipped in PR #427

### Frontend (3 files, 2 commits)

- `src/lib/governance/normalizeRegisterStatus.ts` (NEW) — single shared `normalizeRegisterStatus()`
  function mapping every raw status/action_status spelling to one of the five canonical Title Case labels;
  exports `GOVERNANCE_STATUS_OPTIONS` as the one source of truth for the filter dropdown.
- `src/hooks/useGovernanceRegister.ts` — CI and Risk item transforms now call `normalizeRegisterStatus()`
  instead of the raw fallback chain; KPI `openCount`/`overdueCount` fixed as a side effect since they
  consume the same already-normalized `status` field.
- `src/types/governanceRegister.ts` — `STATUS_OPTIONS` re-exported from the new shared file instead of
  a second hardcoded array.

### Review round

Cursor Bugbot (High severity) and GitHub Copilot both independently flagged the same gap on the first
commit: `STATUS_MAP` covered only the values observed live in Louisa's tenant's data, omitting `closed`,
`resolved`, and `pending` — real values written by other paths (`RiskForm.tsx`'s `RISK_STATUS` enum
includes `Closed`/`Active`/`Monitoring`/`Under Review`; baseline SQL functions write `closed`/`resolved`
directly) that simply didn't exist in this tenant's data at the time. Verified against the writer
inventory from the earlier Scout recon pass (not re-derived from scratch) and fixed in a second commit —
added `closed`, `resolved`, `pending`, `active`, `monitoring`, `overdue`, `under_review`/`under review` to
the map. Vercel's automated review left an equivalent suggestion, folded into the same fix.

**Deliberately NOT fixed** (flagged, not bundled into this PR):
- The other ~15 hooks, 4 duplicate status enum definitions, and the `risk_dd_status`/`dd_status`
  DB-driven dropdown tables that each independently reinvented status handling — left untouched. These
  remain candidates to migrate onto `normalizeRegisterStatus()` opportunistically, not as one big rename.
- No TypeScript union type introduced for `status`/`action_status` — still loose `string` everywhere, so
  there's no compile-time protection against a future missed literal. Noted, not addressed.
- No automated test coverage added for `normalizeRegisterStatus()` (Copilot suggested table-driven tests
  covering every raw value + casing/whitespace + fallback + unknown-default cases) — skipped for this PR;
  worth adding if this function's mapping table grows again.

## Production rollout (post-merge)

1. No migrations — this fix is entirely frontend read/display logic, no DB writes.
2. No edge functions touched — nothing to deploy beyond the frontend (auto-deployed via Vercel on merge
   to `main`).
3. `main` pulled and confirmed to contain merge commit `d29ada73c`. Local branch deleted. Remote branch
   still present on GitHub (not auto-deleted on merge) — not yet manually removed, left for Brian.

## Still open / follow-up

- **Remote branch cleanup** — `fix/governance-register-status-normalization` still exists on GitHub;
  delete via UI or `git push origin --delete` when convenient.
- **Wider status-inconsistency cleanup** — the ~15 other hooks/components/edge functions/RPCs each with
  their own hardcoded status literal set (found via Scout recon, not touched in this PR) remain a source
  of the same class of bug recurring elsewhere. No living-doc was created to track this list long-term;
  the full inventory currently only exists in this conversation's history — worth transcribing into a
  tracked doc if the cleanup is picked up later.
- **Manual QA on production** — not yet performed by a human: filter Louisa's tenant's Governance Register
  by each status option and confirm her CI items now split correctly; check a tenant with real
  `risk_register` data (Louisa's is empty) to confirm `archived`/`escalated`/`Mitigated` values normalize
  as expected; confirm the "Open/Active" and "Overdue" KPI cards show corrected counts.

## Soak status

No feature flag, no gradual rollout — live for every tenant as of merge. Read-only normalization of
existing data, so no data-migration risk; every tenant's Governance Register page now runs through the
same shared status mapping going forward. Worth watching for any tenant reporting a status that still
doesn't match a filter option cleanly — the `STATUS_MAP` covers every value found during recon plus the
bot-flagged gaps, but wasn't exhaustively fuzzed against every register-writing code path in the platform.
