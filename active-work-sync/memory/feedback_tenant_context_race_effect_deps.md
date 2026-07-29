---
name: feedback-tenant-context-race-effect-deps
description: "any useEffect that fetches tenant-scoped data must depend on tenant-context readiness (useEffectiveRole's ready + effectiveTenantId), not just route params, or it races the context resolving on first mount"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-27T02:36:36.932Z
---

A `useEffect` that fetches a tenant-scoped record and is keyed only on a route param (e.g. `[id]`) will
often fire on first mount *before* `useEffectiveRole()`/`useAppContext()` has resolved — `ready` is still
`false` and `effectiveTenantId` is still `null` at that point. If the fetch adds an
`.eq('tenant_id', effectiveTenantId)` filter (as defence-in-depth tenant-scoping patches do), the query
runs with a null tenant_id, returns zero rows, and a perfectly valid record gets treated as "not found" —
often triggering a redirect-away before the tenant context ever gets the chance to resolve and retry.

**Why:** confirmed real bug on PR #310 (24 Jul 2026, cross-tenant leak fix), `EditCAA.tsx` — flagged by
Cursor Bugbot. The effect had always been keyed on `[id]` alone; adding the tenant_id filter (closing the
cross-tenant leak) was correct, but exposed this pre-existing race for the first time, since previously
the query had no tenant dependency to race against.

**How to apply:** any effect fetching tenant-scoped data should depend on both readiness and the tenant id
itself, and should short-circuit (stop loading, don't redirect) rather than fetch while not ready:
```ts
const { ready, effectiveTenantId } = useEffectiveRole();
useEffect(() => {
  if (!id || !ready) return;
  if (!effectiveTenantId) { setLoading(false); return; }
  fetchRecord();
}, [id, ready, effectiveTenantId]);
```
This pattern (plus the ❌/✅ example) was added to `rto-compass-hub/CLAUDE.md`'s frontend hard-rules
section on 24 Jul 2026 — check there first, this may already be documented in more detail.
