> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** low — scaffold mostly empty; first real entry added 5 May 2026.

# Product Decisions (Index)

## Decided

### All `documents` bucket operations are gated through the `document-file-manager` Edge Function
**Decided:** 5 May 2026  
**Who:** Senior dev (applied fix after day-long RLS debugging session)  
**Status:** Implemented — `supabase/functions/document-file-manager/`, `src/lib/documentFiles.ts`

Browser-to-Storage operations on the `documents` private bucket proved unreliable across SDK versions due to internal Supabase storage table RLS behaviour outside our control. All uploads, downloads, and deletes for this bucket now route through a Deno Edge Function running as service role. The Edge Function verifies the caller's JWT and checks active tenant membership before performing Storage I/O.

Consequence: do not add direct `supabase.storage.from('documents')` calls in frontend code. Use `uploadDocumentFile`, `downloadDocumentFile`, `deleteDocumentFile` from `src/lib/documentFiles.ts`.

See `patterns/storage-gateway.md` for the full architectural pattern.

---

### `trainer-evidence` bucket is gated through `register-evidence-manager` Edge Function
**Decided:** prior to 5 May 2026 (pre-existing)  
**Status:** Implemented — `supabase/functions/register-evidence-manager/`, `src/lib/storage/trainerEvidenceDownload.ts`

Same pattern as `document-file-manager`. The RESTRICTIVE `trainer_evidence_tenant_scope_select` storage policy makes direct signed URL creation from the browser unreliable for cross-tenant access (consultants, super admins). Edge Function with service role bypasses this.

---

## Open decisions

## Retired / superseded
