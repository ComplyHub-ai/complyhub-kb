# Audit — PR #562: TAS import scope step reads RTO ID before its lookup resolves (21 August 2026)

**Date:** 21 August 2026
**Branch:** `fix/tas-import-scope-step-rto-id-race`
**PR:** [#562](https://github.com/ComplyHub-ai/rto-compass-hub/pull/562)
**Merged:** 21 August 2026
**Purpose:** RJ hit "No RTO ID set. Add it in RTO Settings → Organisation." at Step 2 ("Validate Scope & Governance") of the Import Existing TAS wizard, testing the same real document from the two prior fixes (PR #547, #554).

---

## Root cause

RJ's initial hypothesis was a missing fallback — add `tenants.rto_id` as a fallback when `q1_tas_builder_settings.rto_id` is empty. Confirmed live via direct query before acting on that: **both tables already had the correct value** (`"91110"`) for the affected tenant. The fallback wasn't missing either — `useTASBuilderSettings` already implements `settings?.rto_id ?? tenant?.rto_id ?? null`.

The real cause was a race condition: `StepValidateScope.tsx` fired scope validation immediately on mount (a `useEffect` with an empty dependency array, guarded to run once), without waiting for `useTASBuilderSettings`'s async React Query lookup to resolve. Since this is the first time that query runs for a given tenant in a fresh import session, the step almost always read the hook's temporary `{ rtoId: null }` default and passed an empty string through to TGA validation — which correctly reported "no RTO ID" given what it was actually sent, even though the real value arrived a moment later.

## Fix

Exposed `isSettingsLoading` from `useTasImportScopeStep`, and gated `StepValidateScope`'s effect on it — scope validation now only fires once the RTO ID lookup has actually resolved, instead of on mount unconditionally.

## Blast radius

Two files (`useTasImportScopeStep.ts`, `StepValidateScope.tsx`), both already part of the import wizard. No behaviour change for any other consumer of `useTASBuilderSettings`.

## DB/RLS impact

None — this was purely a frontend timing bug, no schema involved.

## Test plan

- `npx tsc --incremental --noEmit` clean.
- CI: all required checks passed; this path isn't CODEOWNERS-protected, merged immediately once green.
- RJ to confirm Step 2 no longer shows "No RTO ID set" on re-run.

## Process note

This is the third distinct bug found in a row while testing one real TAS document import end-to-end (upload status check → AI extraction truncation → this race condition) — each only surfaced once the previous one was fixed and RJ could get further into the wizard. Worth expecting more of the same as he continues through Steps 3–6 (Units, Market Need, Learners, AOT) for the first time with a real multi-unit document.

## Files changed

`src/hooks/useTasImportScopeStep.ts`, `src/components/tas-builder/import/StepValidateScope.tsx`.
