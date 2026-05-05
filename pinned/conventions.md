> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** medium — RLS and Edge function sections added from production incident; other sections still scaffold.

# System Design — Conventions & Patterns

## Scope of these conventions

## Multi-tenant model

## RLS (Row Level Security)

RLS is the primary access control layer for all `public` schema tables. It works reliably for PostgREST queries (data reads and writes via the JS SDK).

**RLS on Supabase Storage is different and less reliable from the browser.** The storage server has its own internal tables (`storage.buckets`, `storage.buckets_analytics`, `storage.s3_multipart_uploads`, etc.) that have RLS enabled but are owned by Supabase — you cannot add policies to some of them without support involvement. The SDK's endpoint routing also changes across minor versions without notice, which means a correct `storage.objects` RLS policy can still produce 400 errors from the browser.

**Rule:** If a private bucket Storage operation fails from the browser after one RLS fix attempt, pivot to the Edge Function gateway pattern rather than adding more policies. See `patterns/storage-gateway.md` for the full pattern and `supabase/functions/document-file-manager/` as the reference implementation.

**Diagnostic shortcut:** A working `/object/list/{bucket}` does not prove that download will work — list uses a different internal code path. Do not treat listing success as RLS proof.

## Edge functions

Edge Functions run as Deno on Supabase infrastructure. They have access to `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env.get()`, which bypasses all RLS.

**Storage gateway pattern:** All private bucket operations that have proven fragile from the browser are routed through an Edge Function. The function verifies the caller's JWT, checks tenant membership via the admin client, then performs Storage I/O as service role.

Reference implementations in the codebase:

| Function | Bucket | Frontend gateway |
|---|---|---|
| `supabase/functions/document-file-manager/` | `documents` | `src/lib/documentFiles.ts` |
| `supabase/functions/register-evidence-manager/` | `trainer-evidence` | `src/lib/storage/trainerEvidenceDownload.ts` |

When adding a new private bucket, default to this pattern from the start. See `patterns/storage-gateway.md` for the full write-up.

## Frontend patterns

## Database conventions

## New table checklist

## What NOT to do

### Never hardcode service URLs or credentials in source code

Service URLs (Supabase project URL, API base URLs, etc.) and credentials (anon keys, service-role keys, API secrets) must **only** come from environment variables. Never embed them as string literals in source files — even as a fallback.

**Wrong:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://your-project.supabase.co';
```

**Right:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is not set');
```

If the env var is missing, surface a clear error rather than silently falling back to a hardcoded value. Hardcoded URLs leak infrastructure details into the public repo and create a false sense of security.

This applies equally to any code written by Claude in Lovable prompts, KB docs, or direct file edits — prompts that end up as committed code are held to the same standard.

**Lovable exception — anon key only:** Lovable regenerates `src/integrations/supabase/client.ts` and does not support exporting constants from it safely. Frontend gateway files (`src/lib/documentFiles.ts`, etc.) that call Edge Functions need both the project URL and the anon key to construct auth headers for Kong. The anon key is a **public** key — it is already committed in `client.ts` and safe to expose in browser code. Inlining it as a local constant in gateway files is acceptable. The service role key must never appear in any frontend file under any circumstances.
