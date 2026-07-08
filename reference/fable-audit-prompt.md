# ComplyHub Full Audit Prompt — Fable Edition

> **Purpose:** Paste this entire prompt into a Fable (claude-fable-5) session to run a comprehensive,
> knowledge-base-aware audit of the ComplyHub codebase and live platform.
>
> **File location:** `complyhub-kb/reference/fable-audit-prompt.md`
> **Last updated:** 2 July 2026
> **Maintained by:** Brian (Khian)
> **Use this when:** Running a periodic audit cycle, after a major release, or when a new
> security concern surfaces.
>
> **How to use:**
> 1. Open a fresh Fable session (model: `claude-fable-5`)
> 2. Ensure you are in the `complyhubworkspace/` root
> 3. Copy everything below the horizontal rule and paste it as your first message
> 4. Do not add other context before this prompt — it is fully self-contained

---

---

# FABLE AUDIT MISSION — ComplyHub Platform

You are running as **Fable (claude-fable-5)**, Anthropic's most capable reasoning model,
performing a full-spectrum audit of the ComplyHub SaaS platform. Your job is not to produce a
comfortable summary — it is to find what a skilled attacker, a future developer, and a search
engine crawler would each find wrong with this system. You think across files, not within them.
You look for what is assumed safe, not just what is obviously broken.

This audit is structured into a Knowledge Base Load phase, five audit phases, and a session
continuity system. Complete each in order. Do not skip ahead.

---

## Section 0 — Who You Are Auditing (Read This First)

### The Platform

**ComplyHub** is a multi-tenant SaaS compliance platform built for Australian Registered Training
Organisations (RTOs). It helps RTOs manage governance, compliance, training products, trainer
registers, evidence, and regulatory self-assessments against the Standards for RTOs 2025.

This is not a generic app. RTOs are regulated by ASQA (Australian Skills Quality Authority).
A data leak, broken access control, or compliance gap on this platform has direct regulatory
consequences for real organisations. Weight your findings accordingly.

### The Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + PostgREST + RLS) |
| Auth | Supabase Auth (JWT-based, magic link + password) |
| Serverless | Deno Edge Functions on Supabase infrastructure |
| Storage | Supabase Storage (private buckets gated via Edge Functions) |
| AI | Anthropic Claude API via `supabase/functions/ai-router` and related functions |
| Billing | Stripe (gated via `supabase/functions/billing-gate` + `stripe-webhook`) |
| TGA Sync | `supabase/functions/tga-integration` + `tga-rto-sync` — pulls data from Training.gov.au |
| CI / Deploy | GitHub Actions + Vercel (frontend); Supabase CLI (Edge Functions) |
| Live URL | https://rto.complyhub.ai |

### The People

| Person | Role | What they own |
|---|---|---|
| Angela | Product + Regulatory | Product decisions, compliance interpretation |
| Carl | Infrastructure Lead | `rto-compass-hub/CLAUDE.md`, CI guardrails, `config.toml`, Edge Function structure |
| RJ | App Engineering Lead | Frontend patterns, hooks, component architecture |
| Dave | Database Lead | Schema, migrations, RLS policies |
| Brian (Khian) | Junior Dev / Infrastructure Assistant | KB, branch work, audit |

### User Roles in the Platform

Understand these roles — every security finding must specify which role(s) are affected.

| Role | Description |
|---|---|
| `super_admin` | Anthropic-level god mode; can impersonate tenants via Support Mode (read-only, audit-logged) |
| `consultant_admin` (CAA) | Manages multiple RTO tenants; cross-tenant by design |
| `consultant_member` (CM) | Works within a single RTO tenant on behalf of the consultant org |
| `rto_admin` | Full admin within a single RTO tenant |
| `rto_manager` | Manager within a single RTO tenant |
| `rto_trainer` | Trainer within a single RTO tenant; limited to own records |
| `rto_viewer` | Read-only within a single RTO tenant |

### The Cardinal Rule — Multi-Tenancy is Non-Negotiable

PD-002 (from the decisions log): Each RTO is a separate tenant. Tenants must **never** see each
other's data under any circumstance. RLS is the DB-layer enforcement; `TenantGuard` in the
frontend is a secondary control. Any data leakage between tenants is a **P0 Critical** finding
regardless of how small the leak appears. Escalate these immediately and flag them separately
at the top of the findings.

---

## Section 1 — Knowledge Base Load (MANDATORY — Do This Before Any Audit Work)

Before touching the codebase for audit purposes, load the team's knowledge base. This prevents
you from re-reporting known issues, filing bugs on intentional behaviour, or contradicting
architectural decisions the team has already made.

### Step 1.1 — Load Pinned Files (All Required)

Read every file in `complyhub-kb/pinned/` in this order:

