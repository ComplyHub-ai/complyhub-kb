# ComplyHub Platform Audit — 02 July 2026 — Session 1

**Audited by:** Fable (claude-fable-5)
**Audit started:** 02 July 2026
**KB load date:** pinned files last updated 5–26 May 2026; audit log current to 02 July 2026 (PR #104)
**Phases completed:** 1 Security, 2 Code Quality, 3 Performance, 4 SEO, 5 KB Gap — all five, single session
**Phases not completed:** none
**Codebase state:** working tree on `main`, behind `origin/main` by 111 commits at audit time. Findings reflect the on-disk tree (345 edge functions, 108 migration files in repo).

---

## Executive Summary

The platform is broadly well-architected and defended in the ways that are hardest to retrofit: route-level code splitting is comprehensive (292 lazy-loaded routes, near-zero eager page imports), React error boundaries wrap the route trees, the Stripe webhook verifies its signature before processing, the two private-bucket storage gateways (`document-file-manager`, `register-evidence-manager`) correctly enforce JWT + active-membership + super_admin deny, `ai-router` isolates user input from the system prompt, and the SEO head tags, robots.txt, sitemap and HTTPS/HSTS are all done well. Tenant isolation is genuinely enforced at the database layer via RLS for normal tenant users — the RLS agent cleared the great majority of policies as correctly `tenant_id`-scoped.

The serious problems are concentrated in two places: a **recurring class of edge functions that run as service role with `verify_jwt = false` and perform no internal authentication**, and a **super_admin RLS gate that grants unrestricted cross-tenant read by default**. Three edge functions are reachable with no valid credentials at all — `rename-user-email` (an unauthenticated account-takeover primitive against any user including super_admins), `api-v1-router` (decodes the JWT with `atob` and trusts the `tenant_id` claim with no signature check, so a forged token grants full API access to any tenant), and `tga-rto-sync` (unauthenticated, body-supplied `tenant_id` drives service-role writes). This is the *same* vulnerability that was fixed in PR #60 (`sync-consultant-tenant-access`), which confirms the fix held but the pattern was never swept from its siblings. Separately, `sec.superadmin_tenant_gate` returns `true` for a super_admin with no active tenant, re-opening the exact cross-tenant exposure class that migration `20260620110100` and Carl's CLAUDE.md explicitly say must be denied — this contradicts a documented, previously-fixed decision and should be treated as a regression.

The highest-impact quick wins (each under a day): gate or delete `rename-user-email`; flip the `superadmin_tenant_gate` no-active-tenant branch to `RETURN false`; call `queryClient.clear()` on tenant switch instead of invalidating three cache keys (closes a frontend cross-tenant stale-cache leak); wrap the governance meeting-minutes render in the existing `sanitizeHtml` (closes a stored XSS); and add `.env` to `.gitignore` before a real secret lands in the already-committed file (only public keys are in it today).

The architectural concerns needing team discussion are: (1) a systematic sweep of all `verify_jwt = false` service-role functions to add caller-auth + tenant-membership checks, which is Carl's domain; (2) confirming and completing the **failed 22 Aug 2025 index sweep** — `CREATE INDEX CONCURRENTLY` failed with SQLSTATE 25001 and was punted to "manual execution," with no evidence it ran, leaving trainer/compliance tables at risk of full table scans as RTOs scale; and (3) the large backlog of Carl-rule debt (370 `.single()`, 755 `supabase as any`, 390 raw `functions.invoke`, ~4,100 raw `console.*`, 175 hooks over 200 lines) which should be tracked cleanup epics, not one PR.

On SEO: titles, meta, Open Graph, robots and sitemap are well done, but the platform is effectively invisible to crawlers for two reasons — the homepage `/` 307-redirects to a bare `/login`, and the whole site is pure client-side-rendered with an empty `<div id="root">` body. The single highest-impact action is to serve a real, indexable marketing page at `/` (Carl's domain — `vercel.json`).

---

## Finding Summary Table

| # | Severity | Phase | Category | KB Status | One-line Summary |
|---|---|---|---|---|---|
| 001 | Critical | 1 Security | Edge Function | NEW | `rename-user-email` unauthenticated → account takeover of any user |
| 002 | Critical | 1 Security | Edge Function | NEW | `api-v1-router` trusts `atob`-decoded JWT `tenant_id`, no signature check |
| 003 | Critical | 1 Security | Edge Function | NEW | `tga-rto-sync` unauthenticated, body `tenant_id` drives service-role writes |
| 004 | Critical | 1 Security | RLS | CARL-RULE-VIOLATION / ADR-CONFLICT | `superadmin_tenant_gate` grants super_admin unrestricted cross-tenant read |
| 005 | High | 1 Security | Edge Function | NEW | `tas-create` cross-tenant IDOR — no membership check on body `tenant_id` |
| 006 | High | 1 Security | Edge Function | NEW | `api-v1-webhook-dispatch` unauthenticated signed-webhook dispatch to any tenant |
| 007 | High | 3 Performance | Frontend/Tenant | GUARDRAIL-VIOLATION | Tenant switch clears only 3 cache keys → stale cross-tenant data render |
| 008 | High | 1 Security | Frontend/XSS | NEW | Stored XSS: governance meeting minutes rendered unsanitised |
| 009 | High | 3 Performance | Database | NEW | 22 Aug 2025 index sweep failed (SQLSTATE 25001), never completed |
| 010 | High | 3 Performance | Database | NEW | Candidate ~trainer_*/tp_*/compliance tables missing tenant_id index (verify vs prod) |
| 011 | High | 1 Security | RLS | INTENTIONAL? (verify) | `has_tenant_role` silently elevates Administrator→Consultant at every policy site |
| 012 | High | 3 Performance | Edge Function | NEW | `ai-router` no timeout/AbortController; calls decommissioned Lovable AI gateway |
| 013 | High | 3 Performance | Frontend | NEW | N+1 count-query fan-out on register/dashboard/matrix screens |
| 014 | High | 2 Code Quality | Carl Rules | CARL-RULE-VIOLATION | Volume debt: 370 `.single()`, 755 `supabase as any`, 390 raw `functions.invoke` |
| 015 | High | 4 SEO | Crawlability | NEW | Homepage `/` 307-redirects to `/login`; pure CSR, empty HTML body |
| 016 | Medium | 1 Security | Edge Function | NEW | `ops-run-diagnostics` & `enforce-billing-compliance` unauthenticated (billing DoS) |
| 017 | Medium | 1 Security | RLS | NEW | `public_submit_qi_responses` UPDATE policy has no `WITH CHECK` |
| 018 | Medium | 1 Security | Config/Secrets | GUARDRAIL-VIOLATION | `.env` committed and NOT gitignored (public keys only today) |
| 019 | Medium | 1 Security | Storage | GUARDRAIL-VIOLATION | 4 direct `supabase.storage.from('documents')` calls in frontend |
| 020 | Medium | 1 Security | Frontend | CARL-RULE-VIOLATION | Hardcoded Supabase URL / literal project ID in `src/` |
| 021 | Medium | 1 Security | Frontend/XSS | NEW | `document.write(innerHTML)` print/export paths unsanitised |
| 022 | Medium | 1 Security | Edge Function | NEW | Raw `error.message` / internal detail returned to callers (edge + frontend) |
| 023 | Medium | 1 Security | Edge Function | CARL-RULE-VIOLATION | Systemic wildcard CORS `*` on JWT-accepting functions (324 fns) |
| 024 | Medium | 3 Performance | Frontend | NEW | No vendor `manualChunks`; offset pagination; missing list virtualization; `SELECT *` overfetch |
| 025 | Medium | 4 SEO | Technical | NEW | No canonical tag; broken `non-blocking-css` Vite plugin (render-blocking CSS) |
| 026 | Low | 1 Security | RLS | CARL-RULE-VIOLATION | Bare `auth.uid()` in 6 policy expressions (should be `(SELECT auth.uid())`) |
| 027 | Low | 1 Security | RLS | NEW | `dap-documents` storage policy scopes by `LIMIT 1` on multi-tenant membership |
| 028 | Low | 2 Code Quality | Migrations | GUARDRAIL-VIOLATION | ~9 of ~90 incremental migrations carry a rollback plan |
| 029 | Low | 1 Security | Edge Function | INTENTIONAL (PD-005) partial | TGA external response written to DB without schema validation |
| 030 | Low | 2 Code Quality | Carl Rules | CARL-RULE-VIOLATION | ~4,102 raw `console.*` in `src/`; `Math.random()` ID use; 175 oversized hooks |
| 031 | Low | 2 Code Quality | Data Integrity | NEW | Stub TODOs in sensitive paths (invite emails not sent; consistency monitor hardcoded 0) |
| 032 | Low | 5 KB Gap | KB | KB-IMPROVE | Edge function count drift: KB says 196/209, actual 345; other KB staleness |

---

## P0 — Cross-Tenant / Unauthenticated Exposure Findings

These are surfaced first regardless of individual severity label, per the audit mandate. All were **independently verified** by reading the source and `supabase/config.toml` (not just the scanning agent's report).

- **Finding 001 `rename-user-email`** — reachable with no credentials, changes any user's email (auto-confirmed) as service role → account takeover of any account including super_admin.
- **Finding 002 `api-v1-router`** — trusts a hand-decoded, signature-unverified JWT `tenant_id` claim → forged-token access to any tenant's API surface.
- **Finding 003 `tga-rto-sync`** — unauthenticated; body `tenant_id`/`rtoId` drive service-role writes into any tenant.
- **Finding 004 `superadmin_tenant_gate`** — super_admin in default (no-active-tenant) mode reads every tenant's assessment tools and QI responses; contradicts explicit documented intent.
- **Finding 005 `tas-create`** — authenticated cross-tenant IDOR (no membership check on body `tenant_id`).
- **Finding 006 `api-v1-webhook-dispatch`** — unauthenticated signed-webhook dispatch to any tenant's endpoints.
- **Finding 007 tenant-switch stale cache** — Tenant A's data can render under Tenant B for up to 5 minutes after an in-SPA tenant switch (client-side only; DB RLS still filters new fetches, but cached rows are shown).

**Common root cause for 001/002/003/005/006:** the same pattern PR #60 fixed — a service-role edge function with `verify_jwt = false` and no internal caller-auth or tenant-membership check. `sync-consultant-tenant-access` is now correctly `verify_jwt = true`, proving the fix landed but was never generalised. **Recommend a one-pass sweep of all 122 `verify_jwt = false` functions** (see KB Improvement KB-IMP-005).

---

## Detailed Findings

### Finding 001 — `rename-user-email` is an unauthenticated account-takeover primitive
**Severity:** Critical · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** NEW
**File:** `supabase/functions/rename-user-email/index.ts:20-47`; config: `[functions.rename-user-email] verify_jwt = false`
**Roles affected:** all (any user including `super_admin`)

**What:** The function performs no authentication of any kind, then calls `admin.auth.admin.updateUserById(userId, { email, email_confirm: true })` as service role using `user_id`/`new_email` taken straight from the request body.

**Why it matters:** Anyone who can reach the function URL can change any user's email to an address they control (auto-confirmed), then trigger a password reset to that address — full account takeover of any account, including platform super admins. On a compliance platform holding regulated RTO data, this is a direct ASQA-grade data-protection breach path. The inline comment "One-shot tool: no caller auth check (function will be deleted after use)" is stale — the function is still declared in `config.toml` and deployed.

**Reproduction / Evidence:** `POST` to the function with `{ "user_id": "<victim>", "new_email": "attacker@evil.com" }`, no `Authorization` header. Code path: `createClient(SUPABASE_URL, SERVICE_ROLE)` at line 28 → no auth → `updateUserById` at line 37.

**Recommended fix:** Delete the function (preferred — it appears to be leftover tooling), or gate it behind a function-level `super_admin` check identical to `admin-delete-users`/`admin-reset-password`. Carl's domain (edge function + config.toml).

**Effort estimate:** < 1 hour

---

### Finding 002 — `api-v1-router` trusts an unsigned, hand-decoded JWT `tenant_id`
**Severity:** Critical · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** NEW
**File:** `supabase/functions/api-v1-router/index.ts:48-59`; config: `verify_jwt = false`
**Roles affected:** all tenants (public API surface)

**What:** For bearer-token auth, the router does `JSON.parse(atob(token.split(".")[1]))` and reads `payload.tenant_id` with no signature verification. With `verify_jwt = false`, Supabase's gateway does not verify the token either.

**Why it matters:** An attacker crafts any JWT-shaped string with an arbitrary `tenant_id` claim; the router accepts it and runs all downstream operations as service role scoped to that `tenantId`. Complete cross-tenant compromise of the public API. (The API-key path at lines 38-47 is correctly validated via `rpc_validate_api_key` — only the JWT branch is broken.)

**Reproduction / Evidence:** Line 52 `const payload = JSON.parse(atob(token.split(".")[1]));` then line 53 `tenantId = payload.tenant_id || null;` — no `auth.getUser`/`getClaims` verification.

**Recommended fix:** Validate the token via `supabase.auth.getUser(token)` (or `getClaims`, which verifies the signature), then derive `tenant_id` from verified claims and confirm membership — never from a manually base64-decoded payload.

**Effort estimate:** half day

---

### Finding 003 — `tga-rto-sync` unauthenticated, body-driven service-role writes
**Severity:** Critical · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** NEW
**File:** `supabase/functions/tga-rto-sync/index.ts:618-635`; config: `verify_jwt = false`
**Roles affected:** all tenants

**What:** No `Authorization` check and no membership check. `tenantId`/`rtoId` come from the request body and drive `processSync(...)`, which performs service-role `.update`/RPC writes and outbound calls to training.gov.au using stored TGA credentials.

**Why it matters:** Any unauthenticated caller can inject or overwrite TGA/scope data into an arbitrary tenant and abuse the stored TGA credential to hammer the external service (A10 SSRF-adjacent / A08 integrity). PD-005 covers *TGA data accuracy*, not *auth on the sync trigger* — this is an auth bug, not a PD-005 exemption.

**Reproduction / Evidence:** Line 621-635: `body = await req.json()` → `{ jobId, tenantId, rtoId, force }` → `processSync(tenantId, rtoId, ...)`; only validation is `if (!tenantId || !rtoId)`.

**Recommended fix:** Require a JWT and verify caller membership of `tenantId`; or, if this is meant to be internal/cron-only, require a shared `CRON_SECRET` header. Confirm intended invocation model with Carl.

**Effort estimate:** half day

---

### Finding 004 — `superadmin_tenant_gate` grants super_admin unrestricted cross-tenant read
**Severity:** Critical · **Phase:** 1 Security · **Category:** RLS · **KB Status:** CARL-RULE-VIOLATION + ADR-CONFLICT (regression class of 19 June incident)
**File:** `supabase/migrations/20260618022350_backfill_sec_superadmin_tenant_gate.sql:27-33`; used by RESTRICTIVE policies in `20260618022400` (assessment_tools/versions) and `20260618033000`/`034005` (qi_responses)
**Roles affected:** `super_admin`

**What:** The gate resolves the super_admin's active tenant; when it is `NULL` (the default "superadmin mode") it returns `true` — i.e. no restriction — so the RESTRICTIVE "deny" policy passes and the super_admin can read every tenant's assessment tools and QI survey responses.

**Why it matters:** Carl's CLAUDE.md states plainly: "super_admin can never access tenant registers or content — RLS deny policies enforce this. Do not write a policy that gives super_admin read access to tenant data." Migration `20260620110100_fix_qi_rpc_super_admin_bypass.sql:5` states: "Platform super_admin is intentionally not a bypass for tenant compliance records." This gate does exactly what both documents forbid, and re-opens the class of exposure behind the 19 June incident (`audit/2026-06-19-caa-super-admin-leak-and-pd-test-cleanup.md`, where Angela as super_admin saw another tenant's records). Because it is a broad cross-tenant read, it is escalated here even though it is scoped to platform staff.

**Reproduction / Evidence:** Lines 28-30 `IF v_active_tenant IS NULL THEN RETURN true; END IF;`. A super_admin querying `assessment_tools` / `qi_responses` without an active tenant selected receives all tenants' rows.

**Recommended fix:** Change the no-active-tenant branch to `RETURN false;` (deny by default), so a super_admin sees tenant rows only when explicitly scoped into that tenant via Support Mode. **This inverts current production behaviour — confirm with Carl before applying**, and apply via a new migration with a rollback plan (do not edit the existing file — migrations are append-only).

**Effort estimate:** < 1 hour to write; needs team sign-off

---

### Finding 005 — `tas-create` cross-tenant IDOR (no membership check on body `tenant_id`)
**Severity:** High · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** NEW
**File:** `supabase/functions/tas-create/index.ts:50-108`; config: `verify_jwt = false`
**Roles affected:** any authenticated tenant user

**What:** The JWT is verified (`getClaims` → `userId`), but `tenant_id` is taken from the body and all work runs on the service-role client (`supabaseAdmin`), with no check that `userId` belongs to `tenant_id`. The scope-item mismatch check only fires when `tenant_scope_item_id` is supplied.

**Why it matters:** A logged-in user of Tenant A can create TAS records / resolve training products in Tenant B by passing B's `tenant_id`. Cross-tenant write (A01 Broken Access Control).

**Recommended fix:** After identifying `userId`, assert active membership: `select 1 from tenant_members where user_id = userId and tenant_id = body.tenant_id and status = 'active'` before any write. Audit siblings that take a body `tenant_id` + service role (`generate-tas-section`, `tas-fetch-labour-market`, `connector-sync`) for the same gap.

**Effort estimate:** half day (this fn), full day incl. sibling sweep

---

### Finding 006 — `api-v1-webhook-dispatch` unauthenticated webhook dispatch
**Severity:** High · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** NEW
**File:** `supabase/functions/api-v1-webhook-dispatch/index.ts:20-41`; config: `verify_jwt = false`
**Roles affected:** all tenants with integration webhooks

**What:** No auth. Body `{ event, tenant_id, data }` → looks up `integration_webhooks` for that tenant and fires ComplyHub-signed callbacks.

**Why it matters:** Anyone can cause ComplyHub to dispatch attacker-controlled, ComplyHub-signed payloads to a tenant's registered endpoints (forged integration events) and enumerate which tenants have active webhooks.

**Recommended fix:** Require an internal service secret (this looks like an internal dispatcher) or a verified JWT + membership check on `tenant_id`.

**Effort estimate:** half day

---

### Finding 007 — Tenant switch clears only 3 cache keys → stale cross-tenant data
**Severity:** High · **Phase:** 3 Performance (security-relevant) · **Category:** Frontend/Tenant · **KB Status:** GUARDRAIL-VIOLATION (PD-002 adjacent)
**File:** `src/lib/setActiveTenant.ts:59-61`; global config `src/main.tsx` (`staleTime: 5min`, no `gcTime`)
**Roles affected:** any multi-tenant user (consultants, users in >1 RTO)

**What:** On tenant switch, only `['tenant-branding']`, `['tenant-theme']`, `['active-tenant']` are invalidated. All other tenant-scoped React Query caches (registers, trainers, documents) persist for up to `staleTime` and may render under the newly-selected tenant before a refetch.

**Why it matters:** Client-side cross-tenant data display. The database still filters new queries by RLS, so this is not a server leak, but a user can *see* Tenant A's cached rows while nominally in Tenant B — which conflicts with the "never cross-reference one tenant's data" mandate (PD-002) and would read as a breach to a customer (cf. the 19 June report).

**Recommended fix:** On tenant switch call `queryClient.clear()` (or `removeQueries` across tenant-scoped roots) instead of invalidating three keys. Also key all tenant-scoped queries by `tenant_id` (Finding 013 relates).

**Effort estimate:** < 1 hour

---

### Finding 008 — Stored XSS: governance meeting minutes rendered unsanitised
**Severity:** High · **Phase:** 1 Security · **Category:** Frontend/XSS · **KB Status:** NEW
**File:** `src/components/governance/MeetingDetailDrawer.tsx:596` (render) and `:136-146` (`formatMarkdown`)
**Roles affected:** all users within an affected tenant

**What:** `dangerouslySetInnerHTML={{ __html: formatMarkdown(minutes.formatted_minutes) }}`. `formatMarkdown` is a pure regex transform with no HTML escaping and no DOMPurify pass, interpolating raw tenant-supplied minutes into `<h1>/<strong>/<li>` markup.

**Why it matters:** `governance_meeting_minutes.formatted_minutes` is tenant-controlled, so a malicious/compromised user can persist `<img src=x onerror=...>` that runs for every user viewing that meeting — session/token theft, tenant data exfiltration. On a multi-tenant compliance platform this is High, not Medium.

**Recommended fix:** Wrap in the existing sanitiser: `sanitizeHtml(formatMarkdown(...))` from `src/lib/htmlSanitizer.ts` (its DOMPurify config already strips `onerror`/`script`). Other markdown/HTML render sites checked (`Emails.tsx`, `StructureSection.tsx`) are already sanitised.

**Effort estimate:** < 1 hour

---

### Finding 009 — 22 Aug 2025 index sweep failed and was never completed
**Severity:** High · **Phase:** 3 Performance · **Category:** Database · **KB Status:** NEW
**File:** `supabase/advisor_reports/2025-08-22/index_sweep_run/` (`run_log.txt`, `failed_statements.txt`, `verify_before_after/indexes_created_after.csv`)
**Roles affected:** all tenants (performance), tenant isolation performance

**What:** The sweep attempted `CREATE INDEX CONCURRENTLY` for missing FK/tenant indexes, hit `SQLSTATE 25001` ("cannot run inside a transaction block") because the migration tool wraps statements in BEGIN/COMMIT, and every Batch-1 index reports `NOT_CREATED`. Resolution was punted to "manual execution during off-peak hours"; there is no later migration or run log confirming completion.

**Why it matters:** The advisor's `fk_coverage_analysis.csv` rates missing tenant_id indexes `CRITICAL — RLS performance and tenant isolation`. Each RLS-filtered query on an unindexed tenant table is a full table scan per request — invisible at demo scale, a meltdown once an RTO onboards hundreds of trainers.

**Recommended fix:** Add the indexes via migration files using `CREATE INDEX CONCURRENTLY` in a non-transactional migration (or plain `CREATE INDEX` during a maintenance window), then re-run the advisor to confirm `indisvalid = true`. Dave/Carl domain.

**Effort estimate:** full day (incl. verification)

---

### Finding 010 — Candidate tenant tables missing `tenant_id` index (verify against production)
**Severity:** High · **Phase:** 3 Performance · **Category:** Database · **KB Status:** NEW (SCHEMA-DRIFT caveat)
**File:** cross-reference of `CREATE TABLE … tenant_id` vs `CREATE INDEX … tenant_id` across `supabase/migrations/`
**Roles affected:** all tenants at scale

**What:** A candidate set of ~high-traffic tenant tables lack a `tenant_id` index in the migration tree — priority group: `trainer_profiles`, `trainer_matrix`, `trainer_scope`, `trainer_unit_map`, `trainer_vet_currency`, `trainer_currency_evidence`, `trainer_session_plans`, `tp_matrix_units`, `tp_credentials`, `tp_experience`, `tp_pd_events`, `tp_monthly_reports`, `compliance_items`, `register_entries_unified`, `evidence_integrity`.

**Why it matters:** These grow linearly with trainer count and are read on hot paths. **Caveat (verified):** the automated cross-reference over-reports — `trainers`, `registers`, `evidence_files`, `tp_matrix` were spot-checked and DO have tenant indexes; some others may exist only in production via Lovable schema drift (per `supabase/migrations/CLAUDE.md`). Treat the list as a candidate set requiring `pg_indexes` verification, not a confirmed count.

**Recommended fix:** Query production `pg_indexes` for the candidate list; one gap-fill migration adding `CREATE INDEX IF NOT EXISTS … (tenant_id)` for the genuinely missing ones. Dave/Carl domain; flag before acting.

**Effort estimate:** full day

---

### Finding 011 — `has_tenant_role` silently elevates Administrator → Consultant
**Severity:** High (verify intent — likely INTENTIONAL) · **Phase:** 1 Security · **Category:** RLS · **KB Status:** INTENTIONAL? / ADR-CONFLICT (undocumented)
**File:** `supabase/migrations/20260616024757_a3399d51-….sql:16-20`
**Roles affected:** `Consultant`, `Consultant Assistant`

**What:** `sec.has_tenant_role` appends `['Consultant','Consultant Assistant']` whenever `Administrator` is in the requested roles. Since nearly every write/delete policy gates on `has_tenant_role(tenant_id, ARRAY['Administrator','Compliance Manager'])`, consultants silently receive Administrator-level write/delete on those registers — invisible at the policy site.

**Why it matters:** The file header ("PLATFORM-WIDE CONSULTANT PARITY") and the KB's "consultants are intentionally cross-tenant" suggest this is by design. The risk is that the elevation is hidden inside a bare-named helper; a `has_tenant_role_strict` twin exists but is not used by the standardised register policies, so there is no way to *exclude* consultants at a policy that intends to. This is an ADR-CONFLICT because the decision is not recorded in `decisions.md`.

**Recommended fix:** If intended, document it (KB-IMP-004) and annotate each policy call site; switch any register that must exclude consultants to `has_tenant_role_strict`. Confirm with Carl/RJ which registers consultants may write. No code change if confirmed intended.

**Effort estimate:** needs team discussion

---

### Finding 012 — `ai-router` has no timeout and calls the decommissioned Lovable AI gateway
**Severity:** High · **Phase:** 3 Performance · **Category:** Edge Function · **KB Status:** NEW
**File:** `supabase/functions/ai-router/index.ts` (~1,050 lines; upstream calls ~lines 596, 953)
**Roles affected:** all (AI features)

**What:** No `AbortController`/`setTimeout`/`Promise.race`. Both upstream calls are bare `await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", …)`.

**Why it matters:** A slow/hung provider blocks the edge worker to the platform wall-clock limit, cascading into user-visible failures under concurrency. Per team notes Lovable is no longer in use, so the gateway URL is a latent single point of failure.

**Recommended fix:** Wrap both fetches in `AbortController` with a ~25s timeout and a graceful fallback; confirm the intended AI provider URL with Carl (this may need to point at the Anthropic API / `ai-router`'s documented provider).

**Effort estimate:** half day

---

### Finding 013 — N+1 count-query fan-out on list/dashboard/matrix screens
**Severity:** High · **Phase:** 3 Performance · **Category:** Frontend · **KB Status:** NEW
**Files:** `src/components/governance/tabs/LiveMeetingTab.tsx:287-310`; `src/hooks/useComplianceData.ts:227-234` (+ 30s `refetchInterval` at `:82`); `src/hooks/useAuditEngine.ts:206-223`; `src/hooks/useTrainerUnitMap.ts:215-235`; `src/components/auth/TenantPicker.tsx:61-82`; `useUserManagement.ts:130-165`; `useTrainerLegislation.ts:91-112`
**Roles affected:** all at scale

**What:** Per-item count/lookup queries in loops (e.g. 2 counts per register × ~10 registers on render; one count per compliance table every 30s; one validation lookup per unit-map row).

**Why it matters:** Round-trips grow linearly with data volume — trivial at 5 trainers, hundreds of queries at 500.

**Recommended fix:** Replace per-item counts with a single grouped aggregate RPC (counts per key) or a join; remove/raise the 30s dashboard `refetchInterval`.

**Effort estimate:** full day

---

### Finding 014 — Carl-rule volume debt: `.single()`, `supabase as any`, raw `functions.invoke`
**Severity:** High (aggregate) · **Phase:** 2 Code Quality · **Category:** Carl Rules · **KB Status:** CARL-RULE-VIOLATION
**Evidence (grep-verified counts, excluding tests + generated `types.ts`):**
- `.single()` — **370** call sites (banned; use `.maybeSingle()`). Throws on 0/multiple rows → unhandled runtime errors.
- `supabase as any` — **755** (of 2,844 `as any` total). Defeats the type system, hides schema drift (the `supabaseDatabase.ts` anti-pattern CLAUDE.md calls out).
- raw `supabase.functions.invoke(` — **390** (should use `callEdge` for auth token + base URL).
- `@ts-ignore`/`@ts-expect-error` — 3 (`Logo.tsx:46`, `lib/scope.ts:9`, `data/platform-invites.ts:68`).

**Why it matters:** None individually critical, but thousands of instances of exactly the patterns the guardrails ban. `.single()` is the highest reliability risk (silent 500s); `supabase as any` masks the schema drift this codebase is known for.

**Recommended fix:** Track as cleanup epics, not one PR. Priority order: (1) `.single()` → `.maybeSingle()` + null handling; (2) the 755 `supabase as any` as files are touched, regenerating types; (3) `functions.invoke` → `callEdge`. Add ESLint rules (`no-console`, a lint against `.single()`/`as any`) to stop regressions.

**Effort estimate:** multi-day / ongoing

---

### Finding 015 — Homepage redirects to login; pure CSR with empty HTML body
**Severity:** High · **Phase:** 4 SEO · **Category:** Crawlability · **KB Status:** NEW
**Files:** `vercel.json:3` (`/ → /login`, `permanent:false` = 307); `index.html` (empty `<div id="root">`); `package.json` (no prerender/SSG tooling); live fetch of `https://rto.complyhub.ai` confirmed empty body.
**Roles affected:** N/A (public/marketing discoverability)

**What:** (a) `/` 307-redirects to `/login`, so the canonical homepage resolves to a bare login screen with no marketing content. (b) The app is pure client-side-rendered — the served HTML body is `<div id="root"></div>`; all copy, headings and links are injected by JS after load, with no SSR/prerendering.

**Why it matters:** For a company competing on "RTO compliance software Australia" in a small (~4,000-provider), high-intent market, this is the single highest-impact SEO issue. Google renders JS on a deferred, unreliable second pass; Bing, LinkedIn and AI answer-engine crawlers largely do not. With an empty body and a login redirect at `/`, there is essentially nothing to index.

**Recommended fix:** (1) Serve a real, indexable marketing page at `/` (do not server-redirect it); gate authed redirects client-side on session state. (2) Prerender the public routes (`/`, `/privacy`, `/cookies`) to static HTML at build time via `react-snap` or `vite-plugin-prerender`. Both touch `vercel.json` / build config — Carl's domain; flag before acting.

**Effort estimate:** full day (marketing page) + team discussion (prerender)

---

### Finding 016 — Unauthenticated privileged ops/billing functions
**Severity:** Medium · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** NEW
**Files:** `supabase/functions/ops-run-diagnostics/index.ts` (no auth, runs `rpc("ops_run_diagnostics")` as service role); `supabase/functions/enforce-billing-compliance/index.ts:27-33` (no auth guard; can mark tenants `past_due`/`cancelled`); both `verify_jwt = false`.

**What:** Both are publicly triggerable. `enforce-billing-compliance` can force tenants into grace/cancelled state (billing DoS); `ops-run-diagnostics` exposes internal diagnostics.

**Why it matters:** A03/A05 — an attacker can trigger billing enforcement sweeps or harvest diagnostics. If cron-only, they should still assert a shared secret.

**Recommended fix:** Gate behind a `CRON_SECRET` header (pattern used by other cron functions) or a super_admin JWT check.

**Effort estimate:** half day (both)

---

### Finding 017 — `public_submit_qi_responses` UPDATE policy has no `WITH CHECK`
**Severity:** Medium · **Phase:** 1 Security · **Category:** RLS · **KB Status:** NEW
**File:** `supabase/migrations/20260618033000_backfill_qi_survey_questions_and_responses.sql:82-84`

**What:** A `FOR UPDATE` policy with `USING (current_setting('app.trusted_public_write', true) = 'true')` and no `WITH CHECK` reuses the USING expression as the check — so once the GUC is set (inside the public-submission SECURITY DEFINER RPC), any column can be updated, including `tenant_id`/`status`/`register_id`.

**Why it matters:** Blast radius is limited because the GUC is set only within a trusted RPC, but the policy imposes no column/tenant constraint — a flaw in whatever sets the GUC becomes a cross-tenant write.

**Recommended fix:** RLS can't reference `OLD`, so enforce immutability of identity columns via a `BEFORE UPDATE` trigger, and have the RPC re-assert `tenant_id`/`register_id` are unchanged. New migration + rollback plan.

**Effort estimate:** half day

---

### Finding 018 — `.env` committed and not gitignored
**Severity:** Medium · **Phase:** 1 Security · **Category:** Config/Secrets · **KB Status:** GUARDRAIL-VIOLATION (AGENTS.md "Never commit secrets — `.env`")
**File:** repo root `.env` (tracked; `git check-ignore .env` → not ignored)

**What:** `.env` is tracked and not in `.gitignore` (which only ignores `*.local`, `.mcp.json`, `.cursor/mcp.json`). Contents are **public keys only** (VITE_SUPABASE_URL/ANON/PUBLISHABLE, PROJECT_ID, an edge-logs flag) — **no service_role/secret/sk_/password/token** — so nothing is leaked today.

**Why it matters:** It's a trap: the next person who adds a real secret to this already-tracked file leaks it, and `.gitignore` gives false confidence.

**Recommended fix:** Add `.env` and `.env.*` (except `.env.example`) to `.gitignore`, then `git rm --cached .env`. Carl's domain (ignore rules).

**Effort estimate:** < 1 hour

---

### Finding 019 — Direct `documents` bucket calls in frontend
**Severity:** Medium · **Phase:** 1 Security · **Category:** Storage · **KB Status:** GUARDRAIL-VIOLATION (decisions.md — documents must go via `document-file-manager`)
**Files:** `src/components/admin/tenants/TenantDocuments.tsx:110,260`; `src/pages/Documents.tsx:293,440` — all `.remove(...)`

**What:** Four direct `supabase.storage.from('documents').remove(...)` calls bypass the mandated edge-function gateway. (No direct `trainer-evidence` calls found — good.)

**Why it matters:** Bypasses the gateway's JWT/tenant checks and audit; exactly the fragile browser-storage path the decision was made to avoid.

**Recommended fix:** Route deletes through `document-file-manager` via `callEdge` (add a delete op if absent).

**Effort estimate:** half day

---

### Finding 020 — Hardcoded Supabase URL / literal project ID in `src/`
**Severity:** Medium · **Phase:** 1 Security · **Category:** Frontend · **KB Status:** CARL-RULE-VIOLATION
**Files:** `src/pages/registers/fpp/index.tsx:193` (`https://${projectId}.supabase.co/functions/v1/fpp-evidence-manager` — also a raw functions fetch from a page); `src/components/admin/people/FunctionsHealthTab.tsx:64` and `src/pages/auth/Callback.tsx:132` (literal project ref `gdwhlstfguxarnxasrrs` in dashboard URLs)

**What:** Hardcoded infra URLs/IDs instead of `import.meta.env.VITE_SUPABASE_URL`. No `service_role`/`sk_` literals found in `src/`.

**Recommended fix:** Use the env var; route the fpp call through `callEdge`.

**Effort estimate:** < 1 hour

---

### Finding 021 — `document.write(innerHTML)` print/export paths
**Severity:** Medium · **Phase:** 1 Security · **Category:** Frontend/XSS · **KB Status:** NEW
**Files:** `src/modules/tas/timetable/TimetableTab.tsx:258`; `src/pages/registers/industry-consultation/components/AuditReportGenerator.tsx:69`

**What:** Print handlers `document.write` live DOM `innerHTML` (plus interpolated tenant fields) into a new popup document.

**Why it matters:** Tenant-data-driven markup executes in the popup context. Lower than A1 (requires the print action, runs in about:blank) but still a real vector.

**Recommended fix:** Route through `createSafeHtmlDocument()` in `src/lib/htmlSanitizer.ts`.

**Effort estimate:** half day

---

### Finding 022 — Internal error detail returned to callers
**Severity:** Medium · **Phase:** 1 Security · **Category:** Edge Function + Frontend · **KB Status:** NEW
**Files:** edge: `admin-delete-users:139`, `admin-reset-password:88`, `ops-run-diagnostics`, `api-v1-webhook-dispatch:153`, `tas-create`; frontend: 323 sites rendering `error.message` (e.g. `EnhancedLoginForm.tsx:161`, `ui/ErrorBoundary.tsx:58`)

**What:** Raw `error.message`/`String(err)` surfaced to clients. **No service-role key** is leaked (verified — no key concatenated into any response/log), but DB/PostgREST error strings (column/constraint names, RLS hints) aid enumeration; the login-form case gives attackers feedback.

**Recommended fix:** Return a generic client error; log detail server-side via `_shared/log.ts` / `logger.error`.

**Effort estimate:** half day (patterned)

---

### Finding 023 — Systemic wildcard CORS on JWT-accepting functions
**Severity:** Medium · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** CARL-RULE-VIOLATION (import from `_shared/cors.ts`)
**Evidence:** 324 functions use `Access-Control-Allow-Origin: '*'`.

**What:** Wildcard CORS across the function fleet.

**Why it matters:** Because functions authenticate via the `Authorization` bearer header (not cookies), wildcard CORS is not directly credential-exfiltrating, but it lets any origin invoke them with a stolen/leaked token and contradicts the shared-CORS rule. Systemic hardening debt.

**Recommended fix:** Introduce `_shared/cors.ts` with an origin allowlist; prioritise the public/admin/billing functions.

**Effort estimate:** multi-day (fleet-wide) / half day for the priority set

---

### Finding 024 — Frontend scale patterns: chunks, pagination, virtualization, overfetch
**Severity:** Medium · **Phase:** 3 Performance · **Category:** Frontend · **KB Status:** NEW
**Evidence:**
- **No vendor `manualChunks`** in `vite.config.ts` — all vendor libs in one shared chunk. (Route splitting itself is excellent: 292 `lazy()` routes, 0 static page imports.)
- **Offset pagination** (`.range(...)`) in `useComplianceData.ts:71`, `services/unifiedRegisterService.ts:77`, `governance/RegisterActions.tsx:143`, `features/actions/api/forms.ts:85`, `data/platform-invites.ts:54`; no keyset pagination anywhere.
- **Missing virtualization**: only `admin/tenants/TenantsTab.tsx` uses `@tanstack/react-virtual`; `FindingsTable`, `TrainerMatrixTable`, `ValidationActionsTable`, `DocumentVersionHistory`, `pages/Documents.tsx` render full lists.
- **`SELECT('*')` overfetch**: ~426 across hooks, ~71 on wide/list tables (`useQualityConsistency.ts:64-70`, `useTrainerUnitMap.ts:54,75,96`, `useFullTrainerMatrix.ts:36-37`).

**Recommended fix:** Add `build.rollupOptions.output.manualChunks` (react, supabase-js, tanstack-query, chart/pdf libs); keyset pagination on register/actions lists; reuse the TenantsTab virtualization pattern on the trainer matrix + documents; explicit column lists on list-view hooks.

**Effort estimate:** multi-day (incremental)

---

### Finding 025 — No canonical tag; broken non-blocking-CSS plugin
**Severity:** Medium · **Phase:** 4 SEO · **Category:** Technical · **KB Status:** NEW
**Evidence:** No `<link rel="canonical">` in local or live HTML (every route serves byte-identical shell = duplicate-content signal). `vite.config.ts:29-46` `non-blocking-css` plugin is not taking effect — the emitted tag `<link rel="stylesheet" crossorigin href="…">` has `crossorigin` before `href`, which its regex doesn't match, so CSS ships render-blocking. Google Fonts stylesheet also loads render-blocking from a third-party host.

**Recommended fix:** Emit a self-referencing canonical per route (extend the existing `PageSEO` mechanism, or via prerender). Fix the plugin regex or switch to `<link rel="preload" as="style">`; consider self-hosting Inter. Carl's domain (build config).

**Effort estimate:** half day

---

### Finding 026 — Bare `auth.uid()` in RLS policy expressions
**Severity:** Low · **Phase:** 1 Security · **Category:** RLS · **KB Status:** CARL-RULE-VIOLATION
**Files:** `20260613064044_9e4d3c34-….sql:43,46,53` (`consultant_portfolio_requests` cpr_insert/cpr_select_own); `20260527073803_….sql:16,25,34,43` (`dap-documents` storage policies)

**What:** Six policy-level bare `auth.uid()` calls (re-evaluated per row) instead of `(SELECT auth.uid())`. All other bare hits are inside PL/pgSQL bodies where the rule doesn't apply. CI only guards new files, so these slipped through.

**Recommended fix:** Wrap as `(SELECT auth.uid())` via a new migration. Perf-only, correct behaviour today.

**Effort estimate:** < 1 hour

---

### Finding 027 — `dap-documents` storage policy scopes by `LIMIT 1`
**Severity:** Low · **Phase:** 1 Security · **Category:** RLS · **KB Status:** NEW
**File:** `20260527073803_….sql:15-17` (+ insert/update/delete twins)

**What:** `(storage.foldername(name))[1] = (SELECT tenant_id::text FROM tenant_members WHERE user_id = auth.uid() LIMIT 1)` — for a multi-tenant user, `LIMIT 1` (no `ORDER BY`) returns an arbitrary membership, so access to the user's *own* second-tenant dap-documents is unpredictable and ignores active-tenant context. No leak to a non-member.

**Recommended fix:** Replace the `LIMIT 1` subquery with `sec.current_tenant_id()`, matching newer register policies.

**Effort estimate:** < 1 hour

---

### Finding 028 — Most migrations lack a rollback plan
**Severity:** Low · **Phase:** 2 Code Quality · **Category:** Migrations · **KB Status:** GUARDRAIL-VIOLATION (guardrails.md "Database migrations")
**Evidence:** ~9 of ~90 incremental migrations contain any rollback/DROP/down procedure.

**What:** Carl's/guardrails' rule requires a rollback plan per migration; most table/policy-creating migrations have none recorded.

**Recommended fix:** Process change — add a `-- Rollback:` block to new migrations (and to the fixes proposed in Findings 004/017/026/027). Don't retrofit old files.

**Effort estimate:** process change

---

### Finding 029 — TGA external response written to DB without schema validation
**Severity:** Low · **Phase:** 1 Security · **Category:** Edge Function · **KB Status:** partial INTENTIONAL (PD-005 covers data *accuracy*, not *validation*)
**Files:** `tga-rto-sync/index.ts:68` and update sites; `tga-fetch-qualdetails`

**What:** `await response.json()` from training.gov.au is written to the DB unvalidated. Source is trusted, but a malformed/hostile response is persisted as-is.

**Recommended fix:** Add shape validation (Zod) before write.

**Effort estimate:** half day

---

### Finding 030 — Console noise, unsafe `Math.random`, oversized hooks
**Severity:** Low · **Phase:** 2 Code Quality · **Category:** Carl Rules · **KB Status:** CARL-RULE-VIOLATION
**Evidence:**
- **~4,102** raw `console.*` in `src/` (rule: use `logger`), incl. billing/auth paths (`StripeCheckoutModal.tsx:57,80,86,114`, `main.tsx:18-19`).
- `Math.random()` — 73 uses, mostly benign (skeletons/mocks); real violations: `SuperAdmin/consultant-hub/AddConsultingOrgDialog.tsx:24` (ID suffix → use `secureId()`), `compliance/ComplianceDataManager.tsx:308` (unstable React `key` — correctness bug).
- **175 hooks over 200 lines** (244 over the ~150 rule); worst: `useTrainerMatrixEngine.ts` (1,166), `useTASHealthCheck.ts` (978), `useComplianceRequirementsEvidenceSignals.ts` (877).
- `organisation_id` — 34 occurrences, **all in generated `types.ts`** (a live DB table still carries it → note for Dave; zero hand-written violations).

**Recommended fix:** ESLint `no-console`; fix the two `Math.random` cases; split the largest hooks first; Dave to confirm the `organisation_id` DB column.

**Effort estimate:** ongoing

---

### Finding 031 — Stub TODOs in sensitive paths
**Severity:** Low · **Phase:** 2 Code Quality · **Category:** Data Integrity · **KB Status:** NEW
**Evidence (of 54 genuine TODO/FIXME):**
- `src/components/invitation/InvitationManager.tsx:121` — "TODO: Trigger email sending via edge function" (invitations may not actually email).
- `src/pages/team/Invitations.tsx:75` — reminder emails not implemented.
- `src/components/SuperAdmin/DataConsistencyMonitor.tsx:155` — duplicate-membership detection hardcoded to `0` (silently reports "no duplicates").
- Multiple register pages have `onFromDateChange: () => {}` no-op date filters (UI renders but does nothing); `ComplaintsAppealsRegister.tsx:390` uses `window.location.reload()` as a refresh hack.

**Recommended fix:** Convert the invite-email and consistency-monitor items to tracked tickets; the hardcoded `0` is misleading and should go to Carl/Dave.

**Effort estimate:** varies

---

### Finding 032 — KB is stale relative to the codebase (see full list below)
**Severity:** Low · **Phase:** 5 KB Gap · **Category:** KB · **KB Status:** KB-IMPROVE
See **KB Improvement Suggestions**.

---

## Phase 5 — Knowledge Base Gap Audit

**Confirmed accurate / cleared (don't re-flag):**
- SUSPECTED-003 (`enforce_tenant_upload_limit` trial-exemption bug) — **not present** in the current migration set or baseline; every `storage.foldername(...)` use is the correct `(name)[1]` form. Move to Resolved in `known-issues.md`.
- PR #60 fix (`sync-consultant-tenant-access` → `verify_jwt = true`) — verified still in place.
- Storage gateway decisions (documents / trainer-evidence) — implemented as documented.

**Gaps found:**
1. **Edge function count drift.** KB states 196 (`architecture.md:71`, `codebase-map.md:110`) and 209 (`rto-compass-hub/CLAUDE.md:24`, `supabase/functions/CLAUDE.md`); the tree has **345** function directories (337 deployable + `_shared`/`_sdk`/etc.). Also `architecture.md` says "150+ tables."
2. **`known-issues.md` is stale** — "update weekly," last updated 5 May 2026. BUG-001 (login redirect loop) and BUG-002 (nav white page ~960px) still say "verify against current codebase" and were never re-verified.
3. **`conventions.md` is scaffolding** — "Multi-tenant model," "Frontend patterns," "Database conventions," "New table checklist" are empty headers.
4. **Missing decisions in `decisions.md`** — no PD covers: (a) whether super_admin may read tenant compliance content (Finding 004 shows the code and the intent statement disagree); (b) the platform-wide Consultant→Administrator parity elevation (Finding 011); (c) the recurring `verify_jwt = false` service-role pattern and its required internal-auth checklist.
5. **`codebase-map.md` `src/` drift** — new top-level dirs not in the map: `features/`, `modules/`, `state/`, `routing/`, `tours/`, `data/`.

---

## KB Improvement Suggestions

- **KB-IMP-001** — `complyhub-kb/reference/architecture.md` + `codebase-state/codebase-map.md` + `rto-compass-hub/CLAUDE.md`/`supabase/functions/CLAUDE.md`: update edge-function count to ~345 (337 deployable) and table count; add a note that the count drifts and to verify via `ls supabase/functions | wc -l`.
- **KB-IMP-002** — `complyhub-kb/reference/known-issues.md`: move SUSPECTED-003 to Resolved (verified absent 02 Jul 2026); re-verify or close BUG-001/BUG-002; refresh the "last updated" line.
- **KB-IMP-003** — `complyhub-kb/pinned/decisions.md`: add a decision recording the intended super_admin↔tenant-content boundary, referencing Finding 004, `20260620110100`, and Carl's CLAUDE.md rule, so the gate can be fixed without re-litigation.
- **KB-IMP-004** — `complyhub-kb/pinned/decisions.md`: record the "Consultant parity" elevation in `has_tenant_role` (Finding 011) as an explicit decision, and document `has_tenant_role_strict` as the opt-out.
- **KB-IMP-005** — `complyhub-kb/pinned/conventions.md`: add an "Edge Function auth checklist" convention — every service-role function must (1) verify the caller JWT via `auth.getUser`/`getClaims` (never `atob`), (2) verify tenant membership before acting on a body `tenant_id`, (3) use `verify_jwt = true` unless it is cron/token-gated with its own secret. Reference PR #60 and Findings 001-006 as the recurring class this prevents.
- **KB-IMP-006** — `complyhub-kb/pinned/conventions.md`: fill the empty scaffolding sections (multi-tenant model, frontend patterns, DB conventions, new-table checklist) — several were needed to judge findings this audit.
- **KB-IMP-007** — `complyhub-kb/codebase-state/codebase-map.md`: add the new `src/` dirs (`features/`, `modules/`, `state/`, `routing/`, `tours/`, `data/`).
- **KB-IMP-008** — `complyhub-kb/handoffs/`: add an "edge-function security sweep" procedure (how to enumerate `verify_jwt=false`, verify internal auth, and remediate) — there is no handoff for this recurring work.

---

## Recommended remediation order (for Carl/RJ/Angela)

1. **Today (P0, <1h each):** delete/gate `rename-user-email` (001); `queryClient.clear()` on tenant switch (007); `sanitizeHtml` on meeting minutes (008); `.env` → `.gitignore` (018).
2. **This week (Critical/High):** fix `api-v1-router` JWT verification (002); auth on `tga-rto-sync` (003) and `tas-create` (005) and `api-v1-webhook-dispatch` (006); flip `superadmin_tenant_gate` after Carl sign-off (004); verify + complete the index sweep (009/010).
3. **Sweep (needs Carl):** all 122 `verify_jwt=false` functions for internal auth (KB-IMP-005); confirm Consultant parity intent (011); `ai-router` timeout + provider URL (012).
4. **SEO (needs Carl):** indexable `/` marketing page + prerender (015); canonical + CSS plugin (025).
5. **Tracked cleanup epics:** Carl-rule volume debt (014, 030); N+1 + scale patterns (013, 024).

---

*Audit complete — all five phases in one session. Nothing was committed or pushed. Per workspace guardrails, all items touching `main`, `config.toml`, `supabase/migrations/`, `vercel.json`, `.gitignore`, or the DB are Carl's/Dave's domain and must be confirmed before any change. Findings 001-004 should be raised with Carl and RJ immediately.*
