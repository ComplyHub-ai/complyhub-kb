---
name: feedback-status-enum-vs-check-constraint
description: "When writing or reviewing a status-string allowlist/branch, grep the table's CHECK constraint for the full enum before trusting a copied subset"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1e62b449-4100-4bb8-844c-6659577d8b41
  modified: 2026-07-27T02:36:45.674Z
---

When code branches on a status string (e.g. `['submitted', 'committed'].includes(report.status)`),
verify that literal array against the table's actual `CHECK` constraint (or enum type) in
`supabase/migrations/00000000000000_baseline.sql` — grep `<table>_status_check` — before treating the
list as exhaustive. Don't assume an existing literal array in the code already covers every valid value.

**Why this was needed:** on PR #311 (`fix/monthly-reports-trainer-lock`, 24 Jul 2026), a fix to
`src/hooks/governance/reportMonitoringUtils.ts`'s `computeDisplayStatus` replaced a lock_deadline-based
fallback with an unconditional `return 'Overdue'` for anything not in `['submitted', 'committed']`. The
real status enum per `trainer_monthly_reports_status_check` is
`draft | submitted | reviewed | approved | committed` — so `reviewed`/`approved` reports (further along
than submitted, not less) were miscounted as Overdue on the Compliance Manager dashboard. Both Cursor
Bugbot and the Vercel bot caught it; I (Sonnet) had carried forward the original code's narrow
`['submitted', 'committed']` check without checking it against the schema, and a separate Checker
(pr-reviewer/Sentinel) pass earlier in the same PR reviewed this exact function (its Finding 2) but also
didn't cross-check the literal array against the real enum — it verified the *shape* of the fix (removing
the `lock_deadline` dependency) without verifying the *values* inside the new conditional.

**How to apply:** any time a fix touches a `status`/enum-like string comparison against a Supabase table
column — whether writing it directly or reviewing it as Checker/Sentinel — grep the table's CHECK
constraint or generated TS enum type first, and explicitly confirm every one of its values is correctly
classified by the new code, not just the values already exercised by tests or the original code. Fold this
into the Checker dispatch prompt whenever a diff includes a status-based conditional: "list every value in
the column's CHECK constraint and confirm each one hits the intended branch."

Related: [[feedback_role_casing_proper_case]] (a similar class of bug — code assuming a narrower/different
value set than what's actually live).