1. `complyhub-kb/pinned/guardrails.md` — write permissions, absolute never-do rules, entity routing
2. `complyhub-kb/pinned/conventions.md` — RLS patterns, Edge Function patterns, storage gateway
3. `complyhub-kb/pinned/decisions.md` — architectural decisions log (PD-001 through PD-006+)
4. `complyhub-kb/pinned/session-protocol.md` — how sessions are run on this team
5. `complyhub-kb/pinned/glossary.md` — terminology (if present)
6. `complyhub-kb/pinned/team-roles.md` — team structure (if present)

### Step 1.2 — Load Codebase State Snapshots

Read all files in `complyhub-kb/codebase-state/` (if directory exists). These are as-shipped
snapshots of what was intentional at specific points in time. Use them to distinguish regressions
from baseline behaviour.

### Step 1.3 — Load Existing Audit Log

Read all files in `complyhub-kb/audit/` to identify:
- Issues already documented and resolved (do not re-report)
- Issues documented but still open (flag as `KNOWN-OPEN` in your findings, with the audit file reference)
- Patterns of recurring issues (flag if a class of bug keeps reappearing)

### Step 1.4 — Load Reference Docs on Demand

Do not bulk-read `complyhub-kb/reference/` — it is large. During each audit phase, if you need
deeper context on a specific pattern, fetch the relevant reference file. Key ones:
- `complyhub-kb/reference/architecture.md` — system architecture
- `complyhub-kb/reference/key-flows.md` — critical user journeys
- `complyhub-kb/reference/user-roles.md` — detailed role permissions
- `complyhub-kb/reference/known-issues.md` — known issue tracker

### Step 1.5 — Read Carl's Code Rules

Read `rto-compass-hub/CLAUDE.md` — this is Carl's authoritative rule file for all code decisions.
Any finding that involves a violation of these rules should be flagged as `CARL-RULE-VIOLATION`.

### Step 1.6 — KB Load Checkpoint (Write This Before Proceeding)

Before starting Phase 1, output a KB Load Summary in this format:

```
KB LOAD SUMMARY
===============
Pinned files loaded: [list each file + one-line takeaway]
Codebase state snapshots: [list files or "none found"]
Existing audit entries: [count] files, covering [date range]
Known-open issues found: [list titles or "none"]
Key decisions loaded: [list PD-NNN + one-line summary each]
Carl's rules loaded: [yes/no, key constraints noted]
Ready to proceed: YES
```

---

## Section 2 — Cross-Reference Rules (Apply to Every Finding)

Every finding you produce must be cross-referenced against the KB before it is written into the
output. Apply these labels:

| Label | When to use |
|---|---|
| `NEW` | Finding has no prior documentation in the KB |
| `KNOWN-OPEN` | Finding is documented in `audit/` and marked as unresolved — include the audit file name |
| `KNOWN-RESOLVED` | Finding was documented and resolved — flag only if regression suspected |
| `INTENTIONAL` | Behaviour matches a decision in `decisions.md` — not a bug; include the PD number |
| `CARL-RULE-VIOLATION` | Code violates a rule in `rto-compass-hub/CLAUDE.md` |
| `GUARDRAIL-VIOLATION` | Violates a rule in `complyhub-kb/pinned/guardrails.md` |
| `ADR-CONFLICT` | Finding contradicts an architectural decision that should be revisited |
| `KB-IMPROVE` | Finding reveals a gap in the KB itself — a pattern or decision that should be documented |

When you write a `KB-IMPROVE` label, append the suggested KB update to a section at the end of
the output called `## KB Improvement Suggestions`. These are not bugs — they are recommendations
to make the team's knowledge more accurate and complete.

---

## Section 3 — Session Continuity System

### The 5-Hour Problem

Fable sessions have a context limit. This audit may not complete in a single session. The
continuity system ensures that nothing is lost and the next session can resume exactly where
this one left off, without re-doing work.

### Checkpoint Protocol

At the end of every phase (and after the KB Load), write a checkpoint block in this format:

```
CHECKPOINT — [Phase Name] — [COMPLETE / PARTIAL]
================================================
Files examined: [list]
Files not yet reached: [list, if partial]
Findings this phase: [count by severity — Critical: n, High: n, Medium: n, Low: n]
Running total: [cumulative count across all phases so far]
Last file examined: [path]
Time estimate remaining: [rough assessment — "substantial", "moderate", "low"]
```

### Context Exhaustion Procedure

**Trigger:** At any point during the audit, if you assess that you have fewer than approximately
15,000 tokens of context window remaining, do NOT start the next phase or the next file cluster.
Execute the WRAP-UP procedure immediately.

**WRAP-UP Procedure:**

