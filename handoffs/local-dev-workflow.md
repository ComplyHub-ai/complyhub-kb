# Local Dev Workflow — Vercel Migration Prep

**Last updated:** 22 May 2026
**Branch:** `fix/local-run` in `rto-compass-hub`
**Purpose:** Run the codebase locally to verify stability before migrating from Lovable to Vercel.

---

## Branch model

```
main              ← Lovable writes here. Production deploys from here. Never edit directly.
    |
    └── fix/local-run  ← Working branch. Has 4 fixes to run the codebase locally on Windows/Node 24.
```

`main` is never touched. All local-run fixes live on `fix/local-run` and get kept in sync with `main` via merge.

---

## Prerequisites (one-time setup)

- Node.js installed (any version >=18 — Node 24 works)
- npm 9+
- Repo cloned: `git clone https://github.com/ComplyHub-ai/rto-compass-hub.git`
- `.env` file in the repo root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set

---

## First-time setup on a new machine

```powershell
cd rto-compass-hub
git checkout fix/local-run
npm install
```

---

## Daily workflow

### Start the dev server

```powershell
cd c:\path\to\rto-compass-hub
git checkout fix/local-run
git pull
npm install                              # only needed if package.json changed
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run dev
# Open http://localhost:8080
```

### Stop the dev server

Press **Ctrl+C** in the terminal running `npm run dev`.

---

## Keeping the branch up to date with main

Run this whenever Lovable pushes new commits to `main`:

```powershell
# 1. Update main
git checkout main
git pull

# 2. Bring changes into working branch
git checkout fix/local-run
git merge main
```

If there are no conflicts (usual case — Lovable touches different files), it completes automatically.
If git reports conflicts, do not resolve them autonomously — flag to Brian.

---

## Checking if new main commits will cause local-run issues

```powershell
# 1. Get latest main
git checkout main && git pull

# 2. Switch to branch
git checkout fix/local-run

# 3. Dry-run the merge (does not commit anything)
git merge main --no-commit --no-ff

# 4. Check for conflicts
git status

# 5. Always abort after checking — leave the branch clean
git merge --abort
```

Things to inspect manually after a merge check:
- `package.json` — any new or changed dependencies? Check for peer dep conflicts (especially `date-fns`, `react-day-picker`, `react-router-dom`)
- `src/AppRoutes.tsx` — any new lazy imports added before the `import { lazy }` line?
- New files in `src/pages/` named `index.ts` — these cause Windows build failures (case-insensitive FS)

---

## Test a production build (Vercel simulation)

```powershell
cd rto-compass-hub
git checkout fix/local-run
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
npm run preview
# Open http://localhost:4173
```

A successful build outputs `dist/` with hashed assets and prints `✓ built in X`.

---

## What was changed on fix/local-run vs main

| File | Change | Reason |
|---|---|---|
| `package.json` | `date-fns` `^4.1.0` → `^3.6.0` | `react-day-picker@8.x` peer dep only supports date-fns v2/v3 |
| `package.json` | `engines` `>=18 <23` → `>=18` | Allows Node 24 (installed locally) |
| `src/pages/index.ts` | Deleted | Unused barrel file; Windows case-insensitive FS caused circular build failure |
| `src/AppRoutes.tsx` | `lazy` moved to line 1 import | Was imported on line 27 but used on line 18 — TDZ error caused white screen |

The `date-fns` downgrade and the `AppRoutes.tsx` fix are real bugs that should be applied to `main` via Lovable. The other two are Windows/Node 24 local-only workarounds.

---

## Known console warnings (not bugs)

| Warning | Source | Impact |
|---|---|---|
| `feature_visibility` 401 on load | AppContext fetches before auth session exists | None — handled gracefully, defaults to empty map |
| `preview_sessions` 406 after login | Query missing `.maybeSingle()` | None — doesn't block app |
| `fetchUserProfile timed out after 10s` | Slow Supabase cold-start | App recovers via safety timeout — monitor if frequent |
| Tailwind safelist pattern warnings | Unused patterns in `tailwind.config.ts` | Build noise only, no runtime impact |
