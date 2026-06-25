# CI Cleanup — Dedicated PRs Required

Discovered during PR #65 (feat/branch-db-seed-config). These are all pre-existing
codebase-wide issues that exist on `main` — none were introduced by PR #65. Each
needs its own focused PR to avoid unmanageable diffs.

---

## Summary table

| ID | CI Check | Status | Owner | Effort |
|---|---|---|---|---|
| CLEANUP-1 | Block.single() — 212 files, ~370 hits | **Planned — not started** | Khian | Large — 5 batches |
| CLEANUP-2 | Lint (blocking) — 453 files, 741 errors | **Not started** | Khian + Carl | Large — batch by rule |
| CLEANUP-3 | Dependency review | **✅ DONE — PR #67 merged 25 Jun 2026** | Khian | Removed job from ci.yml |
| CLEANUP-4 | Supabase Preview / migration drift | **Pending — Carl's action** | Carl | Medium — Supabase CLI |

---

## PR-CLEANUP-1 — Replace `.single()` with `.maybeSingle()` across all of `src/`

**CI check:** `CI / Block.single() usage (pull_request)`
**Status:** Planned — branch `fix/single-to-maybesingle` created, work not started
**Severity:** Blocking
**Scope:** 212 files, ~370 hits (grepped 25 Jun 2026)

### Live hit count by folder

| Folder | Files | Hits |
|---|---|---|
| `src/hooks/` | 74 | 164 |
| `src/components/` | 62 | 92 |
| `src/pages/` | 50 | 69 |
| `src/lib/` | 13 | 22 |
| `src/services/` | 6 | 13 |
| `src/modules/` | 7 | 10 |
| **Total** | **212** | **~370** |

### Fix pattern per call site

1. `.single()` → `.maybeSingle()`
2. Where the next line accesses `data.field` directly with no null check, add
   `if (!data) throw new Error(...)` or `if (!data) return null`
3. Where `.single()` is on an INSERT that the DB guarantees returns exactly 1 row,
   add `// single-ok` to suppress the CI check instead of changing it

### Batching plan (5 batches, one commit gate each)

| Batch | Scope | Files | Hits | Notes |
|---|---|---|---|---|
| 1 | `src/lib/` + `src/services/` | 19 | 35 | Action files, lowest risk — **do first** |
| 2 | `src/modules/` | 7 | 10 | |
| 3 | `src/hooks/` | 74 | 164 | Pure data fetching, largest batch |
| 4 | `src/components/` | 62 | 92 | |
| 5 | `src/pages/` | 50 | 69 | |

### Batch 1 detail — already analysed (ready to execute)

**12 calls → `// single-ok`** (INSERT — DB guarantees 1 row back):
- `src/lib/ensureOrgMembershipAndDefault.ts:111`
- `src/lib/api/superadmin.ts:72 & 184`
- `src/lib/services/userTenantLinking.ts:184`
- `src/lib/services/fixedUserTenantLinking.ts:84`
- `src/services/automationService.ts:117, 165, 236, 296, 353, 407`
- `src/services/npsService.ts:19`

**18 calls → `.maybeSingle()` only** (already have safe null handling):
- `src/lib/api/users.ts:172`
- `src/lib/activityTracker.ts:90`
- `src/lib/demoSignup.ts:23`
- `src/lib/ensureOrgMembershipAndDefault.ts:43`
- `src/lib/getUserRoleAndRoute.ts:55, 74, 87`
- `src/lib/authDebug.ts:34`
- `src/lib/securityEnhancement.ts:168, 181`
- `src/lib/services/userTenantLinking.ts:307`
- `src/lib/services/tenantClassification.ts:28`
- `src/lib/tenantContext.ts:16, 48`
- `src/lib/api/adminTenants.ts:441`
- `src/services/backfillRunner.ts:123`
- `src/services/recurringEventService.ts:192`
- `src/services/unifiedRegisterService.ts:131`
- `src/services/trainerPdMirror.ts:30, 282`