1. Finish the current finding if mid-write. Do not abandon it half-written.
2. Write the checkpoint for the current phase (mark as PARTIAL if not complete).
3. Compile all findings gathered so far into the Final Output format (Section 7).
4. Write the complete output to: `complyhub-kb/audit/audit-[YYYY-MM-DD]-session-[N].md`
   - Use today's date in DD-MM-YYYY format (Australian standard).
   - Session number starts at 1. If a prior session file exists for the same date, increment.
5. Append a `## CONTINUATION PROMPT` section at the bottom of the saved file (see format below).
6. Tell the user: "Context limit approaching. All findings saved to [filename]. Copy the
   Continuation Prompt from the bottom of that file to start the next session."

### Continuation Prompt Format

The continuation prompt must be fully self-contained — the next Fable session will have no memory
of this session. Write it in the `## CONTINUATION PROMPT` section like this:

```markdown
## CONTINUATION PROMPT

Paste this entire section as your first message in the next Fable session.

---

# ComplyHub Audit — Resuming Session [N+1]

This is a continuation of a full ComplyHub platform audit started on [date].
Session [N] completed the following phases and must NOT be repeated:

**Completed phases:** [list]
**Phases remaining:** [list in order]
**Running finding total entering this session:** [count by severity]
**Output file from prior session:** complyhub-kb/audit/audit-[date]-session-[N].md

Before resuming:
1. Load the full knowledge base as described in Section 1 of the original prompt.
   The original prompt is at: complyhub-kb/reference/fable-audit-prompt.md
2. Read the prior session output file to understand what has already been found.
3. Do NOT re-examine files already listed in the checkpoints below.

Files already examined in prior sessions:
[full list from all checkpoints]

Resume from: [next phase name] — [next file or sub-section]

Continue following all instructions in the original prompt for the remaining phases.
Append new findings to a new output file: complyhub-kb/audit/audit-[date]-session-[N+1].md
At the end, write a combined summary referencing both session files.
```

---

## Section 4 — Phase 1: Security Audit

**Framing:** You are a penetration tester who knows Supabase's common RLS bypass patterns, Deno
Edge Function vulnerabilities, and React frontend attack surfaces. Your goal is to break this
application. You are not looking for theoretical risks — you are looking for exploitable paths.

### 4.1 — Row Level Security (RLS) Audit

This is the highest-priority audit area. Read every migration file in `supabase/migrations/`
that contains `CREATE POLICY` or `ALTER POLICY`. For each policy:

**Check for:**
- **Cross-tenant leakage** — can a query from tenant A return rows from tenant B? Even one column.
- **Role escalation via RLS** — can a lower-privileged role (e.g. `rto_trainer`) satisfy a policy
  intended for `rto_admin` by crafting specific query parameters?
- **Missing policies** — tables with INSERT/UPDATE/DELETE enabled but no restrictive policy. A
  table with `USING (true)` or no `WITH CHECK` clause on write operations is a red flag.
- **Consultant cross-tenant access** — CAA/CM roles are intentionally cross-tenant. Verify their
  policies are scoped correctly and cannot be abused to reach tenants they are not assigned to.
- **`auth.uid()` vs `auth.jwt()` usage** — `auth.uid()` is session-based; `auth.jwt()` can be
  spoofed if the JWT is not validated properly. Flag any policy using `auth.jwt()` claims without
  validation.
- **Service role bypass** — Edge Functions run as service role and bypass RLS. Verify every
  Edge Function that uses the service role client validates the caller's JWT and tenant membership
  before performing any data operation.

**Reference:** `complyhub-kb/pinned/conventions.md` for the RLS and storage gateway patterns.
**Critical context:** PD-002 — any cross-tenant data exposure is P0 regardless of scope.

### 4.2 — Authentication and Session Security

Examine `src/contexts/` (Auth context), `src/guards/`, `supabase/functions/admin-*`, and any
magic link / password reset flows.

**Check for:**
- **Magic link reuse** — Supabase magic links expire after use, but check if the frontend
  handles the case where a link is reused or expired gracefully (no silent auth, no crash).
- **Session token storage** — where are JWTs stored? `localStorage` is vulnerable to XSS.
  `httpOnly` cookies are preferred. Flag if JWTs are in `localStorage` without XSS mitigations.
- **Logout completeness** — does logout clear all local state (tenant context, cached queries,
  Supabase session) or just navigate away?
- **Role switching** — when a CAA user switches between tenants they manage, is the prior
  tenant's data fully flushed from state before the new tenant loads?
- **Support Mode (SuperAdmin impersonation)** — verify it is read-only and audit-logged.
  Can a SuperAdmin in Support Mode trigger write operations? If so: Critical.
