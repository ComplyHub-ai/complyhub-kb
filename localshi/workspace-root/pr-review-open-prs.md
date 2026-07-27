# Open PR Review — rto-compass-hub

> Last synced: 20 July 2026 (after `git pull` on both repos — `main` fast-forwarded, `staging` updated, on `main` branch)

## Open PRs needing review

| # | Title | Author | Branch → base | Draft? | Opened | Updated | Status |
|---|---|---|---|---|---|---|---|
| 296 | fix(security): authorize user-management RPCs | app/cursor | cursor/critical-bug-investigation-43c3 → main | No | — | 23 Jul 2026 | MERGED ✅ (7feb13a2a, 23 Jul 2026 02:58 UTC) — branch deleted. Both migrations (20260722110641, 20260722150000) applied to production via execute_sql and functionally verified live (log_bound/assign_gated/assign_consultant all true, 2 new RLS policies confirmed). Ledger repaired for all 3 versions incl. previously-undocumented 20260722135734 — all 3 confirmed in schema_migrations with names matching git exactly. No edge functions, no further action needed. |
| 286 | Fix in-house skill set scope validation bypass | app/cursor | cursor/critical-bug-investigation-15ba → main | No | — | 23 Jul 2026 | Not yet started |

### Notes
- A fourth branch, `cursor/affiliate-exit-race-aaa6`, was pushed to the remote but has no open PR yet — not in review scope until a PR is opened.
- #259 is a draft — confirm with Brian whether draft PRs should go through the review crew now or wait until marked ready.
- PR review mode applies per CLAUDE.md: one PR through the crew (Scout → Checker → Tinker → Sentinel) at a time, report-then-wait, never a background Workflow, never concurrent PRs.
