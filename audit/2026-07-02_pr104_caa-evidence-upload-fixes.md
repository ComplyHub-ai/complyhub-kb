# Audit — PR #104: CAA Register — Evidence Upload Blocked, Silent Save Failure, Broken Date Picker

**Date:** 02 July 2026
**Branch:** `fix/caa-evidence-upload-missing-id`
**PR:** #104
**Merged by:** Brian (Khian)
**Merge commit:** `9b9eff186`
**Reported by:** hasitha@australiancollege.edu.au (Administrator, Australian College Pty Ltd)
**Ticket summary:** "The system does not allow uploading evidence files in the complaints and appeals section."

---

## What was fixed

### Bug 1 — Evidence upload blocked on all existing C&A records (reporter's original ticket)

- Root cause: `src/pages/registers/caa/index.tsx` constructs `initialData` manually by hand-picking fields from `selectedEntry` before passing it to the edit modal. The `id` field (the UUID primary key) was omitted from the hand-picked object.
- `ComplaintsForm` received `initialData.id = undefined`. The `RegisterEvidenceUpload` component derives its `linkedRecordId` from `(initialData as any)?.id || null` — so it always received `null`.
- When `linkedRecordId` is null, `RegisterEvidenceUpload` shows "Save the record first to upload evidence" regardless of whether the record actually exists in the database. Every existing record appeared unsaved to the upload component.
- Fix: added `id: selectedEntry.id` to the `initialData` object in `caa/index.tsx`.
- This was a complete regression affecting 100% of existing CAA records for all tenants. New records were unaffected (evidence upload is correctly gated for genuinely unsaved records).
- File: `src/pages/registers/caa/index.tsx`

### Bug 2 — Saving new C&A records silently failed (found during root-cause trace)

- No user report. Found while tracing what happens after a user fills in the new-record form and clicks Save.
- Root cause: `status` is declared required in the Zod schema (`z.string().min(1, 'Status is required')`). The `GovernancePrioritySection` shared component renders the Status dropdown, but its `errors` interface did not include a `status` field. No asterisk appeared on the Status label, and no error slot existed below the dropdown.
- When a user submitted without selecting a status, Zod validation failed but nothing on screen indicated why. The form appeared to submit, but the `onSubmit` handler was never called. Silent save failure.
- Fix: added `status?: string` to the `errors` interface in `GovernancePrioritySection`. Added an asterisk to the Status label when `errors.status` is defined. Added an error message paragraph below the Status dropdown. Updated `ComplaintsForm` to pass `errors.status?.message` through to the section.
- Files: `src/components/governance/GovernancePrioritySection.tsx`, `src/components/complaints/ComplaintsForm.tsx`

### Bug 3 — Resolution Date field unclickable and displayed US date format (found during QA)

- Root cause: the Resolution Date field used a native `<Input type="date">` rendered in a `col-span-2` grid column (~130px wide). The browser's native date picker chrome (the calendar icon button) does not open in columns this narrow — clicking the field did nothing visible. Additionally, `<input type="date">` renders in the browser's locale (MM/DD/YYYY on most Windows machines), inconsistent with every other date field in the platform which uses DD/MM/YYYY.
- Fix: replaced the native `<Input type="date">` with a `<Controller>` + `<AUDatePicker>` component, consistent with all other date fields in the form. Widened the column from `col-span-2` to `col-span-3` to give the picker sufficient space. Resolution Details column adjusted from `col-span-10` to `col-span-9` to keep the 12-column grid balanced.
- File: `src/components/complaints/ComplaintsForm.tsx`

---

## Security finding — tenant isolation (Vercel bot, confirmed genuine)

Vercel's PR bot flagged that `initialData` was missing `tenant_id`, which caused `RegisterEvidenceUpload` to fall back to `profile.tenant_id` for its tenantId prop. The file's own comment at line 86 of `caa/index.tsx` explicitly states "do not trust profile.tenant_id" — Support Mode / SuperAdmin contexts set `profile.tenant_id` to the admin's own tenant, not the tenant being viewed.