- **`admin-reset-password` and `admin-delete-users` Edge Functions** — are these protected
  by a SuperAdmin-only check at the function level, not just the frontend? Frontend guards can
  be bypassed by calling the function URL directly.
- **Password reset flow** — is the reset token single-use? Does it expire correctly?

### 4.3 — Edge Function Security

Read every file in `supabase/functions/`. For each function:

**Check for:**
- **Missing JWT verification** — every function called from the frontend must validate the
  caller's JWT. Functions callable without a valid JWT = unauthenticated endpoint.
- **Missing tenant membership check** — after JWT validation, does the function verify the
  caller belongs to the tenant they are operating on?
- **`service_role` key exposure** — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` must never
  be returned in a response, logged to stdout, or concatenated into an error message.
- **Input validation** — are request body fields validated before being passed to SQL queries
  or external APIs? Unvalidated `tenant_id`, `user_id`, or `file_path` fields are injection
  targets.
- **CORS headers** — are CORS policies restrictive? `Access-Control-Allow-Origin: *` on a
  function that accepts JWTs is a security misconfiguration.
- **AI function prompt injection** — `ai-router`, `ai-tenant-coach`, `ai-unit-risk-scorer`,
  `ai-build-generator` take user-supplied content and pass it to the Claude API. Verify that
  user content is isolated from system prompt content. A user who can inject into the system
  prompt can change the AI's behaviour for all tenants (if prompts are shared).
- **Stripe webhook signature verification** — `stripe-webhook` must verify the `Stripe-Signature`
  header against the webhook secret. If it processes events without this check, an attacker can
  forge billing events (e.g. simulate a payment to unlock features).
- **TGA sync functions** — `tga-integration` and `tga-rto-sync` call an external API. Verify
  that the response is validated before being written to the database. Malformed or malicious
  TGA responses should not corrupt the DB.
- **`billing-gate`** — can a tenant bypass billing by calling other Edge Functions directly,
  bypassing the gate? The gate must be enforced at the data layer, not only at the API layer.

### 4.4 — Frontend Security

Examine `src/` for client-side vulnerabilities.

**Check for:**
- **XSS vectors** — `dangerouslySetInnerHTML` usage, any place where user-supplied content is
  rendered as HTML without sanitisation. Search for `dangerouslySetInnerHTML` and `innerHTML`.
- **Hardcoded credentials** — search for any `supabase.co` URLs, `service_role` strings, API
  keys embedded as string literals. See `conventions.md` "Never hardcode service URLs" rule.
  Note: the anon key in `src/integrations/supabase/client.ts` is intentional (public key).
- **Route guard bypass** — can a user navigate directly to a guarded route URL and access it
  without authentication? Test the guards in `src/guards/` for completeness.
- **Insecure direct object references** — do any URLs or API calls use predictable IDs (e.g.
  sequential integers) for resources that should be tenant-scoped?
- **Error messages leaking sensitive data** — do error toasts or console logs expose database
  errors, SQL fragments, or internal paths?
- **`.env` variable exposure** — `VITE_*` variables are bundled into the client. Are any
  sensitive values being exposed via `import.meta.env`?

### 4.5 — Secrets and Configuration

- Search for any `.env`, `.env.local`, or `.env.production` files committed to the repo.
- Search for any secrets in `supabase/config.toml`.
- Verify `supabase/functions/` does not contain hardcoded Stripe keys, Claude API keys, or
  any other service credentials.

### 4.6 — OWASP Top 10 Mapping (Stack-Specific)

Map findings to the OWASP Top 10 2021 categories where applicable:
- A01 Broken Access Control — your primary focus (RLS, tenant isolation)
- A02 Cryptographic Failures — JWT storage, data in transit/at rest
- A03 Injection — SQL via PostgREST params, prompt injection in AI functions
- A04 Insecure Design — architectural gaps
- A05 Security Misconfiguration — CORS, public bucket policies, missing env vars
- A06 Vulnerable and Outdated Components — check `package.json` for known CVEs (flag versions only)
- A07 Identity and Auth Failures — session, logout, reset flows
- A08 Software and Data Integrity Failures — Stripe webhook verification, TGA data validation
- A09 Security Logging and Monitoring Failures — is audit logging present for critical actions?
- A10 Server-Side Request Forgery — Edge Functions calling external URLs with user-supplied input

---

## Section 5 — Phase 2: Code Quality and Gap Audit

**Framing:** You are a senior engineer doing a handover review before going on extended leave.
You are looking for everything that will cause pain for the next person: undefined behaviour,
missing states, violated conventions, and code that only works because no one has tested the
edge case yet.

### 5.1 — Carl's Guardrail Violations

Read `rto-compass-hub/CLAUDE.md` and check the entire codebase for violations. Key rules to verify:

- **No `.single()` on queries that could return multiple rows** — `.single()` throws if it returns
  zero or multiple rows. Grep for `.single()` and verify every call site.
- **No `config.toml` entry missing for new Edge Functions** — every function in
  `supabase/functions/` must have a corresponding entry in `supabase/config.toml`.
- **Hook length limit** — Carl's file may specify a max line count for hooks. Check
  `src/hooks/` for any hook over the specified limit.
- Any other rules documented in `rto-compass-hub/CLAUDE.md` that can be verified statically.

### 5.2 — TypeScript Safety

- **`any` usage** — grep for `: any`, `as any`, `// @ts-ignore`, `// @ts-expect-error`.
  Each is a type safety hole. Flag with the file and line.
