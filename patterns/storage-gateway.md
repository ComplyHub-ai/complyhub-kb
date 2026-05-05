> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — pattern proven in production, two reference implementations in codebase.

# Pattern: Storage Gateway Edge Function

## Problem

Supabase Storage on private buckets is accessed by the browser via the JS SDK or direct fetch. This route goes through:

1. RLS on `storage.objects` (the object-level check)
2. RLS on internal storage tables (`storage.buckets`, `storage.buckets_analytics`, `storage.s3_multipart_uploads`, etc.)
3. The storage server's own routing (endpoint paths change across SDK versions)

Any one of these layers can block an operation. Internal storage tables (2) are owned by Supabase, cannot have policies added without support involvement, and change behaviour across storage server versions without warning. The SDK routing (3) has changed silently between minor versions — for example, `@supabase/storage-js` v2.81.x calls `/object/info/{bucket}/{path}` instead of the documented `/object/{bucket}/{path}`, returning 400 on private buckets even when RLS is correctly configured.

**Result:** Browser-to-Storage operations on private buckets are fragile. You can spend a day adding policies and swapping SDK methods without fixing the problem.

---

## The diagnostic trap to avoid

The failure mode looks like this:

1. Download fails with 400 or 403.
2. Investigate `storage.objects` RLS — policies look correct.
3. Try a different SDK method → different error.
4. Try manual fetch → missing header → add header → different error.
5. Discover an internal storage table has RLS enabled with zero policies.
6. Add a policy → still blocked by a different internal table.
7. Repeat.

**The signal to stop and pivot:** If `storage.objects` SELECT policies are correct and the operation still fails after one fix attempt — do not add more policies. Route through an Edge Function instead.

The listing endpoint (`POST /object/list/{bucket}`) often works even when download is broken, because it uses a different internal query path. A working list does **not** prove that download will work.

---

## The fix: Edge Function with service role

Route all Storage I/O for a bucket through a Deno Edge Function. The browser never touches Storage directly.

```
Browser → Edge Function (verifies JWT, checks membership) → Storage (service role)
```

### Auth model

1. Browser sends its user JWT in `Authorization: Bearer {token}`.
2. Edge Function calls `auth.getUser()` with the user client to verify the JWT and get `user.id`.
3. Edge Function uses an `adminClient` (service role) to check membership / roles in `tenant_members`.
4. Edge Function performs the Storage operation as service role — bypasses all storage RLS.

### Reference implementations in codebase

| Edge Function | Bucket | Frontend gateway |
|---|---|---|
| `supabase/functions/document-file-manager/` | `documents` | `src/lib/documentFiles.ts` |
| `supabase/functions/register-evidence-manager/` | `trainer-evidence` | `src/lib/storage/trainerEvidenceDownload.ts` |

Both follow the same structure. Use either as a copy-paste starting point for a new bucket.

### Minimum viable edge function structure

```typescript
Deno.serve(async (req) => {
  // 1. Verify caller JWT
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: req.headers.get('Authorization')! } },
  });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return json({ ok: false, error: 'Unauthorized' }, 401);

  // 2. Authorise via adminClient (service role)
  const adminClient = createClient(supabaseUrl, serviceKey);
  const membership = await getActiveMembership(adminClient, user.id, tenantId);
  if (!membership) return json({ ok: false, error: 'Not a member' }, 403);

  // 3. Storage I/O with service role — no RLS involved
  const { data, error: dlErr } = await adminClient.storage.from(BUCKET).download(path);
  // ...stream back to browser
});
```

### Frontend gateway pattern

The frontend gateway (`documentFiles.ts`, `trainerEvidenceDownload.ts`) wraps the Edge Function in typed async functions. Key points:

- Calls `supabase.auth.getSession()` to get the current access token.
- Sends `Authorization: Bearer {token}` + `apikey: {anonKey}` headers (Kong gateway requires both).
- Returns a `Blob`, creates an object URL, triggers the `<a>` download, then revokes.
- The anon key is inlined as a local constant — it is a public key (already in `client.ts`) and Lovable regenerates `client.ts` so it cannot be exported from there safely.

---

## When to use this pattern vs direct SDK

| Situation | Approach |
|---|---|
| Public bucket (images, logos) | Direct SDK / public URL — no auth needed |
| Private bucket, simple project, no RLS issues | Direct SDK `.download()` is fine |
| Private bucket, persistent 400/403 after checking `storage.objects` policies | **Edge Function gateway** |
| Private bucket, cross-tenant access (e.g. consultant viewing another tenant's files) | **Edge Function gateway** — RLS alone cannot safely handle this |
| New private bucket from scratch | Default to Edge Function gateway to avoid the problem entirely |

---

## Adding a new bucket to the gateway pattern

1. Create `supabase/functions/{bucket-name}-file-manager/index.ts` — copy `document-file-manager` and change `BUCKET`, `WRITE_ROLES`, and `ALLOWED_EXTS`.
2. Create `src/lib/{bucketName}Files.ts` — copy `documentFiles.ts` and update `FN_URL` and exported function names.
3. Update `src/lib/utils/storageDownload.ts` to route `bucket === '{bucket-name}'` through the new gateway (matching the `documents` branch).
4. Deploy the Edge Function via the Supabase dashboard or CLI.

---

## Lesson learned (5 May 2026)

The `documents` bucket download was broken for approximately one week. The debugging session tried five different implementations of `storageDownload.ts` and added RLS policies to six internal storage tables before the senior dev applied this pattern.

The pattern was already in the codebase (`register-evidence-manager` for `trainer-evidence`). It was not identified as a reference point because the diagnostic process went bottom-up — fixing each specific error — rather than top-down — asking "how does the codebase already solve this class of problem?"

**Standing rule for future sessions:** When a Storage operation on a private bucket is failing and `storage.objects` policies look correct, check whether another bucket is already using the Edge Function gateway pattern before attempting further RLS fixes.
