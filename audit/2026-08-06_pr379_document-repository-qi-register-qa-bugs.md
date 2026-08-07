# Audit — PR #379

> **Date:** 6 August 2026 (audit written); **Merged:** 5 August 2026
> **Scope:** Document Repository Consolidation — QI register bugs found during bucket #5 manual QA
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Found during manual testing of `qi-evidence` bucket migration (PR #378). Upload appeared to succeed (toast fired) but no visual confirmation. Verified upload genuinely succeeded server-side — bug was frontend data fetch, not storage.

## PR #379 — Fix QI register: evidence not displaying, Consultant access gap, missing error state

**Branch:** `fix/qi-register-evidence-display-and-audit` (deleted post-merge) · **Merge commit:** `d3c1f14ce` · **Merged:** 5 Aug 2026 · **Files:** 3 · **No migrations**

### Bugs fixed

1. **Evidence not displaying** — `useQiYear()`/`useQiYears()` selected only 17 of 21 `qi_register` columns, omitting all 4 `asqa_evidence_*` fields. `hasEvidence` check could never be true. Fixed with shared full column list.
2. **Consultant access gap** — `SURVEY_LINK_ROLES` excluded Consultant from ASQA tab; widened to match register access pattern.
3. **Compliance Manager sidebar gap** — CM could not reach QI register from sidebar.
4. **Missing error state** — upload failures rendered as empty list.

### Production apply

Deployed (Vercel `READY`). No DB step.

### Soak status

N/A (frontend fixes during `qi-evidence` soak window).
