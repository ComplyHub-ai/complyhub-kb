# GitHub Trail — rto-compass-hub

Tracks commit baselines, migration state, and resolved infrastructure findings
for the `rto-compass-hub` codebase. Update after each session that advances HEAD
or resolves a tracked issue.

---

## Current Baseline

| Field | Value |
|-------|-------|
| **HEAD (local + origin)** | `05dc90996` |
| **Commit message** | *(migration: add is_tenant_member_safe function)* |
| **Date confirmed** | 4 May 2026 |
| **Latest migration** | `20260504000823_9b12d4ef-cd2d-4bb4-bc70-3418d6405b7a.sql` |

---

## Session Log

### 4 May 2026 — Storage RLS Audit + is_tenant_member_safe fix

**Starting HEAD:** `69c3abf9e` (local) / `e2ae16e54` (origin at session start)  
**Ending HEAD:** `05dc90996`

#### Commits pulled this session
```
05dc90996  (migration: add is_tenant_member_safe function)
aa3c149ed  (TAS builder label/UI changes)
e2ae16e54  Swapped labels
b78ed0b34  Changes
dbee4150f  Rebuilt Resources tab UI
eda279b1a  Changes
95e172644  Changes
5a73c2516  Changes
eb0cedc3f  Changes
b18ade4f0  Changes
```

#### Storage RLS bug findings — verified against live DB (`gdwhlstfguxarnxasrrs`)

**Bug 1: `public.is_tenant_member_safe()` missing from version control**
- **Status:** ✅ FIXED — `20260504000823_9b12d4ef` committed and pulled
- **What it was:** Function existed only in the live Supabase DB (applied via dashboard).
  Called by 5 migration files across `documents` bucket SELECT/INSERT/UPDATE/DELETE policies.
  A fresh migration run would have failed to create the policies, silently breaking all
  document downloads for every tenant.
- **Fix:** `CREATE OR REPLACE FUNCTION` migration added. Signature locked:
  `public.is_tenant_member_safe(p_user_id uuid, p_tenant_id uuid) RETURNS boolean`
  `LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''`

**Bug 2: `SELECT tenant_id FROM profiles WHERE id = auth.uid()` pattern**
- **Status:** ✅ RESOLVED in migrations — pattern not present in any current policy

**Bug 3: `(storage.foldername(name))[2]` path index**
- **Status:** ✅ NOT present for the 4 buckets in scope. Present only in
  `20260427033455` for `evidence` / `third_party_files` — intentional OR pattern
  accommodating known prefix path layout, not a bug.

#### Remaining known issues (not fixed, separate tickets)

| Issue | Bucket | Detail |
|-------|--------|--------|
| Redundant `profiles` join | `industry-evidence` | Uses `tenants JOIN profiles` to resolve tenant_id instead of querying `tenant_members` directly |
| Redundant `profiles` join | `evidence-attachments` | Joins `tenant_members → profiles` to get `tenant_id` when `tm.tenant_id` already exists |
| Open write | `organisation-assets` | Any authenticated user can upload — no tenant scoping |

#### Storage RLS current policy summary (as of `05dc90996`)

| Bucket | SELECT | INSERT | Pattern |
|--------|--------|--------|---------|
| `documents` | `is_tenant_member_safe()` | `is_tenant_member_safe()` | Clean ✅ |
| `industry-evidence` | `tenants JOIN profiles` | `tenants JOIN profiles` | Functional, inconsistent |
| `organisation-assets` | Public (no auth) | Any authenticated user | Open write |
| `evidence-attachments` | `tenant_members JOIN profiles` | `tenant_members JOIN profiles` | Redundant join, functional |

---

## Function Registry (manually-applied, now version-controlled)

Functions that existed only in the live DB and have since been locked into migrations:

| Function | Migration | Date fixed |
|----------|-----------|------------|
| `public.is_tenant_member_safe(uuid, uuid)` | `20260504000823_9b12d4ef` | 4 May 2026 |