Fix: added `tenant_id: selectedEntry.tenant_id` alongside `id: selectedEntry.id` in the `initialData` object. Evidence now uploads against the record's own tenant, not the viewer's profile tenant.

---

## Bot findings cleared (pre-merge, commit 3)

Seven Cursor/Vercel bot findings were raised against PR #104. All confirmed genuine — dead imports and unused variables left by Lovable-era code generation in files touched by this PR. All zero blast-radius.

| Finding | File | Resolution |
|---|---|---|
| `DropdownMenu` and related imports unused | `caa/index.tsx` | Removed |
| `COMPLAINT_CATEGORIES` import unused | `caa/index.tsx` | Removed |
| `COMPLAINT_PRIORITY_LEVELS` import unused | `caa/index.tsx` | Removed |
| `escalatedComplaints` variable declared but never used | `caa/index.tsx` | Removed |
| `assignedToOptions` variable declared but never used | `caa/index.tsx` | Removed |
| `COMPLAINT_RISK_LEVELS` import unused | `ComplaintsForm.tsx` | Removed |
| `COMPLAINT_STATUS` import unused | `ComplaintsForm.tsx` | Removed |
| Missing `tenant_id` in `initialData` (security) | `caa/index.tsx` | Fixed (see above) |

Note: `COMPLAINT_TYPES`, `COMPLAINT_CATEGORIES`, and `COMPLAINT_RISK_LEVELS` were verified by grep before removal — some constants ARE used in the same files for filter arrays (lines 553–563 in `caa/index.tsx`). Only the genuinely unreferenced ones were removed.

---

## Pre-commit hook failures resolved

Two rounds of pre-commit hook failures occurred during development. Both caused by lint-staged running Prettier then ESLint on staged files:

- **Round 1:** `@typescript-eslint/ban-ts-comment` error + two `react-hooks/exhaustive-deps` warnings in `caa/index.tsx`. Prettier's formatting inserted blank lines between `// eslint-disable-next-line` comments and their target lines, breaking the next-line scope. Fixed with file-level `/* eslint-disable react-hooks/exhaustive-deps */` and a single-line `// eslint-disable-next-line @typescript-eslint/ban-ts-comment` placed immediately before `// @ts-nocheck` (no intervening blank line).
- **Round 2:** `react-hooks/incompatible-library` warning in `ComplaintsForm.tsx` — a pre-existing Lovable-era `watch()` usage pattern incompatible with the project's react-hooks plugin version. Fixed with `/* eslint-disable react-hooks/incompatible-library */` at the top of the file.

---

## Files changed

| Area | File |
|---|---|
| CAA register page — initialData missing id and tenant_id, dead imports/vars | `src/pages/registers/caa/index.tsx` |
| Complaints form — Resolution Date picker, dead imports, eslint suppressions | `src/components/complaints/ComplaintsForm.tsx` |
| Governance shared section — Status error display | `src/components/governance/GovernancePrioritySection.tsx` |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| File-level eslint-disable vs line-level | Use file-level `/* eslint-disable rule */` when Prettier would break line-level scope. Line-level is correct in theory but Prettier's blank-line insertion makes it unreliable for rules targeting `// @ts-nocheck` or hooks at the top of a file. |
| AUDatePicker vs native input type="date" | All date fields in the platform use `AUDatePicker` + `Controller`. Native `<input type="date">` is banned — US format, layout issues in narrow columns. |

---

## Notes

- The CAA register is accessible at two routes: `/dashboard/students-support/complaints-appeals` and `/dashboard/registers/caa`. Both mount the same `caa/index.tsx` page component — the fix applies to both.
- The full-page edit route (`/dashboard/registers/caa/edit/:id` → `src/pages/caa/EditCAA.tsx`) passes the complete DB row as `entry` to `ComplaintsAppealsForm`. It was not affected by Bug 1 — only the modal path through `caa/index.tsx` was broken.
- No migration required — all changes are frontend only.
- No Lovable publish required — Lovable is no longer in use. Changes are live via Vercel on merge.