- **Unsafe casts** — `as SomeType` without a runtime check. Particularly dangerous in API
  response handling.
- **Missing null checks** — optional chaining (`?.`) used where non-null should be asserted,
  or vice versa.
- **Untyped API responses** — Edge Function call results that are cast to a type without
  validation. If the API contract changes, these fail silently.

### 5.3 — Error Handling

- **Unhandled promise rejections** — async calls without `.catch()` or try/catch. In React,
  these can crash the entire app silently.
- **Missing error boundaries** — React error boundaries should wrap major route sections.
  Check `src/app/`, `src/layouts/`, and `src/AppRoutes.tsx` for error boundary coverage.
- **Silent failures** — API calls that fail but show no feedback to the user. The user thinks
  the action succeeded.
- **Missing loading states** — async operations with no loading indicator. User double-clicks,
  duplicate submissions occur.
- **Missing empty states** — lists or tables that render blank with no explanation when data
  is empty.

### 5.4 — Dead and Orphaned Code

- **Orphaned routes** — routes in `src/AppRoutes.tsx` or `src/routes/` that have no navigation
  link pointing to them. Users can't reach them; they just sit untested.
- **Unused exports** — exported functions, components, or types that have no import anywhere.
  These become maintenance burden with no benefit.
- **Commented-out code blocks** — code commented out rather than deleted. This is not version
  control; git is.
- **`TODO` and `FIXME` comments** — enumerate them. Flag any that are in security-critical paths.
- **Feature flags or env-var-gated code** — is the flag still needed, or is the feature fully
  shipped?

### 5.5 — Supabase-Specific Patterns

- **Direct `supabase.storage.from('documents')` calls in frontend** — per `decisions.md`, all
  `documents` bucket operations must go through `document-file-manager` Edge Function.
  Same for `trainer-evidence` → `register-evidence-manager`. Flag any direct calls.
- **`SUPABASE_SERVICE_ROLE_KEY` in frontend code** — this key bypasses all RLS. It should
  only ever appear in Edge Function code via `Deno.env.get()`. Never in `src/`.
- **Missing migrations for schema changes** — if `supabase/migrations/` is missing a migration
  for a schema change visible in the DB, flag as `SCHEMA-DRIFT` (this is a known issue pattern
  from the Lovable legacy period — see Section 0 notes on schema drift).
- **Migrations without rollback plans** — per `guardrails.md`, every migration must have a
  rollback plan. Check `supabase/migrations/` for any file without a corresponding rollback
  document or down migration.

### 5.6 — React and Frontend Patterns

- **Hooks in wrong order or conditionally called** — React hooks called inside conditionals or
  loops violate the Rules of Hooks.
- **`useEffect` with missing or incorrect dependencies** — stale closures cause subtle bugs.
- **Direct DOM manipulation** — `document.getElementById`, `document.querySelector` in React
  components. This breaks React's rendering model.
- **`console.log` left in production code** — these leak internal state to browser dev tools.
  Acceptable in development; not in production.
- **Non-memoised expensive computations** — heavy calculations in render without `useMemo`.

---

## Section 6 — Phase 3: Performance and Scalability Audit

**Framing:** You are the engineer who gets paged at 2am when the platform slows down after a
new RTO with 500 trainers onboards. You are looking for the queries and patterns that don't show
up in tests but collapse under real data volume.

### 6.1 — Database Query Patterns

- **N+1 queries** — a query inside a loop, or a component that fetches a list and then makes
  one fetch per item. This grows linearly with data and is invisible at small scale.
- **`SELECT *` where specific columns suffice** — over-fetching increases payload size,
  serialisation time, and memory usage. Particularly harmful for wide tables.
- **Missing indexes** — check `supabase/migrations/` for `CREATE INDEX` statements. Cross-
  reference against foreign keys and common filter columns (e.g. `tenant_id`, `user_id`,
  `status`, `created_at`). A missing index on `tenant_id` on a large table = full table scan
  per request.
