> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** medium — storage gateway entries are high confidence; product decisions (PD-001 to PD-006) confirmed from codebase and team input as of April 2026.

# Product Decisions (Index)

Before filing a bug or designing a feature, check here — the behaviour may be intentional. When RJ or Angela clarifies something is "by design," log it here.

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

### PD-001 — Platform Scope: Australian RTOs Only
**Decided:** April 2026

All compliance standards, terminology, and data structures (TGA sync, ASQA standards mapping) are Australian-specific by design. Non-AU content or edge cases are out of scope.

**Implication:** Do not flag AU-specific terminology, DD/MM/YYYY date formats, or regulatory references as bugs. These are intentional.

---

### PD-002 — Multi-Tenant Architecture: Highest Severity Category
**Decided:** April 2026 · **Source:** Codebase — `contexts/TenantContext`, `guards/TenantGuard`

Each RTO is a separate tenant. Tenants must never see each other's data under any circumstance. Hard isolation at the DB layer via RLS in Supabase; `TenantGuard` enforces this on the frontend.

**Implication:** Any data leakage between tenants = Critical bug (P0). Escalate immediately to RJ regardless of apparent severity.

---

### PD-003 — Role Hierarchy and SuperAdmin Impersonation
**Decided:** April 2026 · **Source:** Codebase — `guards/`, `contexts/Auth`

Multiple role levels with different access rights. SuperAdmin can impersonate tenants for support purposes via Support Mode (read-only, audit-logged).

**Implication:** Test every critical feature from each role's perspective. A feature working for SuperAdmin does NOT mean it works for Tenant or Consultant. Log the role in every bug report.

---

### PD-004 — AI Response Variation is Not a Bug
**Decided:** April 2026 · **Source:** Codebase — `supabase/functions/ai-router`, `ai-unit-risk-scorer`

The platform uses Anthropic Claude API for AI-powered features. AI responses are generative and non-deterministic — the same input may produce slightly different outputs each run.

**Implication:** Do not file bugs on AI response variation. Test for: UI crashes, failed API calls, empty response handling, timeout behaviour. Consistent harmful or wrong output IS a bug.

---

### PD-005 — TGA Data Accuracy is TGA's Responsibility
**Decided:** April 2026 · **Source:** Codebase — `supabase/functions/tga-integration`, `tga-rto-sync`

The platform syncs training product data from Training.gov.au. Data accuracy depends on TGA's own records. ComplyHub displays what TGA returns.

**Implication:** Do not flag TGA data content as a bug unless the sync itself fails (error state, wrong format, crash). If data looks wrong, verify against training.gov.au directly before filing.

---

### PD-006 — Stripe Billing Gate Enforces Feature Access
**Decided:** April 2026 · **Source:** Codebase — `supabase/functions/billing-gate`, `stripe-webhook`

Features are gated behind an active Stripe subscription. Expired or unpaid accounts are blocked from core features by the `billing-gate` edge function. Stripe webhooks update subscription status in real time.

**Implication:** Test that the gate actually blocks access when subscription is expired. Use Stripe test mode cards only — never use real card details in testing.

---

## Open decisions

## Retired / superseded
