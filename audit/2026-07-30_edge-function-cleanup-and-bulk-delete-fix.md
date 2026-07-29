# Audit — Edge Function Cleanup + Bulk-Delete Storage-Failure Fix (30 July 2026)

**Date:** 30 July 2026
**Branch:** `fix/bulk-delete-storage-failure-toast` (deleted post-merge)
**PR:** [#327](https://github.com/ComplyHub-ai/rto-compass-hub/pull/327)
**Merge commit:** `54b2a14b4`
**Living doc retired:** `edge-function-cleanup-and-bulk-delete-fix.md` (workspace root) — deleted after this audit entry was created
**Origin:** two unrelated follow-up items deliberately kept out of the `staging-to-main-catchup.md` doc (see [2026-07-30_pr323-326_staging-to-main-catchup-and-document-rpc-hardening.md](2026-07-30_pr323-326_staging-to-main-catchup-and-document-rpc-hardening.md)) because each had its own root cause and its own decision to make, not a staging port.

---

## Purpose

Close out two items found during the staging/main catchup and its Checker review: four orphaned edge functions running live in production with no git source, and a bulk-delete flow that silently swallowed storage-deletion failures.

---

## What was implemented

### Item A — Orphaned edge functions deleted

Four edge functions were running live in production with no corresponding source anywhere in git — no owner, no review path, no way to safely change them:
- `diag-anthropic-audit` — already self-stubbed to return HTTP 410 ("retired diagnostic"); never actually deleted.
- `meeting-reports-generator` and `monthly-report-reminders` — both read/wrote a table confirmed permanently empty, because their role filter matched a value (`'Trainer'`) that has never existed in the system (the real value is `'Trainer/Assessor'`). No cron job called either. Superseded by the `notify_meeting_scheduled` Postgres RPC.
- `notify-gp-meeting-scheduled` — zero references anywhere in the codebase or cron schedule. Not a rename of the still-live `notify-gp-meeting` (which fires on meeting *conclusion*, not *scheduling*) — a separate dead function, also superseded by `notify_meeting_scheduled`.

Brian confirmed 29 Jul 2026: delete all four. Deleted directly from Supabase (no git capture needed, nothing depended on them) — not a code change, no branch/PR required.

**Verified 30 Jul 2026:** `list_edge_functions` against production confirms all four are gone; only their live replacement, `notify-gp-meeting`, remains.

### Item B — Bulk-delete storage failures now surfaced (PR #327)

`deleteDocumentFiles()` already knew which storage files failed to delete, but only logged it via a raw `console.warn` (a banned pattern in this repo), and the calling hook discarded that result entirely. Net effect: a bulk delete that removed the document rows but failed to remove some underlying files reported full success, with the orphaned files invisible to everyone.

Brian confirmed 29 Jul 2026: option (c), both a user-facing toast and proper logging. Implemented:
- `src/lib/documentFiles.ts` — `console.warn` replaced with `logger.warn`.
- `src/pages/admin/documentsRegisterLogic.ts` — the failed-files result is now returned instead of discarded; the bulk-delete toast now shows "Deleted N document(s), but M file(s) failed to delete from storage" when relevant.
- `src/hooks/useBulkDeleteDocuments.ts` — result type gained `filesFailed: string[]`; logs via `logger.error` when any files fail.
- `src/pages/admin/DocumentsRegister.tsx` — passes the failed-file count into the toast resolver.

---

## Review and verification

- `npx tsc --incremental --noEmit` and `npx eslint` on all four touched files passed clean before merge.
- Post-audit verification (30 Jul 2026): `git log` on `main` confirms PR #327 merged (`54b2a14b4`); `list_edge_functions` against production confirms all four orphaned functions are gone.

---

## Explicitly out of scope — tracked separately, not blockers

- A related storage-cleanup edge case (orphaned files that fail to delete are surfaced now, but not automatically retried or reconciled) — noted as a possible future ticket, not addressed here.

---

## Living-rules / process notes from this batch

- Confirms the living-doc workflow end to end: two items kept out of a larger catchup because each needed its own decision, worked one at a time with Brian, decisions locked in the doc, implemented, then folded into this audit entry before the working doc was deleted.
