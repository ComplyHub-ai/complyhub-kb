# Audit — PRs #128 + #129 + #130: ComplyBot tenant leak, classifier regression fix, thumbs feedback (+ #123 closed)

**Date:** 07 July 2026
**Branches:** `cursor/critical-bug-investigation-5462` (PR #128) · `fix/ai-router-classifier-and-confidentiality-regression` (PR #129) · `feat/complybot-feedback` (PR #130)
**PRs:** #128 · #129 · #130 — merged. #123 (Angela, `feat/complybot-conversation-history`) — **closed, not merged**.
**Merged by:** Brian (Khian)
**Merge commits:** `681bd03fc` (PR #128) · `57189eebc` (PR #129) · `9b7b7bafd1` (PR #130)

---

## PR #128 — Trainer report auth race + ComplyBot tenant leak (Cursor)

- **Security fix:** `complybot-trending` edge function used the service-role key and trusted a client-supplied `orgId` with no tenant-membership check — a genuine cross-tenant data leak (one tenant could read another's ComplyBot usage stats). Fixed: switched to the caller's JWT, now requires an active `tenant_members` row before returning data.
- **Race fix:** `TrainerRouteWrapper` could grant/deny access before tenant role state finished loading, occasionally bouncing legitimate trainers to Access Denied right after login.
- Builds cleanly on top of the earlier `complybot-trending` broken-query fix (PR #125) — did not reintroduce it.
- CI showed 5 red checks (`.single()`, Lint, Security, Supabase Preview, Unit tests) — all confirmed pre-existing, whole-repo failures also present on PR #127 (already merged); none in files this PR touched. Merged via admin override past branch protection.

---

## PR #129 — ai-router classifier + confidentiality regression fix

### Root cause

Angela deployed `ai-router` v560–v563 **directly to production via Supabase MCP** on 5 July (never committed to git) — a classifier rewrite fixing ComplyBot's core defect (misrouting compliance questions containing words like "evidence"/"training" to Help Mode) plus a confidentiality guardrail (declining to discuss ComplyHub's tech stack).

The 6 July staging-sync merge (PR #124) touched `ai-router/index.ts`. `.github/workflows/deploy-edge-functions.yml` fires on any merge touching `supabase/functions/**` and **redeploys every edge function from git, unconditionally**. Since git never had Angela's fixes, that redeploy silently overwrote the live, fixed function (v565) with the old buggy classifier — reverting both fixes without anyone touching `ai-router` intentionally.

Confirmed directly against the live deployed function (not inferred from the changelog): `HELP_KEYWORDS` still contained `'evidence'`/`'training compliance'`; no confidentiality guardrail text present. Production logs at time of discovery: 227/252 logged responses routed to Help mode (~90%) — consistent with the reintroduced bug.

### Fix

No edge-function version history is retrievable via MCP — this is a **faithful reconstruction from Angela's 5 July changelog, not a byte-for-byte restore.**

1. **Classifier rewrite** — replaced ~100-keyword `COMPLIANCE_KEYWORDS`/`HELP_KEYWORDS`/`HELP_VERBS` arrays with `NAVIGATION_ONLY_PATTERNS` (~10 strict regexes matching only explicit navigation phrasing e.g. "where do I find...", "how do I add..."). Everything else defaults to Compliance mode.
2. **Confidentiality guardrail** — added an "Off-Limits Topic" section to `COMPLYBOT_UNIFIED_PROMPT`.
3. **Follow-up commits (bot review + manual catch), same PR:**
   - Cursor/Vercel flagged: operational live-data questions ("which credentials expire soon?") and dashboard-score questions were falling through to Compliance mode instead of the Help-mode branch that actually fetches live tenant data. Fixed — `routeQuestion` now also routes those to Help mode.
   - Two navigation patterns were too broad and stole compliance questions ("where is the requirement...", "which section of the standard..."). Tightened.
   - Manually caught (Brian): troubleshooting/support phrasing ("why can't I...", "won't load", "how do I fix") had no replacement pattern after the keyword-array removal, so it fell through to the restrictive legislation-only block. Added `TROUBLESHOOTING_PATTERNS`.
- Verified via a standalone routing simulation script (not a unit test) against 18 sample queries spanning compliance/navigation/operational/score/troubleshooting — all routed correctly.
- `OPERATIONAL_PATTERNS` and `SCORE_QUESTION_PATTERN` preserved (used elsewhere; confirmed via grep before removal).
- `response_log_id` (Angela's v563 fix) intentionally **not** included in this PR — done separately, correctly, in PR #130 (avoided a merge conflict).

### Process gap identified

No CI drift check exists for edge functions (migrations have one; edge functions don't) — a direct MCP/Lovable deploy can silently diverge from git and be clobbered by the next unrelated merge. **Resolution:** added a read-only edge-function drift check (Step 6) to the `/audit-branch-drift` personal skill (`~/.claude/skills/audit-branch-drift/SKILL.md`) — compares live deployed functions against git source, flags likely direct deploys by timestamp correlation against `deploy-edge-functions.yml` run history. Deliberately kept out of GitHub CI (would go permanently red given years of pre-existing drift, e.g. the 25 MB `mcp` function) — this is an on-demand, non-blocking check only.

### Also discovered (separate, unresolved)

`deploy-edge-functions.yml` fails on every run once it reaches the `mcp` function (ported in during PR #124) — its deployed bundle is 25 MB, over Supabase's function size limit (413 "request entity too large"). Confirmed the workflow deploys alphabetically, so `ai-router` (and anything before `mcp`) still deploys successfully despite the overall run reporting failure — but anything alphabetically after `mcp` may silently not be deploying. **Not yet fixed** — flagged as a priority follow-up, not addressed in this PR.

---

## PR #130 — ComplyBot thumbs up/down feedback (ports the feedback half of #123)

Angela's PR #123 (`feat/complybot-conversation-history`) bundled two things: Conversation History (persistence + resume) and thumbs up/down feedback. It was based on a pre-staging-sync `main`, so merging it as-is would have reverted three fixes from the 6 July staging-sync (the `ScrollArea` scroll-bug fix, the AI disclaimer text, `secureId()` session IDs) and reintroduced the Conversation History panel that was deliberately removed that same day.

**Decision:** port only the feedback half onto current `main` via a new branch; Conversation History stays removed. #123 closed without merging once #130 landed (see below).

### What shipped

- New `useComplyBotFeedback.ts` — `useSubmitFeedback`, `useUpdateFeedbackComment`, `useComplyBotFeedbackSummary`, plus `buildFeedbackInsert` extracted as a pure, unit-tested column-mapping function. Uses real generated types — no `(supabase as any)`.
- `types.ts` — added `complybot_conversations` + `complybot_feedback` table types via a scoped hand-insertion from a live schema introspection (both tables already existed in production, provisioned directly, never captured in a migration file) — deliberately not a full `types.ts` regen (would have produced a ~124k-line diff of unrelated noise).
- Thumbs up/down UI on both chat surfaces (`CompactComplyBotChat.tsx`, `EnhancedComplyBotWidget.tsx`), optional comment on thumbs-down.
- `ai-router` now returns `response_log_id` (written to `complybot_response_logs` but never selected back in the original code — #123's own assumption that this field existed was wrong even in its original form).

### Bot review — 6 confirmed findings across 2 rounds, all fixed

**Round 1 (Cursor + Vercel), all confirmed real:**
1. Thumbs-up stayed clickable after thumbs-down (no lock set on down-click) — could silently overwrite a recorded down-vote with an up-vote.
2. Feedback insert mutation called *inside* a React `setState` functional updater — impure, risked double-insert under Strict Mode/concurrent re-invocation.
3. **Most serious:** thumbs-down never inserted a row on click — only on Send or the comment input's `onBlur`. A user who clicked thumbs-down and walked away without ever focusing the comment box left **no record at all**.
4. (Vercel) Comment `<input>` lost focus after one keystroke in the widget — `Feedback` was a function declared inside the parent's render body, so every re-render redefined it, and React remounted the whole subtree (destroying the `<input>` DOM node) on every keystroke.

Root-cause fix: reworked thumbs-down to insert immediately on click (matching thumbs-up) and lock both buttons right away; the comment box became a pure follow-up that UPDATEs the already-inserted row via a new `useUpdateFeedbackComment` mutation. Hoisted `Feedback` to module scope as a prop-driven component for stable identity across re-renders.

**Round 2 (Cursor), found on the round-1 fix, also confirmed real:**
5. The round-1 fix showed "locked"/"Thanks"/comment-box optimistically *before* the insert resolved — if the mutation threw, or returned null (missing tenant/user context), the UI showed the vote as saved with nothing written and no retry path.
6. The down-vote comment box appeared immediately, while the insert (and its row id) was still in flight — a fast Send/blur read `rowId` as `null`, silently dropped the comment, and marked the interaction done so it could never retry once the row id actually arrived.

Final fix: buttons still lock immediately (prevents double-fire), but success UI (Thanks / comment box) is only revealed once the insert genuinely resolves with a row id — this eliminates finding 6 by construction (Send/blur can no longer be reached before `rowId` exists). On failure, state rolls back to fully unlocked with an error toast, enabling retry — fixes finding 5.

### Test coverage

- `tests/hooks/useComplyBotFeedback.test.ts` (3 cases) locks down the `buildFeedbackInsert` column mapping — proves tenant/user/rating/response_log_id map to the correct `complybot_feedback` columns, including null-coercion for optional fields.
- **Not added:** a render/interaction test for the click-sequence fixes (findings 1–6). `CompactComplyBotChat`/`EnhancedComplyBotWidget` each pull in 5+ hooks that would need mocking to render either component; verified instead by tracing each fix against the exact bot-flagged code paths. Flagged as a gap, not silently skipped.

### Deliberately excluded from #123

- `useComplyBotConversations.ts`, `ConversationHistoryPanel.tsx` rewiring, `selectedConversationId` plumbing, the 3-column layout revert, the "New chat" save/resume flow — all skipped. Conversation History stays removed, per the 6 July staging-sync decision.

---

## PR #123 — closed, not merged

Angela's original PR. Closed on GitHub (07 Jul 2026, 02:40 UTC) once #130 captured the reusable half of its content. Branch `feat/complybot-conversation-history` left on remote (not deleted). No production impact — PR was never merged.

---

## Files changed across #128/#129/#130

| File | PR(s) | Change |
|---|---|---|
| `src/contexts/AuthContext.tsx` | #128 | Auth-ready race fix |
| `src/routes/guards/TrainerRouteWrapper.tsx` | #128 | Wait for tenant role readiness |
| `supabase/functions/complybot-trending/index.ts` + new `auth.ts` | #128 | JWT + tenant-membership check, drop service-role key |
| `supabase/functions/ai-router/index.ts` | #129, #130 | Classifier rewrite, confidentiality guardrail, troubleshooting patterns, `response_log_id` return |
| `src/hooks/useComplyBotFeedback.ts` | #130 | **NEW** — feedback mutations + summary query |
| `src/hooks/useComplyAI.ts` | #130 | `response_log_id` added to `AIResponse` |
| `src/integrations/supabase/types.ts` | #130 | `complybot_conversations` + `complybot_feedback` types |
| `src/components/ComplianceIntelligence/CompactComplyBotChat.tsx` | #130 | Thumbs up/down UI + fixes |
| `src/components/ComplyBot/EnhancedComplyBotWidget.tsx` | #130 | Thumbs up/down UI + fixes |
| `tests/hooks/useComplyBotFeedback.test.ts` | #130 | **NEW** — column-mapping test |

---

## Notes

- No migration files involved in any of the three PRs — `complybot_conversations`/`complybot_feedback` already existed in production (Lovable-era-style direct provisioning, same pattern as the earlier `tenants` schema drift).
- Production Vercel deploy verified `READY` for both #129 and #130 merge commits.
- Production `ai-router` verified live and correct after each merge by fetching the deployed function directly (not assumed from CI status) — confirmed `NAVIGATION_ONLY_PATTERNS`/`TROUBLESHOOTING_PATTERNS`/confidentiality text present after #129, and additionally `response_log_id` present after #130, with nothing from #129 lost in the #130 merge.
- `mcp` function 25 MB deploy failure remains open — next priority item.
