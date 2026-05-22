> **Archived:** 22 May 2026 · **Event date:** 22 May 2026 · **Type:** Local dev setup — Vercel migration prep

# Local Run Fixes — 4 Changes to Run Codebase Locally

**Date:** 22 May 2026
**Developer:** Brian (with Claude Code)
**Branch:** `fix/local-run` on `ComplyHub-ai/rto-compass-hub`
**Commit:** `516db4ec9`
**Purpose:** Verify codebase stability before migrating from Lovable to Vercel by running it locally on Windows/Node 24

---

## Context

As part of preparing for the Vercel migration, the goal was to run `rto-compass-hub` locally to verify it boots and builds cleanly. Four blockers were discovered and fixed on the `fix/local-run` branch. `main` was not touched.

---

## Fixes Applied

### Fix 1 — `date-fns` downgraded `^4.1.0` → `^3.6.0`

**File:** `package.json`

**Problem:** `npm install` failed with `ERESOLVE` — `react-day-picker@8.10.1` declares a peer dependency of `date-fns@^2.28.0 || ^3.0.0`. The project had `date-fns@^4.1.0` which is outside that range. npm refused to install.

**Fix:** Downgraded `date-fns` to `^3.6.0`. date-fns v3 is compatible with the rest of the codebase — no API-breaking changes affect the app. `react-day-picker@8.x` uses date-fns v3 internals correctly.

**Note:** This is a real bug in `main` that should be applied via a Lovable prompt. date-fns v4 has breaking API changes that could silently break calendar/date picker components at runtime.

---

### Fix 2 — `engines` field relaxed `>=18 <23` → `>=18`

**File:** `package.json`

**Problem:** Local machine runs Node 24.15.0. The `engines` field declared `>=18 <23`, causing npm to warn and potentially fail engine checks. No nvm or other version manager was installed to switch Node versions.

**Fix:** Relaxed to `>=18`. Vite 7.x and all dependencies are compatible with Node 24.

**Note:** This is a local-only workaround. The Vercel build environment uses Node 20 (set in Vercel project settings), so this constraint is irrelevant on Vercel.

---

### Fix 3 — Deleted `src/pages/index.ts` (unused barrel file)

**File:** `src/pages/index.ts` (deleted)

**Problem:** The production build (`npm run build`) failed with:

```
src/pages/index.ts (1:9): "default" is not exported by "src/pages/index.ts",
imported by "src/pages/index.ts"
```

**Root cause:** Windows has a case-insensitive filesystem. The barrel file `src/pages/index.ts` re-exported `{ default as IndexPage } from './Index'`. On Windows, `./Index` resolved back to `./index.ts` (the same file), creating a circular self-reference. Rollup then failed because the file tried to export its own `default` export which doesn't exist.

On Linux (Vercel's build environment), the filesystem is case-sensitive and `./Index` correctly resolves to `Index.tsx`, so this error does not occur on Vercel — it is a Windows-only false positive.

**Fix:** Deleted the file. It was confirmed unused — no imports of `@/pages` barrel existed anywhere in the codebase.

**Note:** This file is dead code and should also be deleted from `main` via Lovable to avoid confusing future Windows developers.

---

### Fix 4 — `lazy` import moved to line 1 in `AppRoutes.tsx`

**File:** `src/AppRoutes.tsx`

**Problem:** White screen on `http://localhost:8080` after the dev server started. Browser console showed:

```
Uncaught ReferenceError: Cannot access 'lazy' before initialization
    at AppRoutes.tsx:18:32
```

**Root cause:** `lazy` from React was used on line 18 to define lazy-loaded components, but the `import { lazy } from "react"` statement appeared on line 27. Vite/SWC hit a Temporal Dead Zone (TDZ) error because the module tried to use `lazy` before its import was processed. This was caused by a Lovable edit that inserted the Consultant route lazy imports (lines 18–24) above the `import { lazy }` line.

**Fix:** Merged `lazy` into the existing React import on line 1:
- Before: `import { Suspense } from "react";` (line 1) + `import { lazy } from "react";` (line 27)
- After: `import { Suspense, lazy } from "react";` (line 1, line 27 removed)

**Note:** This is a genuine bug that also affects `main` and production. The app may be silently failing to load on first visit in some environments. Should be applied via Lovable as a priority fix.

---

## Outcome

After all 4 fixes:
- `npm install` completed cleanly (1,006 packages)
- `npm run dev` started in 453 ms at `http://localhost:8080`
- App loaded and login page rendered correctly
- `npm run build` succeeded (2m 51s, 6,340 modules transformed)
- Auth flow, routing, and super admin dashboard all functional

---

## Environment

| Field | Value |
|---|---|
| OS | Windows 11 Home Single Language 10.0.26200 |
| Node | v24.15.0 |
| npm | 11.12.1 |
| Vite | 7.1.10 |
| Branch | `fix/local-run` |
| Base commit (main) | `829890410` |
| Fix commit | `516db4ec9` |