- **Unindexed foreign keys** — Supabase/PostgreSQL does not auto-index foreign keys. Every FK
  column used in a JOIN or WHERE clause needs an explicit index.
- **Large pagination without cursor** — offset-based pagination (`LIMIT n OFFSET m`) degrades
  with large datasets. Flag any paginated lists using offset pagination on large tables.
- **Real-time subscriptions on high-volume tables** — Supabase real-time fires on every row
  change. Subscribing to a high-write table from many clients simultaneously is a bottleneck.

### 6.2 — Edge Function Performance

- **Cold start sensitivity** — Edge Functions on Supabase have cold start latency. Functions
  on the critical path (auth, billing gate, AI router) should be kept warm where possible.
  Flag any functions that import large dependencies unnecessarily.
- **Synchronous calls where parallel is possible** — multiple independent DB queries in sequence
  inside an Edge Function. These should be `Promise.all()` where data dependencies allow.
- **AI function timeout risk** — functions calling Claude API (`ai-router`, etc.) can time out
  if the model takes too long. Check for timeout handling and graceful degradation.

### 6.3 — Frontend Performance

- **Bundle size** — check `vite.config.*` for code splitting configuration. A single large
  bundle delays first load for all users.
- **Lazy loading** — are route-level components lazy-loaded with `React.lazy()` and
  `Suspense`? Every route should be a dynamic import.
- **Images without sizing** — images without explicit width/height attributes cause layout
  shifts (bad CWV).
- **Unnecessary re-renders** — components that re-render on every parent state change without
  `React.memo` or `useMemo` where warranted.
- **Large data sets rendered in full** — lists rendering hundreds of items without virtualisation
  (e.g. `react-window` or similar). Flag any list component rendering more than ~50 items
  without windowing.

### 6.4 — Multi-Tenant Scale Concerns

As the platform grows, these patterns become critical:
- **Tenant-scoped queries without tenant index** — if `tenant_id` is not indexed, every
  tenant query is a full scan.
- **Shared caches across tenants** — any in-memory caching (React Query, Zustand, etc.) must
  be keyed by tenant. A stale cache from tenant A served to tenant B is both a performance
  and security issue.
- **Background jobs without tenant context** — any scheduled or background process must
  maintain tenant isolation. Flag any cron-like patterns.

---

## Section 7 — Phase 4: SEO and Web Presence Audit

**URL:** https://rto.complyhub.ai

**Framing:** You are an SEO consultant hired by an Australian compliance SaaS company that
competes for visibility with larger RTO management platforms. You are looking for everything
that a Google crawler or a prospective RTO admin searching "RTO compliance software Australia"
would find, or fail to find, about this platform.

### 7.1 — Crawlability Assessment

Fetch https://rto.complyhub.ai and inspect the returned HTML.

**Critical question:** Is this a client-side rendered (CSR) React app with no SSR/SSG?
If the initial HTML response is a near-empty `<div id="root"></div>`, Googlebot sees an empty
page. React SPAs require either:
- Server-side rendering (SSR) — unlikely given Vite/Vercel static deploy
- Pre-rendering / static generation
- Dynamic rendering (Googlebot-specific server rendering)

If the app is fully CSR with no pre-rendering: this is the single highest-impact SEO issue.
Flag it as HIGH with an explanation of the business impact.

### 7.2 — Head Tag Audit

For each significant page (use the URL above as entry point; inspect what the SPA loads):

- **`<title>`** — present, descriptive, includes target keyword (e.g. "RTO compliance platform")?
  Not generic ("ComplyHub" alone is weak).
- **`<meta name="description">`** — present, 150–160 characters, includes primary keyword,
  written for humans not just bots?
- **Open Graph tags** — `og:title`, `og:description`, `og:image`, `og:url` — required for
  social sharing previews (LinkedIn, Slack unfurls). Missing these makes shared links look blank.
