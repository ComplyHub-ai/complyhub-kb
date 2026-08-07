# Audit — PR #350

> **Date:** 6 August 2026 (audit written); **Merged:** 3 August 2026
> **Scope:** Document Repository Consolidation — Phase 4 direct decommission of confirmed-dead storage buckets
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

First production decommission pass for the consolidation project. Dropped 15 storage buckets confirmed to have zero objects **and** zero live code references (frontend + edge functions cross-checked). Three buckets initially on the target list (`evidence-trainers`, `register-evidence`, `meeting-packs`) were pulled after Cursor Bugbot found active frontend usage — reclassified into Phase 3 migration scope instead.

Applied via Supabase Dashboard UI (direct SQL `DELETE` on `storage.buckets` blocked by `protect_delete()` trigger). Live bucket count fell from 55 → 41.

## PR #350 — Decommission confirmed-dead storage buckets

**Branch:** `fix/decommission-dead-storage-buckets` (deleted post-merge) · **Merge commit:** `71fb5a91b` · **Merged:** 3 Aug 2026

### Buckets removed

`aqf-evidence`, `branding-logos`, `compliance-documents`, `compliance-spreadsheets`, `complybot-training`, `docs-original`, `docs-previews`, `forms-exports`, `governance-meeting-artefacts`, `marketing-evidence`, `organization-assets`, `public-assets`, `student-support`, `TP-attachments`, `training-products`

### Production apply

Migration applied to production. No soak period — buckets were empty and unreferenced.

### Soak status

N/A (empty buckets).

### Follow-up

PR #355 fixed branch-DB provisioning blocked by an earlier version of this migration. `governance-meeting-artefacts` rename to `meeting-documents` confirmed intentional via git history (not a mistaken decommission).
