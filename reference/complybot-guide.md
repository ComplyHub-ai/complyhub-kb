# ComplyBot — Reference Guide

> **Last updated:** 26 August 2026 · **Confidence:** high — reflects live production state as of this date.
> This is the standing reference for how ComplyBot actually works, how to test it, and how to maintain
> its knowledge base. For the full design history and decision log (why the architecture is what it is),
> see the living doc it was built from: `complybot-rag-improvement.md` (workspace root — session-scoped,
> may be deleted once fully archived; this file is the durable summary that survives that).

---

## 1. What ComplyBot is

An AI assistant embedded across the ComplyHub platform that answers RTO compliance questions and
provides general navigation/how-to help. Two modes:

- **Compliance mode** — answers regulatory questions grounded in the curated legislation knowledge base
  (Standards for RTOs 2025 outcome standards, compliance requirements, credential policy).
- **Help mode** — general navigation/how-to guidance, grounded in a separate how-to article table.

Brain: `supabase/functions/ai-router/index.ts`. Model: `claude-haiku-4-5-20251001` via the direct
Anthropic API (no OpenAI/embeddings in the request path). Frontend caller: `src/hooks/useComplyAI.ts`.
UI surfaces: `src/components/ComplyBot/EnhancedComplyBotWidget.tsx`, `ComplyBotWidget.tsx`, plus embedded
panels in dashboards/governance/assessment pages.

---

## 2. How retrieval actually works (as of 26 Aug 2026)

**Agentic tool-use over a directory, single LLM call.** No embeddings, no vector search, no relevance
score/floor. This was a deliberate architecture change (see `complybot-rag-improvement.md`'s 14 Aug 2026
revision) — the entire legislation KB (~54 rows) fits comfortably in-context (~12k tokens for full text,
~700 tokens for just clause number + title), so vector search solves a scale problem this KB doesn't have.

1. Every clause's `clause_number` + `clause_title` (all live rows) is injected into the system prompt as a
   directory, generated at request time — never hand-maintained, so it can't drift from the DB.
2. The model reads the directory and cites clauses it judges relevant as the literal phrase `Clause <N>`
   in its answer.
