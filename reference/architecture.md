> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — matches codebase as of late April 2026. Verify edge function count if a major refactor occurs.

# Architecture

High-level picture of how the system is built. Deep technical detail is in the code; this is the map.

---

## Tech Stack

### Frontend
- **React 18** + **React Router 7** (SPA)
- **Vite** (build tool)
- **TypeScript**
- **TailwindCSS** + **Shadcn UI** (Radix primitives)
- **TanStack React Query** (server state)
- **React Hook Form** + **Zod** (forms + validation)
- **Bun** as package manager (`bun.lock`, `bunfig.toml`)

### Backend
- **Supabase** — Postgres DB + Auth + Storage + Edge Functions
- **Edge Functions** written in **Deno/TypeScript** (`supabase/functions/`)
- **Row-Level Security (RLS)** enforced at the DB layer for tenant isolation
- **JWT claims** carry `active_tenant_id` for per-request tenant scoping

### External Integrations
- **Stripe** — subscriptions, billing, invoices
- **Mailgun** — transactional email + inbound parsing
- **TGA / Training.gov.au** — qualification/unit data sync
- **Anthropic Claude API** — AI features (ComplyBot, document analysis, report generation)
- **Perplexity** — some AI research features (`global-perplexity-analyse` edge function)

### Testing
- **Vitest** — unit tests (`tests/` directory)
- **Playwright** — E2E tests (`playwright.config.ts`)
- **Cypress** — E2E tests (`cypress/` directory)
- **Testing Library** — component testing

> ⚠️ Three E2E frameworks coexist. Confirm with RJ which is canonical for new tests.

---

## System Diagram (conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  Auth    │  │  App     │  │  Tenant  │   ← contexts      │
│  │  Context │  │  Context │  │  Context │                   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                   │
│        └──────────────┴──────────────┘                       │
│                       │                                       │
│            ┌──────────┴──────────┐                           │
│            │  React Router v7    │                           │
│            │  + Route Guards     │                           │
│            └──────────┬──────────┘                           │
└───────────────────────┼──────────────────────────────────────┘
                        │ HTTPS + JWT
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase (backend)                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Auth (JWT, with active_tenant_id claim)              │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Postgres (150+ tables, RLS policies)                 │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Edge Functions (196 of them)                         │  │
│  │  AI • TGA sync • Email • Billing • Reports • Crons    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Storage (documents, evidence files)                  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────┬────────────────────┘
           ▼                              ▼
   ┌──────────────┐              ┌──────────────┐
   │   Stripe     │              │   Mailgun    │
   └──────────────┘              └──────────────┘
                     ┌──────────┐
                     │   TGA    │
                     └──────────┘
                     ┌──────────┐
                     │  Claude  │
                     │   API    │
                     └──────────┘
```

---

## Data Flow: A Request's Journey

### Example: "User opens the Governance Register"

1. **Browser:** User navigates to `/dashboard/governance/register`
2. **React Router:** Matches route → renders `<ProtectedRoute>` → `<TenantGuard>` → `<GovernanceRegister>`
3. **Route Guards:** Check `AuthContext.session` and `AppContext.activeTenantId` — redirect if missing
4. **Component:** Uses React Query hook to fetch from Supabase
5. **Supabase Client:** Attaches JWT to request
6. **Postgres + RLS:** RLS policies on `governance_register` table filter rows by `active_tenant_id` claim in JWT
7. **Response:** Only rows belonging to this tenant are returned
8. **React Query:** Caches result, passes to component
9. **Component:** Renders

Every one of these steps has a failure mode. RLS failure = data leak. Missing JWT claim = broken page. Stale cache = wrong data shown.

---

## Key Cross-Cutting Concerns

### Tenant Isolation
- Enforced at DB layer via **RLS policies** using `active_tenant_id` JWT claim
- Frontend also checks via `TenantGuard`
- Never trust the frontend alone — every RLS policy must be correct on its own.

### Auth
- Supabase Auth handles sessions
- `AuthContext` wraps it and exposes `session`, `profile`, `authReady`
- `AppContext` layers on `mode` (superadmin/tenant/loading), `activeTenantId`, `activeTenantRoles`
- Changing tenants = calling `set_active_tenant` RPC → JWT refresh needed

### Storage (private buckets)
- All private bucket operations route through Edge Functions — never directly from the browser
- See `complyhub-kb/pinned/conventions.md` for the storage gateway pattern and rationale

### Billing
- Stripe webhooks sync subscription state → `tenants` table
- `billing-gate` edge function enforces feature access based on tier
- Cancelled/past-due tenants get degraded UI

### AI Features
- `ai-router` edge function routes requests to Claude API
- Document analysis done via `analyze-*` functions
- Red-team / audit simulations via `tas-redteam-*`
- AI outputs can hallucinate — always flag missing user-facing verification warnings

### Crons / Scheduled Jobs
- Several edge functions run on a schedule (`cron-expire-invites`, `revenue-audit-daily`, etc.)
- Manage via Supabase's cron extension
- Crons can silently fail — check logs when investigating missing data

---

## What Makes This Architecture Risky

| Risk | Why | Implication |
|---|---|---|
| RLS policy bugs | Tenant data leaks | Cross-tenant tests are critical |
| JWT claim staleness | Stale `active_tenant_id` after tenant switch | Login/tenant-switch flows need hard reloads |
| Soft navigation vs AppContext | AppContext only refreshes on auth events | Known cause of login loop |
| 196 edge functions | Hard to keep track of contracts | Integration tests for edge functions are sparse |
| AI hallucination | Users believe AI output uncritically | Verify-before-use warnings needed |
| Three E2E frameworks | Duplicated test logic, unclear ownership | Confirm canonical framework with RJ |
