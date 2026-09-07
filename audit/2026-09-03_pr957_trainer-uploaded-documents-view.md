# Audit — PR #957

> **Date:** 2026-09-03; **Merged:** 2026-09-03 01:33:05 UTC
> **Scope:** Click-to-view + tooltips on the 4 Onboarding Evidence Summary tiles (Trainer Matrix), plus a `/fresh-eyes` pass that found and fixed several bugs in the same feature before it shipped.
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — tracked via `active-work.md` worktree C registry, in-session

---

## Summary

PR #957 adds click-through to the Onboarding Evidence Summary card on the Trainer Matrix page: the
Uploaded, Linked, and Orphaned tiles now open a dialog listing the actual documents behind that
count (with preview and download), and all four tiles get an explanatory hover tooltip. This part
shipped first as commit `65b3d4a53`.

A `/fresh-eyes` adversarial review was then run against the branch before it was considered done.
It verified every Supabase read/write in the new code against the live project rather than trusting
the code's own assumptions, and confirmed three real bugs plus several smaller issues:

- **Orphaned tile count vs. dialog list disagreed** — the tile computed "orphaned" by arithmetic
  subtraction assuming disjoint sets; a document that was both linked *and* had a terminal
  disposition got double-subtracted. Live query against production found **9 real trainers** where
  the tile read a reassuring lower number (0 in 6 of the 9 cases) while the dialog listed 1–2 actual
  unreconciled files — and because the tile read 0, the red compliance warning banner was also
  suppressed.
- **File preview silently failed for 27% of production documents** (141 of 520 `evidence_documents`
  rows) — files stored under a legacy trainer-id path are blocked by a RESTRICTIVE storage policy
  when previewed via a direct signed URL. Download worked fine on the same row because it already
  routed through the correct gateway helper (`fetchResolvedEvidenceBlob`); preview did not.
- **Query errors rendered as "no documents in this category"** — the dialog didn't capture `error`
  from its query, so a real fetch failure was indistinguishable from a genuinely empty result.

Brian asked for all three fixed, plus two smaller items surfaced in follow-up discussion (only the
first link shown per multi-linked document; whether Consultants should see PD record titles). The
second commit (`aa7e65825`) fixed everything except the last item, which turned out — after live
verification — not to be a bug at all (see Problem statement, last row).

This PR changed 6 files, no migrations, no edge functions. Highest-risk behavioural change: none —
purely additive UI plus bug fixes to code that hadn't shipped to users yet (this was the same
branch, not a regression of already-live behaviour).

