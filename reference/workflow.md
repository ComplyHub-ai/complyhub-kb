> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** medium — fill in the "?" items by asking RJ. Core git and Lovable sections are confirmed.

# Workflow — Git, PRs, Sprints

How work actually gets done.

---

## Git Flow

- **Main branch:** `main`
- **Commit style:** Descriptive messages preferred — "Changes" is not useful. Use conventional commits where possible (`fix:`, `feat:`, `kb:`, etc.)
- Most commits arrive via **Lovable** (the AI coding tool) — treat Lovable-generated code like any AI output: verify and test before shipping

**Questions to confirm with RJ:**
- Do we use feature branches, or commit directly to main?
- Branch naming convention?
- PR required for all changes, or just risky ones?
- Is there a staging branch?

---

## Lovable Integration

Commits in the repo reference Lovable ("Save plan in Lovable"). This means:
- Some code changes are made via Lovable's AI interface, not hand-written
- Lovable commits to the repo automatically
- The hybrid flow: draft in Lovable → refine locally

**Implication:** Lovable-generated code needs extra scrutiny. It's AI output — review it the same way you'd review any generated code.

---

## Sprint Process (confirm with RJ)

- Sprint length: ?
- Standup: ?
- Ticket tracker: ?
- What's "in scope" for a QA ticket vs a dev ticket: ?

---

## PR Checklist

Before opening:
- [ ] Feature branch based on latest `main`
- [ ] All existing tests pass
- [ ] New tests added for new behaviour
- [ ] No new TypeScript errors
- [ ] No new ESLint errors
- [ ] British English conventions followed (`British-English-Conventions.md` in codebase root)
- [ ] No hardcoded secrets or API keys
- [ ] No `console.log`s left in production code
- [ ] UI changes tested on mobile breakpoint
- [ ] Multi-tenant isolation verified (if touching data access)

Before merging:
- [ ] At least 1 review approved
- [ ] CI passing
- [ ] No unresolved conversations
- [ ] PR description updated

---

## Release Process (confirm with RJ)

- Who triggers releases?
- Deploy targets — Supabase hosted, Vercel, Netlify, custom?
- Is there a staging env?
- Rollback procedure?
- Who's on call if prod breaks?

Reference `docs/RELEASE_CHECKLIST.md` and `docs/PRODUCTION_ROLLOUT_RUNBOOK.md` in the codebase.

---

## Daily QA Workflow

```
Morning:
  1. git pull && git log --oneline -5
  2. Note new commits in reference/github-trail.md
  3. Pick next test case to run

During session:
  1. Follow test case steps exactly
  2. Log bugs immediately → file using template in reference/qa-handbook.md
  3. Mark test result (Pass/Fail/Blocked)

End of day:
  1. Update reference/known-issues.md if new bugs found
  2. Write a session note to complyhub-kb/audit/ if decisions were made
```

---

## Communication

**Good question format:** "I'm trying to [X] but [Y] is happening. I tried [A, B]. Expected [Z]. Is this expected?"

Never: "X broken?"

**Escalation:**
- Technical blockers → RJ
- Critical bugs (data leak, auth bypass, billing broken) → RJ immediately
- Product/compliance questions → Angela / CEO