**5 calls → `.maybeSingle()` + null guard needed:**
- `src/lib/ensureOrgMembershipAndDefault.ts:24` — add `if (!existingProfile) return { success: false, ... }` after profileError check
- `src/lib/api/adminTenants.ts:362` — add `if (!inviteRecord) throw new Error(...)` after queryError check
- `src/lib/api/adminTenants.ts:425` — same pattern as above
- `src/lib/services/userTenantLinking.ts:47` — add `if (!profile) return { success: false, ... }` after profileError check
- `src/lib/services/userTenantLinking.ts:366` — change `if (error)` to `if (error || !data)`

### What could break

`.maybeSingle()` makes `data` nullable. Any call site that accesses `data.field`
without a null check will fail at runtime when 0 rows are returned. TypeScript
with `strict: false` may not catch all of these — each call site must be read
and null guards added where needed. INSERT-based calls get `// single-ok`.

---

## PR-CLEANUP-2 — Lint errors across `src/`

**CI check:** `CI / Lint (blocking) (pull_request)`
**Status:** Not started — do after CLEANUP-1 is merged
**Severity:** Blocking
**Scope:** 741 errors across 453 files

### Primary error categories

| Rule | Count | Description |
|---|---|---|
| `no-restricted-syntax` | ~400+ | Use of `organisation_id` / `organization_id` — must use `tenant_id` |
| `@typescript-eslint/no-namespace` | ~20+ | ES2015 module syntax preferred over namespaces |
| `react-hooks/error-boundaries` | ~10+ | JSX inside try/catch blocks (e.g. `src/App.tsx`) |
| `@typescript-eslint/ban-ts-comment` | pre-existing | `@ts-nocheck` in source files |

### What needs to happen

1. Run `npm run lint 2>&1 | tee lint-output.txt` to capture the full list
2. For `organisation_id` / `organization_id` hits — rename to `tenant_id`
   in the query/insert (verify DB column name first via Supabase MCP)
3. For `@typescript-eslint/no-namespace` — convert namespace declarations to
   ES module exports
4. For `react-hooks/error-boundaries` (`src/App.tsx`) — move JSX out of the
   try/catch block; use an error boundary component instead
5. For `@ts-nocheck` — remove the comment and fix the TypeScript errors it was
   suppressing

### Notes

- Carl to confirm whether `organisation_id` references are dead column names or
  still exist in the DB before any renames
- Branch: `fix/lint-cleanup` (create off main after CLEANUP-1 is merged)
- Batch by rule category, not by file, so each PR is coherent and reviewable

---

## PR-CLEANUP-3 — Dependency Review ✅ DONE

**CI check:** `CI / Dependency review (pull_request)`
**Status:** Resolved — PR #67 merged 25 Jun 2026
**Resolution:** Removed the `dependency-review` job from `.github/workflows/ci.yml`.
GitHub Advanced Security (GHAS) is not included in the GitHub Teams plan and is
only available on GitHub Enterprise. Removing the job was the correct fix — the
check cannot work on this plan.

---

## PR-CLEANUP-4 — Supabase Preview / Migration Drift

**CI check:** `Supabase Preview (pull_request)`
**Status:** Pending — Carl's action required
**Severity:** Blocking Supabase branch DB creation (does not block PR merges)
**Scope:** Supabase migration history drift

### What is happening

Supabase branching fails with `Remote migration versions not found in local
migrations directory`. The production DB has had migrations applied directly
(outside of `supabase/migrations/`), so local and remote migration history
are out of sync.

### What Carl needs to do

1. Run `supabase db remote commit` to pull down unapplied remote migrations
   into local SQL files and commit them
2. OR identify which migrations were applied manually and create corresponding
   SQL files with matching timestamps
3. Once drift is resolved, branch DB creation will succeed automatically on new PRs

### Note

This does not block PR merges — it only affects Supabase branch DB creation.
All branches currently use the production DB (`gdwhlstfguxarnxasrrs`) directly.
