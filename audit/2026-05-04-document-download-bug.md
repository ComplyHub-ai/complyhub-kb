> **Archived:** 5 May 2026 · **Event date:** 4 May 2026 · **Type:** Bug investigation — resolved

# Document Download Bug — Full Debug Session

**Date:** 4 May 2026
**Bug:** Document downloads broken for all users on ComplyHub
**Tester/Developer:** Brian
**Project:** ComplyHub.ai — `/admin/documents-register`

> **Architectural outcome:** This session produced the storage gateway pattern now documented in `complyhub-kb/pinned/conventions.md` and `patterns/storage-gateway.md`. The decision to route all private bucket operations through Edge Functions is permanently recorded in `complyhub-kb/pinned/decisions.md`.

---

## The Original Symptom

Clicking download on any document in `/admin/documents-register` returned a "Failed to download document" toast with a 400 error. Affected all documents, all users, all buckets. Started around 30 April 2026.

---

## The Full Journey — In Order

### Phase 1 — Initial Diagnosis

Ran the full 6-step ComplyHub Bug Fix Flow. Investigated `handleDownload` in `DocumentsRegister.tsx` — the code itself looked clean. Started tracing every possible cause systematically.

**Theories investigated and ruled out:**

| Theory | Result |
|---|---|
| File path format mismatch in DB vs storage | ❌ Ruled out — paths matched exactly |
| `is_tenant_member_safe()` function missing | ❌ Ruled out — exists, returns TRUE |
| `tenant_members` row missing or inactive | ❌ Ruled out — row present, active |
| Super admin bypass needed | ❌ Ruled out — user is not super admin |
| Trigger on `storage.objects` interfering | ❌ Ruled out — no triggers exist |
| Bucket config changed | ❌ Ruled out — unchanged |
| `profiles` permission error | ❌ Ruled out — background noise |

---

### Phase 2 — First Root Cause Found and Fixed

**Root cause:** `enforce_tenant_upload_limit` — a RESTRICTIVE INSERT policy added on 30 April 2026 (migration `20260430000850`) was intercepting Supabase Storage's internal writes during download operations and returning 403. The `documents` bucket was not in the exempt list.

**Fix 1 — enforce_tenant_upload_limit** ✅
- Added `documents` to the exempt bucket list
- Migration: `20260504024840`
- Result: Error changed from 403 → 400, confirming the fix worked but revealed a deeper issue underneath

---

### Phase 3 — Side Bug Fixed Along the Way

**Root cause:** `useConsultantClients.ts` was attempting a PostgREST FK join from `tenant_members` → `tenant_plans`. That relationship doesn't exist in the schema, causing a PGRST200 error crashing the consultant page.

**Fix 2 — PGRST200 consultant page crash** ✅
- Changed the query to read plan data directly from the `tenants` table which was already joined
- Commit: `81c9de9a3`
- Result: Consultant page load fixed

---

### Phase 4 — Architecture Fix

After Fix 1 changed the error from 403 → 400, we investigated the new error. Claude Code found that `.download()` in `@supabase/storage-js` v2.81.1 was hitting the wrong endpoint.

**What we found:** 17 call sites across 14 files all using inline `.download()` calls with no shared abstraction.

**Fix 3 — Created shared download utility and replaced all 17 call sites** ✅
- Created `src/lib/utils/storageDownload.ts` as a single centralised download function
- Replaced all 17 inline `.download()` calls across 14 files

---

### Phase 5 — Three Failed Approaches

| Approach | Why it failed |
|---|---|
| SDK `.download()` | "Bucket not found" 400 — RLS on `storage.buckets` blocking lookup |
| `createSignedUrl` + fetch | POSTs to `/object/sign/` → inserts into token table → RLS block on internal table |
| Manual fetch to `/object/authenticated/` with Bearer JWT | Missing `apikey` header — Kong gateway needs both headers |
| Manual fetch with both `Authorization` + `apikey` headers | Still RLS insert block — `/object/authenticated/` writes to internal tracking table |

---

### Phase 6 — Supabase Internal Tables Investigation

**What we found — all 8 storage tables have RLS enabled:**

| Table | Policies | Can Modify |
|---|---|---|
| `storage.buckets` | Zero (before fix) | ✅ Yes |
| `storage.buckets_analytics` | Zero (before fix) | ✅ Yes |
| `storage.buckets_vectors` | Zero | ❌ Not owner |
| `storage.migrations` | Zero | ❌ Not owner |
| `storage.objects` | Fully covered | ✅ Yes |
| `storage.s3_multipart_uploads` | Zero (before fix) | ✅ Yes |
| `storage.s3_multipart_uploads_parts` | Zero (before fix) | ✅ Yes |
| `storage.vector_indexes` | Zero | ❌ Not owner |

Fixes 4 & 5 added policies to the modifiable internal tables. Downloads still failed — the block was on `vector_indexes` and `buckets_vectors` which Supabase owns.

**Final resolution:** Routed all `documents` bucket operations through the `document-file-manager` Edge Function (service role bypasses all RLS). See `decisions.md` and `conventions.md`.

---

## Also Fixed Along the Way

- `is_tenant_member_safe` locked into version control via migration `20260504000823`
- Unrelated bug spotted: `enforce_tenant_upload_limit` trial-active exemption reads `storage.foldername(t.name)[1]` instead of `storage.foldername(name)[1]` — `try_cast_uuid` always returns NULL for a company name, silently breaking the trial bypass. Flagged for follow-up.

---

## Environment at Session

| Field | Value |
|---|---|
| Tenant | Vivacity Testing Tenant |
| Supabase Project Ref | `gdwhlstfguxarnxasrrs` |
| SDK Version | `@supabase/storage-js` 2.81.1 |
| Repo Commit at Session Start | `c95c39656` |
