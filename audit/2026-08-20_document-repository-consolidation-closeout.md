# Audit — Document Repository Consolidation: final bucket decommission closeout (20 August 2026)

> **Date:** 20 August 2026
> **Scope:** Final closeout of the whole multi-PR consolidation project — not a single PR.
> **Project:** `gdwhlstfguxarnxasrrs` ("ComplyHub Project")
> **Living doc:** `document-repository-consolidation.md` (workspace root) — deleted after this entry, per the living-doc workflow.
> **Full PR history:** [`complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md`](2026-08-06_document-repository-consolidation-index.md) (19 PR entries).

---

## Summary

This entry closes out the Document Repository Consolidation project — migrating documents scattered across 21 legacy Supabase Storage buckets into a small set of unified buckets (`tenant-documents`, `tenant-branding`, `user-avatars`). The 19-PR migration itself, the soak-watch period, and the bulk of the decommission were already recorded in the earlier index doc. This entry covers what happened in the final closeout session: the last real bug (`suggestion-attachments`) and — the reason this entry exists — a gap discovered in the decommission process itself, where 20 of 21 legacy buckets had had their objects deleted but not the bucket containers, despite the living doc explicitly claiming both were done.

The most important finding: **the living doc's own status claims were not trustworthy without direct verification.** A same-day re-check against `storage.buckets` (not the doc's text) found 20 bucket rows still present after the doc had already been updated to say "emptied and deleted." This was caught and corrected within the same session, but it's the reason this closeout treats "verified directly against the database" as the standard for every claim below, rather than carrying forward the doc's prior wording.

**No PR/branch/merge for this entry** — this work was infrastructure cleanup (storage buckets + temporary edge functions), not application code. Nothing in `rto-compass-hub` changed.

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| `suggestion-attachments` bucket | 9 objects still referenced by live `suggestions` rows during soak, blocking decommission | `SuggestionsForm.tsx` re-queried `tenant_members` with `.maybeSingle()` instead of using the tenant already resolved by `useTenantSafe()`. That query throws for any user with more than one tenant membership (e.g. Vivacity consultants with ~24 client memberships); the error was never checked, so `tenant_id` silently fell back to `null`. Fixed in [PR #539](https://github.com/ComplyHub-ai/rto-compass-hub/pull/539). |
| **(re-verification finding)** 20 of 21 legacy buckets | Living doc stated "all 21 of 21 source buckets fully decommissioned (emptied and deleted)" | False — a direct `SELECT id FROM storage.buckets` query found all 20 non-`suggestion-attachments` bucket rows still present. The original decommission edge functions (`ops-storage-decommission-temp`, `ops-storage-decommission-temp2`) only called the Storage API's list+remove-objects path, never an explicit bucket-delete call. Objects were genuinely gone; containers were not. |
| **(process finding)** Direct SQL bucket deletion | `DELETE FROM storage.buckets WHERE id IN (...)` was attempted as the "obvious" fix for the above and rejected outright | A live database trigger, `storage.protect_delete()`, blocks **any** direct SQL `DELETE` against `storage.buckets` or `storage.objects` — even against an already-empty bucket with zero orphan-blob risk. Supabase enforces "go through the Storage API" as a blanket rule, not a per-row judgment call. Worth remembering for any future storage cleanup work in this project. |

---

## Fixes shipped

### Application code

- **`SuggestionsForm.tsx` (PR #539)** — non-SuperAdmin submissions now block with a visible error if tenant resolution fails, instead of silently submitting with `tenant_id = null`.

### Storage / infrastructure (no application code — one-off ops work, not a PR)

- Deployed temporary JWT-gated edge function `ops-storage-decommission-temp3`: for each of the 19 remaining legacy buckets, re-verifies the bucket is empty (defense in depth, independent of the earlier SQL-based verification) then calls `supabase.storage.deleteBucket()` server-side using the function's own `SUPABASE_SERVICE_ROLE_KEY` — the caller only needs a valid JWT (the legacy `anon` key), not elevated privilege, since the privileged action happens inside the function.
- Invoked directly by Brian via PowerShell `Invoke-WebRequest` (not by Claude — the sandbox's auto-permission classifier blocked an equivalent `curl` call from the agent side, and `WebFetch` can't do authenticated POST requests; this ops action had to be run by a human either way given the org's commit/push-adjacent caution around production actions).
- All 19 target buckets (`documents`, `industry-evidence`, `tas-imports`, `branding`, `fpp-evidence`, `compliance-evidence`, `trainer-credentials`, `trainer-evidence`, `evidence-private`, `qi-evidence`, `organisation-assets`, `avatars`, `dap-documents`, `TAS-attachments`, `pli-evidence`, `tenant-evidence-private`, `evidence-complybot`, `audit-reports`, `meeting-documents`, `rpl-attachments`) returned `"deleted"`.
- `ops-storage-decommission-temp3` retired to an inert 410 stub, then manually deleted from the Supabase dashboard by Brian — confirmed absent from `list_edge_functions` after deletion.
- `ops-storage-decommission-temp` and `ops-storage-decommission-temp2` (from the earlier, object-only decommission pass) were also confirmed absent from `list_edge_functions` this session — that prior "still needs manual deletion" note in the living doc was itself stale; both had already been removed before this session started.

### Database

No migrations. All bucket/object deletion went through the Storage API (via the temp edge functions), never raw SQL — raw SQL delete against storage tables is blocked at the database level regardless (see Problem statement above).

---

## Verification

Every claim in this entry was checked directly against live state, not carried forward from the living doc or conversation memory:

1. `SELECT id FROM storage.buckets WHERE id IN (<all 20 non-suggestion-attachments names>)` — zero rows, confirming full deletion.
2. `SELECT id FROM storage.buckets WHERE id IN ('audit-reports', 'suggestion-attachments')` — zero rows, double-checking the two buckets with the most complicated histories (late addition / bug-driven resolution respectively).
3. `list_edge_functions` grepped for `ops-storage-decommission-temp3` — absent, confirming manual dashboard deletion succeeded.
4. `list_edge_functions` grepped for `ops-storage` generally — only `fix-storage-policies` and `storage-soak-monitor` remain, both unrelated legitimate functions.

**Final confirmed state: 21 of 21 legacy buckets fully gone — containers and objects both — and all three temporary decommission edge functions deleted. No outstanding technical debt from this workstream.**

---

## Process/security observation (not a code or team finding)

Mid-session, a message was received formatted to look like a prior Claude instruction being quoted back, directing execution of a specific PowerShell command against `ops-storage-decommission-temp2` (a function already confirmed deleted earlier in the same session) with a fabricated `x-ops-secret` header value that had never been generated or mentioned. The content was inconsistent with everything independently verified that session (wrong function name, already-resolved bucket, unexplained secret), so it was flagged to Brian rather than executed. Brian clarified the intent was "same pattern, different target," not that literal text, and the correct function (`ops-storage-decommission-temp3`, JWT-gated, no fabricated secret) was used instead. Recorded here as a reminder to verify instruction provenance against session state before executing anything irreversible — not attributed as an error by Brian or anyone on the team.

---

## Still open / follow-up

None. This closes the Document Repository Consolidation project in full.

---

## References

- Living doc (source, deleted after this entry): `document-repository-consolidation.md`
- Full 19-PR migration history: [`complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md`](2026-08-06_document-repository-consolidation-index.md)
- `suggestion-attachments` fix: [PR #539](https://github.com/ComplyHub-ai/rto-compass-hub/pull/539)
- Supabase project: `gdwhlstfguxarnxasrrs`