**Branch:** `feat/trainer-uploaded-documents-view` (merged; not yet deleted) · **Merge commit:**
`daa98eca6a3d619433f8220c9d4b494b8f470c80` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/957

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| **(fresh-eyes)** Orphaned tile count | Tile showed 0 for 6 of 9 affected trainers while the dialog listed 1–2 unreconciled files; red warning banner suppressed | Tile computed `orphaned = totalDocs − (links + terminal dispositions)`, double-subtracting documents that were both linked and terminally dispositioned; dialog used a correct set filter. Two independent implementations of the same rule, one wrong. |
| **(fresh-eyes)** File preview | Eye icon failed with "Cannot preview this file" for legacy trainer-path documents; Download on the same row worked | `handlePreview` called `supabase.storage.createSignedUrl` directly; RESTRICTIVE storage policy `tenant_documents_tenant_scope_select` blocks that path for non-tenant-prefixed keys. Download already used the correct gateway helper; preview didn't. |
| **(fresh-eyes)** Dialog error state | Real query failures displayed as "No documents in this category" | `useQuery` destructured only `data`/`isLoading`, never `error`. |
| Multi-link display | A document linked to two records (e.g. credential + PD) showed only one badge | `linksByDoc` map kept the first link per document id and discarded the rest. |
| Consultant PD visibility (investigated, not a bug) | Suspected: Consultants can see a document is linked to a PD record but not its title | Traced live: `sec.has_tenant_role`'s own body auto-appends `'Consultant'` to the effective role set whenever `'Administrator'` is requested — confirmed real active Consultant `tenant_members` rows exist in tenants with `trainer_pd` data. The RESTRICTIVE `restrict_select_trainer_pd` policy already permits Consultant reads. **False positive** — no fix needed, no migration written. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `65b3d4a53` | Add click-through dialog + tooltips for the 4 Onboarding Evidence Summary tiles |
| `5fdf19925` | Merge `origin/main` into the branch (picked up unrelated PR #955/#956 work already on `main`) |
| `aa7e65825` | Fix orphaned-count/dialog divergence, broken preview, swallowed query error, dialog title flicker, keyboard-unreachable tooltip, missing tenant filter on label lookups, multi-link display; extract data fetching into 3 hooks |
| `daa98eca6` | Merge PR #957 into `main` |

---

## Fixes shipped

### Frontend

- **`src/lib/trainerMatrix/evidenceClassification.ts`** (new) — single shared `isDocOrphaned`/`isDocLinked` classification, used by both the tile and the dialog so they structurally cannot disagree again.
- **`src/hooks/useTrainerEvidenceReconciliation.ts`** (new) — tile counts, now computed from one exact document fetch instead of 5 separate `head:true` disposition counts + an arithmetic subtraction.
- **`src/hooks/useTrainerOnboardingSession.ts`** (new) — the card's "confirmed" session lookup.
- **`src/hooks/useTrainerDocumentsDialog.ts`** (new) — the dialog's document/link/label fetch, now returning every link per document (`linkedLabels: {key, text}[]`) instead of just the first.
- **`src/components/trainer-matrix/OnboardingSummaryCard.tsx`** — consumes the two hooks above instead of fetching inline; dialog `mode` is now frozen separately from `open` so the title/description no longer flip during the Radix close animation; Records tile tooltip trigger changed from a plain `<div>` to a `<button>` so keyboard/screen-reader users can reach it.
- **`src/components/trainer-matrix/TrainerDocumentsDialog.tsx`** — consumes `useTrainerDocumentsDialog`; `handlePreview` now calls `fetchResolvedEvidenceBlob` (creating/revoking a blob URL) instead of a direct `createSignedUrl`, matching the pattern already used by the sibling `LinkedEvidenceList.tsx`; renders a distinct error state when the query fails; shows one badge per link instead of one badge total; label lookups (`trainer_matrix_credentials`/`trainer_pd`/`trainer_industry_currency`) gained an explicit `.eq('tenant_id', tenantId)` filter for defense-in-depth. File dropped from 361 to 268 lines, under this repo's ~300-line component guidance, and no longer calls `supabase.from()` directly (moved to the new hooks, per this repo's hooks-only convention).

### Database

None. A migration widening `trainer_pd`'s RLS policy to explicitly include Consultant was drafted
(`supabase migration new allow_consultant_read_trainer_pd`) but deleted unapplied after live
verification showed the policy already permits Consultant reads via `sec.has_tenant_role`'s
existing Administrator-implies-Consultant behaviour. No production change made.

### Edge functions

None touched, none redeployed.

---

## Review rounds

