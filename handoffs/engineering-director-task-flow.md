# Engineering Director Task Flow

Use this handoff when Brian asks for substantial implementation, bug diagnosis, PR review, production behavior changes, DB/RLS/auth/storage work, edge functions, AI behavior, dependency PRs, or ambiguous work.

Do not use the full flow for trivial typos, simple copy edits, or direct one-line questions.

This procedure is Claude and Codex compatible. It names roles, not products.

## Step 1: Frame

State the Director call before work begins:

```text
Classification:
Tier:
Worktree/branch:
IN SCOPE:
OUT OF SCOPE:
Delegation:
Approval needed before edits:
```

For non-trivial work, do not edit until Brian approves the plan unless he already explicitly approved implementation in the same message.

## Step 2: Select Specialists

Use `complyhub-kb/reference/ai-engineering-director.md`.

Select the smallest useful set:

- Frontend / UX Engineer for UI, workflow, accessibility, state, responsive behavior.
- Backend Engineer for services, RPCs, APIs, edge functions, integrations.
- Security Engineer for auth, authorization, secrets, tenant data, unsafe API usage.
- Database / Data Architect for schema, migrations, RLS, indexes, data integrity.
- Compliance & Tenant-Isolation Guardian for ComplyHub compliance outcomes, auditability, tenant separation, register/evidence integrity.
- Regression & Dependency Analyst for "what else could this break?"
- QA / Test Engineer for acceptance criteria and proof of done.
- DevOps / Release Engineer for CI, deployment, env vars, rollback, monitoring, migrations, edge deployment.
- Product / Requirements Guardian when the request could be technically implemented while missing the user's actual outcome.
- Project Rules Guardian always checks the active repo instructions before assumptions.

## Step 3: Scout

Scout is read-only.

Scout verifies facts before design:

- current branch and worktree state
- relevant files and existing patterns
- live database or deployed function state when the task depends on it
- PR diff and current `main` for PR reviews
- existing tests and verification commands
- risks, missing capabilities, and unclear assumptions

Scout reports paths, objects, commands, and evidence. Scout does not write fixes.

## Step 4: Director Plan

The Director turns Scout facts and specialist challenges into one plan:

```text
Plain-English plan:
Technical plan:
Files likely to change:
Objects likely to change:
Acceptance criteria:
Required checks:
Rollout or post-merge actions:
Stop conditions:
```

Keep the plain-English plan first.

## Step 5: Brian Approval

Stop before edits unless Brian already approved implementation.

Approval to edit is not approval to commit.
Approval to commit is not approval to push.

Follow the workspace commit/push gates exactly.

## Step 6: Fixer

The primary session is the Fixer.

Fixer rules:

- implement only the approved scope
- preserve existing architecture and local patterns
- avoid unrelated refactors
- keep migrations, RLS, auth, storage, CI, and config changes behind explicit approval
- record any discovered out-of-scope issue in the appropriate backlog rather than chasing it

## Step 7: Reviewer

Reviewer checks against the approved plan, not against a newly expanded scope.

Reviewer answers:

- Did the implementation satisfy acceptance criteria?
- Did it preserve tenant isolation and auth boundaries?
- Did it avoid unrelated behavior changes?
- What tests/checks/manual QA were run?
- What remains unverified?
- SHIP or NEEDS-WORK?

## Step 8: Ship

Before commit, push, PR, migration, deploy, or rollout:

- run the applicable workspace gates
- run `ci-gate` when required and available
- verify branch before commit and push
- never run prohibited commands
- commit/push only when Brian explicitly says to
- report exact post-merge actions for migrations, edge functions, env vars, and tenant rollout

## Compact Director Prompt

Use this when a task needs Director mode:

```text
Act as AI Engineering Director for this task.

First classify the tier, state IN SCOPE and OUT OF SCOPE, select only required specialists, identify what Scout must verify, and produce a plain-English plan with acceptance criteria and required checks.

Do not activate a full council unless DB/RLS/auth/security/edge-function/multi-system risk requires it.
Specialists challenge only their domain and do not implement.
Optimize for fewer total passes, not more discussion.
Stop before edits unless Brian has explicitly approved implementation.
```

