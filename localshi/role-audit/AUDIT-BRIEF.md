# ComplyHub — Per-Role QA Audit Brief (shared)

**Read this fully before starting. Every role-audit agent follows this same brief.**

## Mission

ComplyHub serves many user roles. Your job is to deep-dive the role(s) assigned to your agent, walk every page/feature that role can reach, find issues and bugs, and **classify each finding** so the team knows whether to fix it now or hide it behind a "Coming Soon" cover.

## Hard constraints

- **READ-ONLY on code.** The repo `c:\Users\brian\complyhubworkspace\rto-compass-hub` is on branch `main` (production). Do **NOT** edit, commit, or push any source, migration, config, or edge function. This is diagnosis only.
- **Database is READ-ONLY.** If you query Supabase, use ONLY the MCP server `supabase` (project `gdwhlstfguxarnxasrrs`), SELECT/advisors only. Never call write/migration/branch/deploy tools.
- **Australian English** in all output (organisation, enrolment, licence).
- Your ONLY write is your own report file (path given in your dispatch prompt), under `c:\Users\brian\complyhubworkspace\role-audit\`.

## Prior context (build on, don't repeat wholesale)

A platform audit already exists at `c:\Users\brian\complyhubworkspace\AUDIT-REPORT.md` plus an Opus addendum. It covers cross-cutting issues (hardcoded credentials, edge-function auth, RLS, TenantGuard gaps). **Read it first.** Your job is the **role-specific** view: walk the role's actual journey and surface what a per-role lens reveals that a cross-cutting sweep missed. Reference existing findings by ID where they affect your role, but focus your effort on new, role-scoped findings.

## Method (per role)

1. **Map the role's surface.** From `src/AppRoutes.tsx`, `src/config/roleNavigation.ts`, `src/config/navigation.ts`, `src/config/menu.tsx`, and the sidebars (`src/components/layout/*Sidebar*`, `src/components/nav/*`), list every route/page/menu item this role can reach.
2. **Identify the guards** that gate those routes (`src/guards/*`, `src/routes/guards/*`) — is the role correctly gated? Over-permitted? Under-permitted?
3. **Walk each page.** For each, open the component and check:
   - Does it load **real data**, or hardcoded/placeholder values (e.g. fixed KPI integers, `"–"` strings, mock arrays)?
   - Do its queries hit **real tables/RPCs**? Watch for `from("x" as any)` wrong-table bugs and bare `rpc("name")` calls where the function lives in a non-`public` schema (`ai.`/`compliance.`/`workforce.`) — these fail silently at runtime.
   - Does it call **edge functions** that exist and are auth-correct for this role?
   - Are there **runtime errors**, broken links, dead-end flows, infinite spinners (no timeout/abort), or empty states that look like data?
   - **RLS:** can this role actually read/write what the page needs — or is it blocked / over-exposed?
4. **Classify each finding** (see rubric).

## Classification rubric

Tag every finding with exactly one:

- **FIX** — a real bug with a bounded, completable fix: security/guard gap, broken query, wrong table/schema, runtime error, bad redirect, missing timeout, incorrect RLS. The feature is *meant to work and nearly does.*
- **COMING SOON** — the feature is **unfinished, placeholder, or too big to fix now** (hardcoded KPIs with no DB wiring, missing/unexposed RPCs, stub pages, thin wrappers with no role-specific function, dead-end flows). Recommendation: **put a "Coming Soon" cover over the page/route** so users can't use it. Specify exactly **which route/page** the cover goes on and **how** (e.g. wrap the route element in a `<ComingSoon />` cover, or gate the menu item).
- **REMOVE** — dead/unrouted/test/debug file with no production purpose; recommend deletion.

When unsure between FIX and COMING SOON, judge by **effort + completeness**: small + nearly-done → FIX; large + clearly unfinished → COMING SOON.

## Output format (write to your assigned report file)

```
# Role Audit — <role(s)>

## Surface map
- Routes/pages this role reaches (route → component → guard)

## Findings
For each:
### <short title>
- Role(s): <which role>
- Page/route: <path>
- File:line: <clickable location>
- Issue: <what's wrong, observed not assumed>
- Severity: Critical | High | Med | Low
- Classification: FIX | COMING SOON | REMOVE
- Recommended action: <concrete next step; for COMING SOON state exactly where the cover goes>
- Relates to existing AUDIT-REPORT finding: <id or "new">

## Summary table
| # | Title | Severity | Classification |

## Coming Soon cover list
Bullet list of every route/page you recommend covering, ready for the team to action.
```

Keep findings evidence-based (cite file:line you actually read). Be thorough but do not invent issues. End with the Coming Soon cover list — that's the actionable artifact the team wants.