1. **`/fresh-eyes`** (`pr-review-toolkit:code-reviewer` subagent, cold context) — reviewed the full `origin/main...HEAD` diff against `CLAUDE.md`/`AGENTS.md`, verified every Supabase read/write live against project `gdwhlstfguxarnxasrrs` (column existence on 5 tables, RLS policies on `evidence_documents`/`evidence_document_links`/`trainer_pd`, storage policies on `tenant-documents`, 520 real production `evidence_documents` rows). Found the 3 confirmed bugs and 8 "worth a second look" items listed above; cleared multi-tenant isolation, no migration in scope, no edge function touched, no banned patterns except one pre-existing `as any` cast (also fixed).
2. **Fix pass** — all 3 confirmed bugs fixed; 5 of 8 second-look items fixed in the same pass (mode-flash, keyboard tooltip, missing tenant filter, blob-URL revoke on close/replace, `as any` removed by restructuring the reconciliation query); 3 parked to `active-work.md` (hooks-only refactor scope, multi-link display, Consultant PD visibility).
3. **Follow-up fix pass** (this session, on user request) — multi-link display fixed (`linkedLabels` array instead of single first-link string); data fetching extracted into 3 hooks per repo convention; Consultant PD visibility investigated live and closed as false positive (see Problem statement).
4. **Type-check + lint** — `npx tsc --incremental --noEmit` and scoped `npx eslint` on every touched/new file, run 3 times across the session (after the fresh-eyes fixes, after the multi-link fix, after the hook extraction) — clean every time, zero errors.
5. **Pre-commit hook** — `prettier --write` + `eslint --fix --max-warnings=0` ran automatically on commit, no manual fixes needed after.

---

## Production rollout (post-merge)

1. **Vercel production** — `dpl_HA4BeBnZv4r1RpLZvTdNXwYfUULf`; `state`/`target`: **READY** / **production**; SHA `daa98eca6a3d619433f8220c9d4b494b8f470c80` (merge commit). Inspector: https://vercel.com/complyhub/complyhub-rto/HA4BeBnZv4r1RpLZvTdNXwYfUULf
2. **Edge functions** — none.
3. **Migrations** — none (see Fixes shipped → Database for the drafted-then-deleted migration).
4. **Worktrees** — worktree C (`rto-compass-hub-C`) confirmed clean, fetched `origin/main`, checked out `main` at `daa98eca6`, fast-forwarded cleanly. Registry row released to `unclaimed`/Ready.

---

## Manual QA checklist (post-merge — Brian-gated)

Not done in-session (no authenticated browser pass after deploy). PR body includes the same list as
its test plan:

- [ ] Open a trainer with evidence documents in the Trainer Matrix; confirm all 4 tiles render with correct counts and hover tooltips
- [ ] Click each tile (Uploaded/Linked/Orphaned) and confirm the dialog list matches the tile count exactly
- [ ] For a trainer with a legacy trainer-path stored file, confirm preview (eye icon) now works, not just download
- [ ] Confirm a document linked to more than one record (credential + PD, etc.) shows a badge for each link
- [ ] Confirm closing the dialog doesn't flash the wrong title/description during the animation

---

## Still open / follow-up

- **Only the first link's record type was queryable per document before this session's fix** — now
  resolved (see Fixes shipped), no longer open.
- **Consultant visibility into `trainer_pd`** — closed as false positive this session; no code or
  policy change needed. If a real Consultant-visibility gap is ever reported on this page, re-verify
  live rather than assuming this investigation covers every table — it only checked `trainer_pd`.
- **General hooks-only convention** — this PR's own two components were the example of the
  violation; now fixed here, but the wider `src/hooks/` directory still has other files with
  Lovable-era `useState`+`useEffect` patterns per `src/hooks/CLAUDE.md` — out of scope for this PR.

---

## Soak status

No feature flag. Risk: low — the shipped bugs were caught and fixed before any user interacted with
this feature (same branch, pre-first-release), not a regression of live behaviour. Watch: any report
of a tile/dialog count still disagreeing (would indicate a classification edge case the shared
module doesn't cover) or a preview still failing for a specific document (would indicate a third
storage-path shape not handled by `fetchResolvedEvidenceBlob`'s existing gateway logic).

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/957
- Merge commit: `daa98eca6a3d619433f8220c9d4b494b8f470c80`
- Production deploy: https://vercel.com/complyhub/complyhub-rto/HA4BeBnZv4r1RpLZvTdNXwYfUULf
- Active work ledger: `active-work.md`
