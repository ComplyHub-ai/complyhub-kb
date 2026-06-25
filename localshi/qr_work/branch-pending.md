# Branch Pending — fix/local-run

## Pre-merge: Production DB migrations required

Both must be applied to prod (`gdwhlstfguxarnxasrrs`) before merging to main.
Migration SQL for each is in `complyhub-kb/reference/seed-qa-findings.md`.

- **NEW-004** — Create `sso_reports_register` table on prod DB (Dave)
- **NEW-014** — Remove `sec.is_super_admin()` bypass from all four `pdr_register` RLS policies on prod DB (Dave)

---

## Deferred findings — not blocking merge

- **NEW-003** — `/superadmin/billing/revenue` → 404. Route never built. Revenue coverage split across Sales Dashboard, Billing, and Risk Monitor. Awaiting RJ to formally close.
- **F-020** — `/consultant/my-tenants` → Coming soon. Feature not built.
- **F-022** — Consultant sub-pages → Coming soon. Feature not built.

---

## Open findings — awaiting owner

- **NEW-015** — SA "Preview as Tenant" fails. Root cause: stale triggers (`trigger_log_preview_start`, `trigger_log_preview_stop`) on `preview_sessions` table reference the deprecated `preview_session_log` table. Fix: drop both triggers. DB fix applied to branch by Dave — prod DB pending. Hook violations fixed in `usePreviewSession.ts`.
