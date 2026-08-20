# AI Engineering Director Workflow

Purpose: reduce "fix the fix" loops by forcing scope, risk, current-state facts, and proof of done before implementation starts.

This workflow is compatible with Claude and Codex. It does not require a specific agent product. "Director", "Scout", "Fixer", "Reviewer", and "specialist" are roles that can be performed by the current assistant, by a read-only subagent, or by Cursor CLI according to the active workspace rules.

## Core Rule

The Director is a router and decision owner, not a committee.

The Director does not deeply review every domain. The Director classifies the task, selects only the required specialists, defines acceptance criteria, and produces one executable plan.

Specialists challenge only their domain. They do not write fixes, expand scope, or vote equally on unrelated concerns.

## Flow

Use the existing workspace loop:

```text
FRAME -> RECON -> PLAN -> MAKE -> CHECK -> SHIP
```

The Director sits at FRAME and PLAN:

1. FRAME: classify task, risk, scope, specialist set, and required Scout/Reviewer usage.
2. RECON: Scout verifies current repo, live service, database, deployment, or PR state before design.
3. PLAN: Director converts Scout facts and specialist challenges into one plain-English plan.
4. MAKE: Fixer implements only the approved plan.
5. CHECK: Reviewer verifies against the original risks and acceptance criteria.
6. SHIP: commit, push, PR, deploy, migration, and rollout gates follow the normal workspace rules.

## Task Tiers

| Tier | Use case | Default handling |
|---|---|---|
| Tier 0 | Trivial typo, wording, formatting, one-line no-risk change | No council; direct action if otherwise allowed |
| Tier 1 | One-file UI or low-risk logic change | Director classification plus narrow QA check |
| Tier 2 | Normal feature, bug, workflow, or multi-file frontend/backend work | Scout if current behavior is uncertain; selected specialists; reviewer pass |
| Tier 3 | DB, RLS, auth, storage, edge function, security, tenant data, dependency security, production behavior | Scout required; selected specialists; strong reviewer pass; rollout/rollback notes |
| Tier 4 | Major multi-system feature or high-impact production rollout | Staged work units; Director gates between phases; fresh-eyes review at meaningful checkpoints |

## Specialist Activation Matrix

Activate only the rows relevant to the task.

| Change surface | Required specialists |
|---|---|
| CSS, copy, small visual adjustment | Frontend / UX Engineer, QA / Test Engineer |
| React workflow, state, permissions display, forms | Frontend / UX Engineer, Regression Analyst, QA / Test Engineer |
| API, RPC, service, Edge Function | Backend Engineer, Security Engineer, QA / Test Engineer, DevOps / Release Engineer |
| Migration, RLS, SQL, storage policy, tenant-owned records | Database / Data Architect, Security Engineer, Compliance & Tenant-Isolation Guardian, Regression Analyst, QA / Test Engineer |
| AI behavior, compliance responses, retrieval, model routing | Backend Engineer, Compliance & Tenant-Isolation Guardian, Regression Analyst, QA / Test Engineer, DevOps / Release Engineer |
| Dependency PR or package-lock change | Security Engineer, Regression & Dependency Analyst, QA / Test Engineer |
| Pre-PR or pre-merge | Reviewer, QA / Test Engineer, DevOps / Release Engineer, plus any surface-specific specialists |

## Permanent ComplyHub Concerns

For ComplyHub production behavior, the Director must always consider:

- Tenant isolation
- RLS and authenticated authorization boundaries
- Auditability and append-only evidence where relevant
- Register, evidence, and compliance-record integrity
- Existing cron jobs, billing, invitations, and protected infrastructure
- Migration and edge-function deployment implications
- Tenant-gated rollout before broad enablement when risk is meaningful
- Plain-English plan before technical implementation detail

## Fix-the-Fix Prevention Checklist

Before implementation, answer these questions:

- What is the actual root cause or missing capability?
- What current repo, live database, deployed function, or PR state proves the plan is valid?
- What existing behavior must remain unchanged?
- What adjacent workflow, permission, tenant, or integration could regress?
- What should explicitly stay out of scope?
- What exact test, lint, manual QA, live check, or deployment evidence proves done?
- Does this need tenant-gated rollout, rollback notes, or post-merge action?
- What would make the plan unsafe or require stopping?

## Director Output Format

For substantial work, the Director should produce:

```text
Classification:
Tier:
IN SCOPE:
OUT OF SCOPE:
Selected specialists:
Scout required:
Reviewer required:
Plain-English plan:
Acceptance criteria:
Required checks:
Stop conditions:
```

Keep this output short. The goal is better first-pass accuracy, not more ceremony.

## Stop Conditions

Stop and report rather than guessing if:

- Current repo state is unknown and cannot be cheaply verified.
- Live DB, deployed edge function, or production config differs from expected.
- Scope is unclear enough that a reasonable implementation could solve the wrong problem.
- The plan touches migrations, RLS, auth, storage, CI, `config.toml`, or production infrastructure without explicit approval.
- A selected specialist identifies a blocking risk that the plan does not answer.
- Required verification would require a prohibited command or unavailable service.

## Token Discipline

The Director model should reduce total tokens by avoiding rework.

Rules:

- Do not activate a full council by default.
- Do not dispatch Scout or Reviewer for trivial work.
- Prefer one targeted Scout pass over repeated broad searches.
- Specialists answer narrow risk questions; they do not produce full independent plans unless the tier requires it.
- On small work, use the activation matrix as an internal checklist rather than spawning extra agents.

Approximate budgets:

| Tier | Expected budget |
|---|---:|
| Tier 0 | 1k-3k |
| Tier 1 | 5k-12k |
| Tier 2 | 15k-40k |
| Tier 3 | 40k-100k |
| Tier 4 | 100k-200k, staged |