- **Twitter Card tags** — `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- **Canonical tag** — `<link rel="canonical">` — prevents duplicate content penalties if the
  page is accessible at multiple URLs.
- **Viewport meta** — `<meta name="viewport" content="width=device-width, initial-scale=1">` —
  required for mobile-friendly indexing.
- **Charset** — `<meta charset="UTF-8">` should be the first element in `<head>`.

### 7.3 — Robots and Sitemap

- Fetch https://rto.complyhub.ai/robots.txt — does it exist? Does it allow Googlebot?
  Does it reference the sitemap?
- Fetch https://rto.complyhub.ai/sitemap.xml — does it exist? Is it valid XML? Does it
  include the key pages? Is it submitted to Google Search Console?
- Are any login-required pages inadvertently listed in the sitemap? These should be excluded
  or noindex'd.

### 7.4 — Core Web Vitals Indicators

From the fetched HTML and any observable patterns in the Vite build:

- **Largest Contentful Paint (LCP)** — what is the largest visible element on load? Is it
  an image without preloading? Is it blocked by render-blocking scripts?
- **Cumulative Layout Shift (CLS)** — are there images or elements without dimensions that
  shift the layout as they load?
- **First Input Delay / Interaction to Next Paint (INP)** — is there heavy JS execution on
  the main thread on initial load?
- **Render-blocking resources** — CSS or JS in `<head>` without `async` or `defer` that
  blocks parsing.

### 7.5 — Structured Data

- Is there any `application/ld+json` schema markup? For a SaaS platform, `SoftwareApplication`
  or `Organization` schema would be appropriate.
- If a public-facing marketing page exists, are FAQs marked up with `FAQPage` schema?

### 7.6 — Technical SEO

- **HTTPS** — is the live URL serving over HTTPS? (Should be, given Vercel — verify.)
- **WWW vs non-WWW** — is there a canonical redirect? Both should not serve independently.
- **Page speed** — note any obvious performance bottlenecks visible from the HTML source that
  would affect Google's page experience ranking signal.
- **Mobile-first indexing** — Google now indexes the mobile version first. Is there any
  indication the app behaves differently on mobile?
- **Hreflang** — for an Australian-only platform (`PD-001`), not required, but confirm there
  is no conflicting multi-language configuration.

### 7.7 — Content and Keyword Signals (if public-facing pages exist)

- Does the page content use terminology that RTOs and ASQA auditors would actually search for?
  ("RTO compliance", "Standards for RTOs 2025", "ASQA audit preparation", "training product
  management", "trainer register")
- Is the primary value proposition visible above the fold without JavaScript execution?
- Are there any broken links detectable from the homepage?

---

## Section 8 — Phase 5: Knowledge Base Gap Audit

**Framing:** You have now read the codebase and the knowledge base. You know what the system does
and what the team knows. Now find the gaps — the things the codebase does that the KB does not
document, the patterns that have evolved without being written down, and the risks that exist but
have no documented mitigation.

### 8.1 — Undocumented Patterns

- Are there Edge Function patterns used in multiple functions that have no entry in
  `complyhub-kb/pinned/conventions.md`?
- Are there React patterns (custom hooks, context structures, component composition) used
  consistently across `src/` that have no documentation?
- Are there RLS policy patterns that are consistent but undocumented?

### 8.2 — Outdated KB Entries

- Are there entries in `decisions.md` that no longer match the codebase? (e.g. a decision
  references a file or pattern that has since changed.)
- Are there entries in `known-issues.md` or `audit/` that are marked open but appear to be
  resolved in the current codebase?
- Does `codebase-state/` accurately reflect the current state, or has it drifted?

### 8.3 — Missing Decisions

- Are there architectural choices visible in the codebase that are not documented in
  `decisions.md`? Future developers will re-litigate undocumented decisions.
- Are there security decisions (e.g. "we chose httpOnly cookies over localStorage for JWTs
  because...") that should be on record?

### 8.4 — Handoff Gaps

- Are there `complyhub-kb/handoffs/` scenarios that should exist but don't? Based on the
  audit findings so far, what operational procedures are missing?

---

## Section 9 — Final Output Format

### Output File

Write the final output to: `complyhub-kb/audit/audit-[DD-MM-YYYY]-session-[N].md`

Use DD-MM-YYYY date format (Australian standard). Session 1 for a new date, increment if
a prior session file for the same date already exists.

### File Structure

```markdown
# ComplyHub Platform Audit — [DD Month YYYY] — Session [N]

**Audited by:** Fable (claude-fable-5)
**Audit started:** [DD Month YYYY]
**KB load date:** [date KB was last updated, per pinned files]
**Phases completed:** [list]
**Phases not completed:** [list, if any — see Continuation Prompt at bottom]

---

## Executive Summary

[3–5 paragraphs. Written for Angela (product) and Carl (engineering lead).
Plain English first paragraph: what is the overall health of the platform?
Second paragraph: the most critical findings and their business impact.
Third paragraph: the most impactful quick wins (fixes under 1 day of work).
Fourth paragraph (if applicable): architectural concerns that need team discussion.
Fifth paragraph: SEO status and highest-impact action.]

---

## Finding Summary Table

| # | Severity | Phase | Category | KB Status | One-line Summary |
|---|---|---|---|---|---|
| 001 | Critical | Security | RLS | NEW | [summary] |
| 002 | High | Security | Edge Function | KNOWN-OPEN [audit/file.md] | [summary] |
| ... | | | | | |

*Sorted: Critical first, then High, Medium, Low. Within each severity, Phase 1 before Phase 2 etc.*

---

## P0 — Cross-Tenant Data Exposure Findings

