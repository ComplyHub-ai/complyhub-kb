# Audit — PR #116: Documents Register bulk-action UX fixes + assessment tool responsive grid + bot findings

**Date:** 3 July 2026
**Branch:** `fix/assessment-tool-form-responsive-grid`
**PR:** #116
**Merged by:** Brian (Khian)
**Merge commit:** `915218af2`
**Migration applied to production:** None — code-only fix (frontend only).
**Vercel production deploy:** `dpl_7V4WaFArc2ZPsNnPsqbdsJ5EntYT` — `READY`, live on `rto.complyhub.ai`.

---

## What was reported

### Angela — three Documents Register bulk-action UX issues
1. No way to move a Draft document straight to Approved without going through the separate "Under Review" step first.
2. During bulk upload metadata review, the "Select All / Clear Selection / Apply to Selected" bar (and the Back/Finalise footer) scrolled out of view on long file lists, forcing a scroll back to the top to use them.
3. The header "select all" checkbox only selected whatever the page-size dropdown was currently showing (e.g. 10 of 40 matching documents), with no indication that the rest weren't included.

### Automated bot findings (Vercel, Cursor Bugbot, github-code-quality) — found and fixed in the same branch per Brian's "all fixes, one branch" instruction
4. **Vercel:** `AssessmentToolForm.tsx` had bare `col-span-2` inside `grid-cols-1 sm:grid-cols-2` grids — below the `sm` breakpoint this still forced a 2-column span, creating an implicit second column and pushing the form wider than the viewport.
5. **Cursor Bugbot:** `DocumentsTable.tsx` header checkbox replaced/cleared the entire selection state instead of only adding/removing the current page — checking it on page 1 silently wiped out selections already made on page 2 (or an expanded filter-wide selection).
6. **Cursor Bugbot:** `DocumentsRegister.tsx` bulk delete swallowed `document_audit_log` insert failures with only a `console.error`, still showing a plain success toast — the stated deletion reason could silently vanish with no user-visible signal.
7. **Vercel:** `BulkActionToolbar.tsx` sourced the acting user's role from `useAuth()`'s `profile.role` (platform-level field, only ever `super_admin`/`null`) instead of the tenant-scoped `effectiveRole`, silently hiding every permission-gated bulk action from real tenant Administrators/Compliance Managers.
8. **github-code-quality:** unused imports in `BulkActionToolbar.tsx` (11 unused lucide icons + unused permission-helper imports), unused `Select*` imports in `DocumentReviewPanel.tsx`, unused `roleReady` variable in `DocumentsRegister.tsx`.

## Fix

- **Fast-track Approve** — new bulk action moves Draft documents straight to Approved, gated to compliance-management roles, with an explicit "skips review" warning in the confirmation dialog.
- **Sticky toolbars** — the Select All/Clear/Apply bar and the Back/Finalise footer during bulk upload review now stay pinned while scrolling a long file list.
- **Two-step select-all (Gmail pattern)** — header checkbox now only selects the current page by default; a banner offers a deliberate second action to expand to every document matching the current filters across all pages. Implemented via `resolveSelectAllTargets`, `isPageFullySelected`, `shouldOfferSelectAllAcrossPages`, `countSelectedOutsideCurrentPage`, and `applySelectAllToPage` in `src/components/documents/documentsTableLogic.ts`.
- **Responsive grid fix** — changed 5 occurrences of `col-span-2` to `sm:col-span-2` in `AssessmentToolForm.tsx`.
- **Cross-page selection fix** — `applySelectAllToPage` does a Set-based add/remove against the existing selection instead of a wholesale replace; `handleSelectAll` in `DocumentsTable.tsx` delegates to it.
- **Audit-failure visibility** — extracted `resolveBulkDeleteToast` into new file `src/pages/admin/documentsRegisterLogic.ts`; shows `toast.warning(...)` when the audit log write fails instead of a plain success.
- **Role source fix** — `BulkActionToolbar.tsx` switched from `useAuth()` to `useEffectiveRole()`, now passes `effectiveRole` into `getAvailableActions`.
- **Dead code cleanup** — removed all unused imports/variables flagged above.

## Diagnosis discipline applied

Every bot-flagged finding was verified against current HEAD code before being accepted as a real bug (per the session's established discipline) — none were assumed correct from the bot's description alone. For finding #7 (role source), traced `getAvailableActions`'s `userRole` parameter through to `isAdminRole`/`canManageCompliance` in `roleChecks.ts`, confirmed those expect tenant-scoped role strings (e.g. `'Administrator'`, `'Compliance Manager'`), and confirmed `profile.role` per `CLAUDE.md`'s documented role model is platform-level only (`super_admin`/`null`) — so the bug was real and would silently break bulk actions for every non-super_admin tenant user.

## Tests added

- `tests/documents/documentsTableLogic.test.ts` — 4 new tests for `applySelectAllToPage` (cross-page add/remove, no duplication, no-op on empty).
- `tests/documents/documentsRegisterLogic.test.ts` (new file) — 2 tests for `resolveBulkDeleteToast` (success path, audit-failure warning path).
- `tests/documents/bulkActionToolbar.test.ts` — 2 new tests proving a platform-level role (`undefined`) yields zero available actions while the correct tenant role unlocks them, documenting the exact regression class fixed.
- Full suite run: 36 tests passing across 4 test files. `npx tsc --incremental --noEmit` and `npx eslint --max-warnings=0` both clean on every touched file.

## Files changed

| Area | Files |
|---|---|
| Components | `src/components/documents/DocumentsTable.tsx`, `src/components/documents/documentsTableLogic.ts`, `src/components/documents/BulkActionToolbar.tsx`, `src/components/documents/bulkActionToolbarLogic.ts`, `src/components/documents/DocumentReviewPanel.tsx`, `src/components/documents/BulkDocumentUploadStep3.tsx`, `src/components/documents/ClientDocumentRepository.tsx` |
| Pages | `src/pages/admin/DocumentsRegister.tsx`, `src/pages/admin/documentsRegisterLogic.ts` (new), `src/pages/registers/assessment-tools/components/AssessmentToolForm.tsx` |
| Tests | `tests/documents/bulkActionToolbar.test.ts`, `tests/documents/documentsRegisterLogic.test.ts` (new), `tests/documents/documentsTableLogic.test.ts`, `tests/permissions/roleChecks.test.ts` |

## Notes / follow-up

- All work landed on a single branch (`fix/assessment-tool-form-responsive-grid`) per Brian's explicit "all fixes, one branch" instruction for this session — including the unrelated Documents Register UX work, which would otherwise have warranted its own branch.
- QA for this PR ran against production DB (non-migration branch — no branch DB was created, per the standard non-migration flow).
- No further follow-up items identified at merge time.