3. A word-bounded regex extracts these citations server-side (`extractCitationsFromText` in
   `ai-router`'s retrieval module) — bare substring matching was tried and rejected because it produced
   false positives (e.g. "Standards for RTOs **20**25" falsely matching clause 20).
4. If the model cites nothing, **no knowledge-base block is injected** and the response is explicitly
   caveated as general guidance to verify against the instrument — never a silent 15-arbitrary-clause
   dump (that was the original defect, fixed in Phase 0 / PR #500).
5. `kb_miss` (boolean) and `retrieval_strategy` (text — `single_call_v1` is current; `tool_use_v1` and
   `ilike_v1` are historical/legacy paths still seen in old rows) are logged on every response row.

**Terminology and citation guards** run after the model responds, before the response is logged or
returned: a "board"/"directors" → "governing persons" retry-then-substitute filter
(`terminologyFilter.ts`/`terminologyRetry.ts`), and a citation-quote verifier that strips any quoted
legislative text not matching the retrieved clause's actual `legal_text`, capped at 30 words verbatim
(`citationVerifier.ts`). Both live in `supabase/functions/ai-router/`.

**Markdown stripping:** responses are plain conversational prose by instruction, backed by a deterministic
`stripBasicMarkdown()` post-processing pass (strips headers, bold/italic, bullets, numbered lists, tables)
since injected clause text is itself Markdown-formatted and can prime the model to mirror it regardless of
instruction. `[Label](path)` navigation links are explicitly preserved.

---

## 3. Feature flag — `complybot_tool_retrieval`

Gates the agentic tool-use retrieval path. Read by `supabase/functions/ai-router/featureFlags.ts`
(`isToolRetrievalEnabled()`), fail-safe by construction — any error, missing row, or non-active status
resolves to `false` (old ILIKE retrieval), never `true`.

**Lookup order (as of PR #801, 26 Aug 2026):**
1. An exact `tenant_id` match — lets an individual tenant be force-enabled or force-disabled as an
   override.
2. If no tenant-specific row exists, a `tenant_id IS NULL` row on the same `flag_key` — the **global
   default**. This is what rolled the feature out to every tenant, including ones created after 26 Aug
   2026, without needing a per-tenant row insert.

**Admin UI:** Superadmin → System → Feature Flags. **Known bug (pre-existing, still open):** the "Create
Flag" dialog doesn't send a `tenant_id`, so it can't create a new tenant-scoped flag through the UI —
inserting a tenant-scoped override still requires a direct DB insert. The toggle (on/off switch) itself
was fixed in PR #801 — it previously wrote `status: 'enabled'/'disabled'`, values the reader never
checked (only `'active'`/`'draft'`/`'retired'` are real, and only `'active'` is read as "on"), which
silently stranded a re-enabled flag as inactive with no error shown anywhere.

**Global rollout shipped 27 Aug 2026 (PR #801).** Live-verified state:
- `feature_flags` has one `tenant_id IS NULL` row (`is_enabled=true, status='active'`) as the global
  default, plus the original Vivacity Testing Tenant row untouched as a tenant-specific override.
- A partial unique index (`feature_flags_one_global_row_per_flag_key`, on `flag_key WHERE tenant_id IS
  NULL`) enforces at most one global row per flag — the earlier draft relied only on an existence-check
  guard, which didn't actually stop a second global row from being inserted concurrently or via a future
  admin insert.
- `feature_flag_audit_events.tenant_id` and `.actor_id` are now nullable — the table's audit trigger
  (`trg_feature_flag_audit` → `log_feature_flag_change()`) writes both as `NULL` for a global-scope
  change with no owning tenant and no acting human (e.g. a migration), which is correct, not a
  workaround. This was a genuine `NOT NULL` violation blocker the first time the global row was inserted
  — if you ever add another *global* (tenant_id-less) row to any flag-style table with a similar audit
  trigger, check its nullability the same way before assuming a bare `NULL` insert will succeed.

**Checking current flag state:**
```sql
select tenant_id, is_enabled, status, updated_at
from feature_flags
where flag_key = 'complybot_tool_retrieval';
```
A `NULL` `tenant_id` row is the global default; any other row is a tenant-specific override.

---

## 4. The ComplyBot Training page

`/superadmin/complybot-training` → `src/pages/superadmin/ComplyBotTrainingPage.tsx`, gated by the
`sa_dev_tools` platform permission. Tabs:

| Tab | Table | Purpose |
|---|---|---|
| Legislation KB | `legislation_knowledge_base` | Edit clause number/title/legal text/plain-English intent — this is what the directory is generated from |
| How-To Articles | `complybot_knowledge_articles` | Help-mode content |
| Response Logs | `complybot_response_logs` | Every ComplyBot exchange — `kb_miss`, `retrieval_strategy`, `rating`, citations |
| Feedback | `complybot_feedback` | Thumbs up/down + optional comment |
| **Gaps** (added Phase 3, PR #580) | derived from Response Logs + Feedback | See §5 below |

### Editing a clause title or content
Legislation KB tab → find the row → edit `clause_title`, `legal_text`, `intent_plain_english`, etc. →
save. **Takes effect immediately** — the directory is generated fresh per request, not cached/pre-built,
so there's no re-indexing or re-embedding step (that's a deliberate simplification of the old
embedding-based design, which would have needed a re-embed job).

Content authoring note (per organisation guardrails): AI-drafted title/wording suggestions are draft
only — the approved policy suite and Angela's regulatory judgement are authoritative for anything
describing what the Standards for RTOs 2025 actually require.

---

## 5. Gaps tab + Promote-to-KB (Phase 3, PR #580)

Surfaces two real-traffic problem signals, grouped by normalised exact-match question text (no fuzzy
matching):

- **`kb_miss = true` rows** — the model found nothing to cite for compliance-mode questions.
- **Thumbs-down feedback** — a real user rated an answer badly.
- A single incident that's both is deduped (counted once, not twice).

**Promote to KB** action on any gap row opens the `LegislationKBSheet` clause editor pre-filled with the
failed question, so someone can write or fix a clause entry to actually answer it. Saving is live
immediately (see §4).

**Per-clause telemetry table** (second table on the Gaps tab) shows how often each clause is actually
cited in a compliance answer, and what share of those citations were rated thumbs-down — separates an
**authoring problem** (cited often, rated badly → the clause's wording is unclear) from a **coverage
problem** (never retrieved at all → nothing addresses that question). Citation matching here is keyed on
`clause_number` alone, correct only while clause numbers stay unique across instruments (true for all
live rows today — same limitation `ai-router`'s own citation matching already has).

---

## 6. Eval harness — measuring retrieval accuracy

`scripts/complybot-eval-retrieval.ts` — runs every `is_active = true` row in `ai_eval_questions` against
the deployed `ai-router`, checks the returned `citations` array against the tagged expected clause, and
reports:

- **Selection accuracy** — expected clause present anywhere among the citations. The headline metric.
- **Precise selection** — expected clause was the *only* citation (guards against a chattier prompt
  looking like an accuracy win just because it cites more clauses per answer).

**Seed data:** `ai_eval_questions` (48 rows as of 26 Aug 2026) — 4 pulled verbatim from real
`complybot_response_logs` rows with a clean single-clause citation, 44 hand-authored against the live KB
for breadth. RLS matches `sec.is_super_admin()`.

### Running it — one-time setup
```powershell
irm https://deno.land/install.ps1 | iex
```
Close and reopen the terminal, then confirm: `deno --version`.

### Running it — every time
Needs a fresh, real user access token (JWT) for a tenant with the flag enabled — currently any tenant
works since the flag is now global (§3), but the Vivacity Testing Tenant is the historical/documented
choice.

**Getting the JWT:** log into the ComplyHub app as a member of the target tenant → browser DevTools
(F12) → Application tab → Local Storage → the `sb-<project-ref>-auth-token` key → copy the
`access_token` field. **Expires in ~1 hour** — grab a fresh one each time you re-run.

```powershell
cd C:\Users\brian\complyhubworkspace\rto-compass-hub

$env:SUPABASE_URL = "https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service role key — never paste into a chat, terminal only>"
$env:COMPLYBOT_EVAL_JWT = "<fresh access_token>"
$env:COMPLYBOT_EVAL_TENANT_ID = "bc515b64-d24f-4e9d-811b-1f5c0f62a3f7"  # Vivacity Testing Tenant

deno run --allow-net --allow-env scripts/complybot-eval-retrieval.ts
```

**When to re-run:** before and after any tuning change — a clause title edit, directory-richness change
(number+title vs. number+title+intent), or model choice change. Not on a schedule; it's a deliberate
before/after checkpoint, not a monitor.

### First baseline (26 Aug 2026)
**89.6% selection accuracy (43/48), 47.9% precise selection (23/48).** 5 misses, investigation ongoing —
see `active-work.md`'s worktree A entry. Two categories found so far:
- 3 misses (`OS-2025 2.8`, `OS-2025 3.1`, `CP-2025 2B`) returned **zero citations** despite clause titles
  that already closely match the question wording — **not a title-authoring problem**, root cause not
  yet diagnosed (candidate: something about the model's selection behavior or directory construction for
  these specific rows, needs a Scout pass).
- 1 miss (`OS-2025 3.3`) cited a neighbouring clause (`3.4`) instead — plausible genuine title-overlap
  case, a title-tuning candidate.
- 1 miss (`OS-2025 3.2`) cited `CP-2025` credential clauses instead of the `OS-2025` clause itself — the
  cited clauses are substantively relevant (3.2's own text says credentials are governed by the Credential
  Policy), so this may not be a real miss so much as the eval's expected-answer key being too narrow.

**Do not assume all 5 misses share one cause** — the pattern is mixed; check the live clause title and
content for each one before proposing a fix, same as done above.

---

## 7. How to test a ComplyBot change

```powershell
# Unit tests for a specific ai-router module (co-located _test.ts files)
cd C:\Users\brian\complyhubworkspace\rto-compass-hub\supabase\functions\ai-router
& "$env:USERPROFILE\.deno\bin\deno.exe" test --allow-net --allow-env featureFlags_test.ts
# (swap the filename for whichever module you touched — e.g. retrieval_test.ts, terminologyFilter_test.ts)

# All ai-router tests in one pass
& "$env:USERPROFILE\.deno\bin\deno.exe" test --allow-net --allow-env .

# Lint scoped to changed files (never full-repo, never npm run build)
cd C:\Users\brian\complyhubworkspace\rto-compass-hub
npx eslint <changed-file-paths>
```

CI runs a real `deno test` step scoped to `supabase/functions/ai-router` on every PR — this is the
verification of record if Deno isn't available locally for some reason.

**Manual QA click path:** log into the app as a tenant member → open the ComplyBot widget (bottom-right
on most pages, or the dedicated panel on dashboards/governance/assessment pages) → ask a compliance
question → check the response for citations and tone (no Markdown headers/bullets/tables) → thumbs up/down
to generate feedback data → Superadmin → ComplyBot Training → Response Logs / Gaps tabs to confirm the row
logged correctly.

---

## 8. Known open items (as of 26 Aug 2026)

- **5 Phase 4 eval misses** — investigation not started (see §6 above and `active-work.md`).
- **Streaming** — deliberately deferred (PR #537). Biggest remaining latency lever (~10s dead air → ~1.5s
  time-to-first-token) but needs a new `streamComplyBot` path in `useComplyAI.ts` + live browser
  verification, not yet attempted.
- **Dead code cleanup** — `toolDefinitions.ts`/`toolDispatch.ts` and their test files, orphaned since the
  two-call tool loop was replaced by the single-call architecture (PR #537). Left in place deliberately,
  flagged as a small future cleanup PR.
- **Feature Flags "Create Flag" dialog bug** — can't create a new tenant-scoped flag through the UI
  (missing `tenant_id` in the insert). Separate, pre-existing product bug, not ComplyBot-specific.
- **Trial usage cap** — considered, then **explicitly reversed by Brian on 26 Aug 2026**. No cap will be
  built. Do not resurrect this without Brian raising it again.

---

## 9. Key files

| File | Purpose |
|---|---|
| `supabase/functions/ai-router/index.ts` | Entry point, mode routing, orchestration |
| `supabase/functions/ai-router/featureFlags.ts` | `complybot_tool_retrieval` flag read (global + tenant-override lookup) |
| `supabase/functions/ai-router/retrieval.ts` | Directory generation, citation extraction |
| `supabase/functions/ai-router/terminologyFilter.ts` / `terminologyRetry.ts` | "board"/"directors" → "governing persons" guard |
| `supabase/functions/ai-router/citationVerifier.ts` | Verbatim-quote verification against `legal_text` |
| `src/hooks/useComplyAI.ts` | Only frontend caller of `ai-router` |
| `src/components/ComplyBot/EnhancedComplyBotWidget.tsx` | Main widget UI |
| `src/pages/superadmin/ComplyBotTrainingPage.tsx` | Training/Gaps/Feedback admin page |
| `src/hooks/useFeatureFlagsAdmin.ts` | Feature flag admin mutations (toggle/create/update/delete) |
| `scripts/complybot-eval-retrieval.ts` | Eval harness |
| `complybot-rag-improvement.md` (workspace root) | Full decision history — why the architecture is what it is |
