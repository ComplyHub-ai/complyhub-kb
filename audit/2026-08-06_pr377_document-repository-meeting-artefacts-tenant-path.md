# Audit — PR #377

> **Date:** 6 August 2026 (audit written); **Merged:** 5 August 2026
> **Scope:** Document Repository Consolidation — `meeting-documents` bucket tenant-path RLS fix
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Found during Phase 4 naming reconciliation: `meeting-documents` has correct dedicated RLS requiring first path segment = `tenant_id`, but `MeetingArtefactsPanel.tsx` uploaded to `${meetingId}/...` with no tenant prefix. Meeting UUID can never equal tenant_id — INSERT policy failed silently for every non-superadmin user, every time. `MeetingMinutesUploadModal.tsx` already used the correct convention.

## PR #377 — Fix tenant-scoping bug blocking meeting artefact uploads

**Branch:** `fix/meeting-artefacts-tenant-path` (deleted post-merge) · **Merge commit:** `c30577224` · **Merged:** 5 Aug 2026 · **Files:** 2 · **No migration**

### Fix

One-line path change in `MeetingArtefactsPanel.tsx` to `${tenantId}/meetings/${meetingId}/...` (`tenantId` already available as prop). Stale comment in `governance-meeting-analyser/index.ts` updated.

### Additional cleanup

Removed `@ts-nocheck`; fixed `exhaustive-deps`; replaced 2 banned `.single()` with `.maybeSingle()`.

### Production apply

Frontend-only deploy. No migration.

### Soak status

`meeting-documents` source bucket soak started 6 Aug 2026 (PR #384 batch timers) — completes ~20 Aug 2026.

### Context

`governance-meeting-artefacts` decommission (PR #350) confirmed correct — intentional rename to `meeting-documents` per git history.