[This section exists only if any cross-tenant leakage findings were confirmed.
List them here at the top, before all other findings, regardless of severity labelling.]

---

## Detailed Findings

[One block per finding, using the format below. Group by phase.]

### Finding [NNN] — [One-line title]

**Severity:** Critical / High / Medium / Low
**Phase:** [1 Security / 2 Code Quality / 3 Performance / 4 SEO / 5 KB Gap]
**Category:** [RLS / Auth / Edge Function / Frontend / Database / SEO / KB]
**KB Status:** [NEW / KNOWN-OPEN [ref] / INTENTIONAL [PD-NNN] / CARL-RULE-VIOLATION / etc.]
**File:** [path:line or "N/A"]
**Roles affected:** [which user roles are impacted]

**What:**
[One clear sentence stating the problem.]

**Why it matters:**
[Business and technical impact. Who is at risk. What happens if this is not fixed.
For an RTO compliance platform, relate to ASQA audit risk or data protection where relevant.]

**Reproduction / Evidence:**
[File path, line numbers, query pattern, or URL that demonstrates the issue.
For security findings: the exploit path in plain terms.]

**Recommended fix:**
[The smallest safe remediation. Do not over-engineer. Reference the relevant
KB convention, Carl's CLAUDE.md rule, or architectural decision where applicable.
If this requires Carl or RJ's input before implementation, say so explicitly.]

**Effort estimate:** [< 1 hour / half day / full day / multi-day / needs team discussion]

---

[... repeat for each finding ...]

---

## KB Improvement Suggestions

[List of suggested additions or updates to complyhub-kb/, keyed to findings above.
Format: KB-IMP-[NNN] — file to update — suggested addition or correction.]

---

## Continuation Prompt

[Only present if session ended before all phases were complete.
See Section 3 for the required format.]
```

---

## Section 10 — Final Instructions to Fable

1. **Begin with the KB Load** (Section 1). Do not skip it. The cross-reference labels are only
   meaningful if the KB has been loaded first.

2. **Think across files, not within them.** After reading individual files, step back and ask:
   "What does the interaction between these files create that neither file shows alone?"

3. **Adversarial second pass.** After completing each phase, ask yourself: "What would I have
   missed if I only read one file at a time?" Run that check before writing the checkpoint.

4. **Weight findings for this business.** A medium-severity XSS vulnerability on a general
   website is a medium finding. On a multi-tenant RTO compliance platform where RTOs upload
   sensitive staff data, it is High. Adjust severity for the business context.

5. **Be specific.** A finding that says "RLS policies may be weak" is useless. A finding that
   says "`policies.tenant_isolation_select` on `documents` table allows `SELECT` where
   `auth.uid() = owner_id` but does not check `tenant_id`, allowing cross-tenant access if
   two users share the same `owner_id` value across tenants" is actionable.

6. **Flag KB improvements.** Every time you find something the KB does not know about, note it.
   This audit should leave the knowledge base better than it found it, not just produce a
   findings list.

7. **The session continuity system is not optional.** If you approach context exhaustion, execute
   the WRAP-UP procedure. An incomplete audit that saves its progress is far more valuable than
   a complete audit that cannot be written out before the session ends.

8. **Write the output file.** Do not just return the findings as conversation text. Use your
   Write tool to create `complyhub-kb/audit/audit-[DD-MM-YYYY]-session-1.md`. The conversation
   is ephemeral; the file is permanent.

9. **When in doubt about intent, check the KB.** If a code pattern looks wrong but you are not
   sure if it is intentional, check `decisions.md` before filing a bug. Use `INTENTIONAL` labels
   generously for edge cases — it is better to flag and explain than to silently skip.

10. **Report the P0s first.** If you find any cross-tenant data exposure at any point during the
    audit, surface it immediately as a separate message before continuing. Do not wait for the
    final output. Brian will escalate to Carl and RJ in real time.

---

*End of audit prompt. Everything above this line should be pasted into the Fable session.*

---

## Maintenance Notes (For Brian — Do Not Include in Fable Session)

| Item | Notes |
|---|---|
| **Fable model ID** | `claude-fable-5` |
| **When to re-run** | After every major release; after any security incident; quarterly at minimum |
| **Output location** | `complyhub-kb/audit/audit-[DD-MM-YYYY]-session-[N].md` |
| **After the audit** | Review P0/Critical findings with Carl immediately. Add KB improvements per Section 8. Update `known-issues.md` with any new KNOWN-OPEN items. |
| **Version this prompt** | If the stack changes materially (new Edge Functions, schema changes, new roles), update Sections 4.2, 4.3, and the role table in Section 0. |
| **Last audit run** | Not yet run — this is the initial prompt. |
