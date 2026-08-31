# Audit — PR #904: Stage 6 — one canonical TAS Builder entrypoint (1 September 2026)

**Date:** 1 September 2026
**Branch:** `feat/tas-stage6-single-builder-entrypoint`
**PR:** [#904](https://github.com/ComplyHub-ai/rto-compass-hub/pull/904)
**Merged:** 31 August 2026, 23:40 UTC — commit `a2c2ae50c04cbc70b9e7632035c381e52093e0cb`
**Purpose:** continues #884 by removing the second, older production TAS Builder entrypoint — `/dashboard/tas/builder` and the TAS Engine build tab previously loaded two different implementations with different generation/readiness/local-state behaviour.

## Change

Confirmed by diff: the entire ~1,548-line legacy `src/pages/tas/builder/index.tsx` is deleted and replaced with a single re-export: `export { default } from '@/pages/tas/builder-sandbox';` plus an explanatory comment. Nothing else in the file changes.

## Blast radius

Checked for any import of the old file besides the route lazy-import in `AppRoutes.tsx` — none found; no named exports were in use, only default, so the re-export can't break a caller. Real behavioural effect: `/dashboard/tas/builder` and the TAS Engine build tab now render the exact same component tree. **Going forward, any change to `builder-sandbox` affects both surfaces, not just the TAS Engine tab** — relevant context for reviewing future builder-sandbox PRs (e.g. #870).

## DB/RLS impact

None — no migration, no RLS touched.

## Files changed

`src/pages/tas/builder/index.tsx`.
