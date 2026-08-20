# ComplyBot RAG Improvement — Living Decision Doc

> **Created:** 14 August 2026 · **Owner:** Brian (Khian) · **Status:** ✅ PR #435 done, ✅ PR #500 done, ✅ PR #523 (Phase 2) done and deployed, ✅ PR #537 (latency + logging + formatting follow-up) done and deployed; next sequenced work is PR 6 (terminology guard), Phase 3, or the deferred streaming/dead-code follow-ups noted under PR #537 below
>
> **Major revision 14 Aug 2026 (same day).** After (a) measuring the KB's actual token
> footprint and (b) reading Vivacity's already-shipped `ask-viv-assistant` RAG in
> `unicorn-cms-f09c59e5`, the retrieval architecture changed from *embedding search with a
> blended relevance floor* to *agentic tool-use over a directory*. Decisions **#1**, **#2**
> and **#7** are superseded, **Phase 1** is deferred behind a seam rather than built, and
> **Phase 2** is rewritten. Superseded text is kept in place and marked — do not implement
> anything under a "SUPERSEDED" heading. New material: **§3** (revised mechanism),
> **§6A** (cross-cutting engineering requirements), **§6B** (reference implementation).
> Sections are numbered 6A/6B rather than renumbered so existing "§7 Parked"
> cross-references stay valid.
>
> **Second revision, same day.** Brian confirmed: #9's trial cap applies to Compliance mode
> only (Help mode stays unlimited), is scoped per-trial rather than per-calendar-month, and
> ships as its own PR ahead of segmenting the rest of this plan across multiple PRs and the
> two active worktrees. §6A item 1's kill switch now uses ComplyHub's existing live
> `feature_flags` table rather than new bespoke columns. §6A item 5's terminology guard
> resolves a persistent violation by retry-then-substitute rather than failing the response.
> **Third revision, same day.** Brian locked the cap value: **20 Compliance-mode questions
> per 14-day trial, soft warning at 16 (80%).** This was the last open number in the
> document. **Every locked decision in this file is now implementation-ready — a fresh chat
> with no prior context can pick up any phase or PR from here without waiting on further
> input.** The only remaining unlocked item is a copywriting detail (exact block-state
> messaging for #9), not a blocker.
>
> **Fourth revision, same day.** ✅ PR #435 (`fix: gap-fill complybot feedback RLS
> migration`) landed on `main` and completed PR 1 / items #4 + #5. It gap-filled the
> uncaptured `public.complybot_feedback` table, removed the billing gate from feedback
> submission, replaced the broken super-admin read policy with clean permissive policies,
> and added an own-row update guard. The next AI should **not reopen #4/#5** unless
> production verification later shows a regression. Continue with **#11 / PR 2** next
> (route-permission/sidebar dead-end fix). The next database slot is no longer occupied by
> feedback RLS; use it for #9's cap migration or Phase 0's `retrieval_strategy` migration,
> whichever Brian chooses next.
>
> **Fifth revision, 19 Aug 2026.** Re-verified item #11 against `main` @ `b2a76e5e2` before
> starting PR 2. The original 14 Aug findings for #11 are **partly stale** — see the
> correction block inside #11 (§5) and the note added to #10's write-up. Two of the three
> original claims no longer describe a live bug; a different, more serious live bug was
> found in their place (most of Regulatory Officer's Auditor-section sidebar links point at
> routes that don't exist in the router at all — confirmed present since the app's very
> first commit, `e18dcafa5`, 7 Oct 2025, not a work-in-progress feature). **Brian's call:
> do not fix any of this now.** Corrected findings are recorded below for whenever this is
> picked up; PR 2 is not proceeding at this time. Also confirmed: `RoleRouteGuard.tsx` is
> dead code (zero importers anywhere in `src/`) — the live route-guarding mechanism is a
> separate family of components (`AdminRoute`, `AuditorRoute`, `TenantGuard`, etc.) directly
> in `AppRoutes.tsx`, not `roleNavigation.ts`'s `routePermissions`/`canAccessRoute` system.
>
> **Sixth revision, 19 Aug 2026.** ✅ **PR #523** (`feat: ComplyBot compliance-mode agentic
> tool-use retrieval (Phase 2)`) merged to `main` and deployed to production automatically.
> Phase 2 / PR 5 (§4, §4A) is now marked ✅ DONE. Went through three rounds of adversarial
> fresh-eyes review (13 confirmed findings total, all fixed and re-verified against the live
> database) before merge. CI gained a new `deno test` step (scoped to
> `supabase/functions/ai-router` only) that ran for real on the merge commit — 28/28 tests
> passed. The `complybot_tool_retrieval` feature flag was created and enabled for the
> Vivacity Testing Tenant only (`bc515b64-d24f-4e9d-811b-1f5c0f62a3f7`) for live testing
> ahead of wider rollout — every other tenant is unaffected (ships dark by default).
> **New finding, out of scope for this document:** the Feature Flags admin UI's "Create
> Flag" dialog does not send a `tenant_id`, so it cannot currently create any new
> tenant-scoped flag — confirmed via a live reproduction (`null value in column "tenant_id"
> ... violates not-null constraint`). The flag above was created via direct database
> insert instead, attributed to Brian's real account. This is a real, separate product bug,
> not a ComplyBot/RAG issue — flagged here only so it isn't lost; track and fix as its own
> small piece of work. Next step: PR 6 (terminology/banned-term guard + citation-quote
> verification, §6A items 5+6), or Phase 3, per §4A.
>
> **Seventh revision, 20 Aug 2026.** ✅ **PR #537** (`fix: ComplyBot single-call retrieval,
> prompt-history logging bug, and Markdown formatting`) merged to `main` and deployed to
> production automatically (confirmed live — the deployed `ai-router` bundle was verified
> post-merge to contain the new code, not stale cached content). This was live-testing
> follow-up work, not an originally-numbered PR in §4A's segmentation table — triggered by
> Brian personally testing ComplyBot in the Vivacity Testing Tenant and reporting two
> issues: response latency of ~10-15 seconds, and Markdown-heavy formatting (headers, bold,
> tables, bullet dashes) instead of conversational prose. Three fixes shipped, all gated
> behind the existing `complybot_tool_retrieval` feature flag except the first, which is a
> global correctness fix:
> - ✅ **Logging/routing bug fixed.** `userQuery` was being built by joining every user
>   message in the conversation history with a space instead of using only the latest
>   message — this corrupted mode routing, the legacy ILIKE knowledge-base search, and the
>   logged prompt on turn 2+ of any conversation. Root-caused via live `complybot_response_logs`
>   query showing three rows with an identical concatenated prompt, plus two of five test
>   questions never logged at all (traced to the same silent-tenant-resolution gap
>   documented in #5). Fixed to derive from the latest user message only.
> - ✅ **Latency fixed — collapsed to a single LLM call.** Phase 2's two-call agentic
>   tool-use pattern (pick clauses via `lookup_clauses`, then answer) cost an entire extra
>   model round trip — confirmed by an Opus-level architecture review to be ~80% of the
>   measured 10-15s latency, far more than what streaming or DB-call parallelisation alone
>   would save. Replaced with a single call: the full 54-row knowledge base is injected as
>   one Anthropic-cached system block, and the model answers directly, citing clauses as
>   the literal phrase "Clause `<number>`". This citation-matching approach was tightened
>   during adversarial review after an initial bare-substring-match draft was found to
>   falsely cite clauses whose number happened to appear elsewhere in the answer (e.g. "the
>   Standards for RTOs **20**25" falsely citing clause 20) — fixed to require the
>   word-bounded phrase "Clause N", with regression tests added.
> - ✅ **Formatting fixed.** Added an explicit no-Markdown, plain-conversational-prose
>   instruction to the system prompt, plus a deterministic `stripBasicMarkdown()`
>   post-processing backstop (strips headers, bold/italic, `-`/`•`/`*` bullets, numbered
>   lists, and Markdown tables) applied to every response, since other injected context
>   (retrieved clause text) is itself Markdown-formatted and can prime the model to mirror
>   it regardless of instruction. `[Label](path)` navigation link syntax is explicitly
>   preserved — verified against the widget's citation-rendering regex.
>
> Went through one round of adversarial fresh-eyes review (live-DB verified) before merge —
> 4 confirmed bugs found and fixed prior to commit (the false-citation substring match
> above; `max_tokens` had been halved to 4096 with no truncation logging, both reverted/
> restored; the response-log id was being returned to the client before the write was
> confirmed, risking a permanently-broken thumbs-up/down button on any write failure —
> reverted to an awaited insert so the id is only returned on confirmed success) — plus 6
> smaller "worth a second look" findings, of which 4 were also fixed (markdown stripper
> extended to catch `*`/numbered-list fallbacks; pipe-stripping scoped to genuine table
> rows only; `select('*')` replaced with an explicit column list on the full-KB fetch;
> regression tests added for both new functions). ci-gate ran clean (lint, security guards,
> no migrations in this PR) before push.
>
> **Deliberately deferred, not done:** actual response streaming — identified by review as
> the single biggest remaining latency lever (converts ~10s of dead air into ~1.5s
> time-to-first-token) but requires frontend widget changes (a new `streamComplyBot` path
> alongside `useComplyAI.ts`'s existing `callAI`) and live browser verification not
> attempted in this pass. Also deferred: `toolDefinitions.ts`/`toolDispatch.ts` and their
> test files are now dead code (nothing calls them since the two-call tool loop was
> replaced) — left in place deliberately per minimum-scope, flagged as a small future
> cleanup PR. Live re-verification of the citation fix and formatting against real chat
> traffic in the Vivacity Testing Tenant is still pending as a follow-up manual QA step.
>
> Single source of truth for rebuilding ComplyBot's retrieval so it is genuinely
> grounded in the curated knowledge base, and for turning
> `/superadmin/complybot-training` into a real feedback loop.
>
> **How to use this file:** open items are worked one at a time. Once every item is
> LOCKED, a fresh chat with no prior context should be able to read this cold and go
> straight to implementation. Delete this file once implementation is complete and the
> audit file has been produced.

---

## 1. Verified current state (checked 14 Aug 2026 — do not re-derive)

All of the following was confirmed against the live Supabase project and the branch
`fix/showcase-bugs-2026-08-14` in worktree A. Treat as ground truth as at the date above;
re-verify anything before acting on it if significant time has passed.

### Architecture

- React + TypeScript (Vite) frontend, Supabase-only backend. No separate API layer.
- 364 edge functions in `rto-compass-hub/supabase/functions/`.
- ComplyBot's brain is `supabase/functions/ai-router/index.ts` — **1,038 lines**, against a
  500-line house limit, and explicitly listed in `AGENTS.md` under "Do NOT copy from".
- The only frontend caller of `ai-router` is `src/hooks/useComplyAI.ts`.
- UI surfaces: `src/components/ComplyBot/EnhancedComplyBotWidget.tsx` (1,053 lines),
  `ComplyBotWidget.tsx`, plus embedded panels in dashboards, governance, and assessment
  validation.
- Model: `claude-haiku-4-5-20251001`, direct Anthropic API, single call, 8192 max tokens,
  no streaming, no escalation to a stronger model.
- `ai-router` has `verify_jwt = true` in `config.toml`.

### The training directory

`/superadmin/complybot-training` → `src/pages/superadmin/ComplyBotTrainingPage.tsx`,
gated by the `sa_dev_tools` platform permission. Four tabs:

| Tab | Table | Live row count |
|---|---|---|
| Legislation KB | `legislation_knowledge_base` | **54** (OS-2025: 25, CR-2025: 18, CP-2025: 11) |
| How-To Articles | `complybot_knowledge_articles` | **11** |
| Response Logs | `complybot_response_logs` | **301** |
| Feedback | `complybot_feedback` | **0** |

### The retrieval defect (root cause)

`ai-router/index.ts` lines ~198-208 search the KB with
`ILIKE '%<entire raw user question>%'` across `clause_number`, `clause_title`,
`legal_text`, `intent_plain_english`. This only matches if a KB field literally contains
the user's whole sentence. Tested against production:

| Question | Rows matched |
|---|---|
| "What does Standard 3.2 require?" | 0 |
| "What evidence do I need for trainer credentials?" | 0 |
| "How often must assessment validation occur?" | 0 |

Every real compliance question therefore falls through to the fallback: `.limit(15)` with
**no WHERE clause** — 15 arbitrary clauses — injected under the header
*"Answer ONLY from this content. If the answer is not here, say so."*

The bot still produces reasonable answers only because the unified system prompt also
permits general knowledge of the instruments. The curated KB is contributing noise, not
signal.

`rpc_search_knowledge_articles` (used for how-to articles in Help mode) has the same
whole-question-substring flaw, partially mitigated by per-keyword scoring.

### Supporting evidence the "learning" loop is inert

- `pgvector 0.8.0` **is installed**. The only `vector` column in the whole database is
  `_zz_deprecated_complyhub_knowledge.embedding` — a deprecated table with 0 rows.
  Semantic search was started and abandoned.
- Dead tables, all 0 rows: `complybot_conversations`, `complybot_messages`,
  `complybot_prompts`, `complybot_interactions`.
- `complybot_queries` — 4 rows. The `complybot-learning-logger` pipeline is effectively
  unused.
- ✅ `complybot_feedback` — 0 rows at the time of the 14 Aug audit. Thumb ratings are
  written directly from `src/hooks/useComplyBotFeedback.ts` via PostgREST. PR #435 fixed
  the confirmed RLS blockers that could silently prevent inserts and super-admin reads:
  the table/policies were gap-filled into git, `fb_billing_gate` was removed, super-admin
  read was split into a permissive policy, and own-row update was locked down. If the row
  count stays near-zero after PR #435 has been live for a short observation window, treat it
  as likely low engagement or weak UI prompting, not as the original unresolved RLS issue.
- `complybot_response_logs` breakdown of 301 rows: 199 help/high, 58 compliance/medium,
  33 help/medium, 11 help/low. All 11 low-confidence rows had route hallucinations caught
  by the sanitiser. Compliance mode's confidence is **hardcoded** to "medium" — there is no
  real scoring for it.
- `complybot_response_logs` already has an **unused `kb_miss boolean` column**.
- `ai_eval_query_sets` already exists with **2 rows** — an eval harness was started and
  abandoned.

### Available tooling (nothing new needs provisioning)

- `pgvector 0.8.0` — installed.
- `pg_trgm 1.6` — installed.
- `pg_cron 1.6`, `pg_net 0.19.5` — installed.
- `OPENAI_API_KEY` — already configured and in live use by 11 edge functions
  (`ai-matrix-extract`, `ai-tenant-coach`, `analyze-document`, `analyze-documents-batch`,
  `calendar-ai-suggestions`, `classify-governance-action`, `complybot-meeting-insights`,
  `generate-dashboard-insights`, `generate-meeting-summary`, `parse-meeting-notes-ai`,
  `verify-evidence`).
- `ANTHROPIC_API_KEY` — configured, used by `ai-router`. Note Anthropic has no embeddings
  endpoint, which is why embeddings go via OpenAI.

### Schema notes that will bite during implementation

`legislation_knowledge_base` columns — several are **ARRAY**, not text:
`performance_indicators`, `evidence_requirements`, `rto_decisions`, `common_risks`,
`guidance_themes`, `cross_links`, `self_assurance_questions`. The current
`formatClausesForContext` in `ai-router` interpolates them straight into a template
literal, which comma-joins them sloppily. Worth tidying when that function is touched.

Text columns: `instrument_id`, `clause_number`, `clause_title`, `quality_area`,
`division`, `legal_text`, `intent_plain_english`, `what_law_requires`, `guidance_source`.

---

## 2. Operational constraints (from CLAUDE.md — apply to every phase)

- **`supabase db push` is unusable.** Production's ledger carries ~2,000 pre-baseline
  versions with no local file. Every migration in this plan follows the interim procedure:
  merge the PR → read the SQL from the migration file on `main` → apply via Supabase MCP
  `execute_sql` → verify the change landed → hand Brian the
  `supabase migration repair --status applied <version>` command for his terminal →
  verify the ledger row afterwards. **Never `apply_migration` for a file that exists in
  `supabase/migrations/`.**
- **One database job at a time.** *Updated after PR #435 — Phase 1 is deferred and Phase 2
  no longer touches the database. The `complybot_feedback` RLS fix (#4 + #5) is done, so
  the remaining database-bound work is #9's small settings/index migration, Phase 0's
  `retrieval_strategy` column, Phase 3, and #6's `DROP TABLE` cleanup.* Only one of these
  may be in flight at a time; while one is, the other worktree takes frontend-only work.
  See §4 "Sequencing" for the current next step.
- **Never run `npm run build` or the full `tsc --build`.** Rely on `npm run lint` scoped to
  changed files plus manual diff review. Vercel's build is the real gate.
- **Migrations must be idempotent** (safe to run twice) and must satisfy the CI guards:
  RLS enabled on new tables, index on new `tenant_id` columns, `SET search_path = public`
  on SECURITY DEFINER, `(SELECT auth.uid())` in RLS policies.
- Run the `ci-gate` skill before any commit/push/PR. Commit, push, and PR are three
  separate gates, each needing Brian's explicit word.

---

## 3. The mechanism (REVISED 14 Aug 2026)

**Agentic tool-use over a directory. The model chooses what to retrieve; there is no
similarity score and no relevance floor.**

1. **Directory in the system prompt.** Every clause's identifier and title — all 54 rows —
   as a compact list. Measured live: `clause_number + clause_title` across the whole table
   is **2,643 characters (~700 tokens)**. Adding `intent_plain_english` brings it to
   14,030 characters (~3,700 tokens) if richer selection cues prove necessary. Start with
   number + title; add intent only if eval data shows selection is failing.
2. **A `lookup_clauses(clause_numbers: string[])` tool.** The model names the clauses it
   wants; the tool returns their full text. No embedding, no scoring, no regex.
3. **The model's selection *is* the relevance judgement.** "None of these apply" is a
   natural, honest output — which is exactly the behaviour the relevance floor was
   invented to force. Removing the floor removes the tuning problem with it.
4. **Same shape for Help mode** — a `search_articles` / directory equivalent over the 11
   how-to articles, per #3's mode split.

**Why this is viable here and not in Unicorn:** the *entire* legislation KB —
`legal_text` + `what_law_requires` across all 54 rows — is **44,706 characters
(~11,800 tokens)**, against a 200,000-token context window. Vector search exists to find a
needle in a haystack; at this size there is no haystack. Vivacity's `srto_corpus` genuinely
needs vectors because it is chunked PDFs running to thousands of chunks (§6B). ComplyHub's
KB is roughly 400× smaller and hand-curated.

**The seam.** Retrieval sits *behind a tool boundary*, exactly as Vivacity's
`search_standards` does. The tool's contract is "take a question or clause list, return
clause text." Today that is a directory plus a direct fetch. If the KB ever outgrows the
prompt (several hundred entries — Phase 3 targets roughly 150), the tool's internals are
replaced with embedding search and **nothing above the boundary changes**. This is why
Phase 1 is deferred rather than deleted.

**Trade-offs, recorded honestly:**
- **One extra round trip.** The model selects, then answers — roughly 1–2 seconds, versus
  ~200ms for a single embedding call. This is the real cost of the approach.
- **The failure mode moves** from vocabulary mismatch (embeddings) to judgement
  (model skips a clause that applied). Phase 4's eval set measures exactly this. Critically,
  when it fails the fix is usually **a better clause title** — Angela's authoring work, not
  an engineering ticket.
- **Solves the clause-numbering problem outright.** The model reads the real identifiers and
  asks for them by name, so the messy formats confirmed live — `1A`–`3B` (CP-2025),
  `Schedule 1 — probity`, `Section 2 context`, the range row `1-6`, and `1.2b` sitting
  alongside `1.2` — need no regex, no normalisation and no format assumptions.

### SUPERSEDED — original vector-blend mechanism (do not implement)

> Replace word-matching with meaning-matching, blended with two cheaper signals:
>
> 1. **Semantic similarity** — every KB entry is embedded into a vector. The user's question
>    is embedded the same way. Nearest vectors win. This is what makes "what quals do my
>    trainers need?" find the credential clauses despite sharing no words with them.
> 2. **Clause-number detection** — a regex spotting "3.2", "Standard 1.1", "clause 2.4" in
>    the question, jumping straight to that clause.
> 3. **Fuzzy text** — `pg_trgm` similarity for exact terminology ("third party arrangement").
>
> Blended into a single ranked list with a **relevance floor**. The floor is the critical
> part: the system must be willing to return **nothing**. Injecting nothing and letting the
> bot say "I can't find that in the knowledge base" is strictly better than injecting noise
> under an "answer ONLY from this" instruction.

The *principle* in the final paragraph above survives intact and is the one thing to carry
forward: **the system must be willing to return nothing.** Only the mechanism for deciding
"nothing" changed — from a numeric floor to the model's own selection.

---

## 4. Phases

### Phase 0 — Stop the bleeding (→ PR 3) ✅ DONE (PR #500, merged 19 Aug 2026)
**No migration. No new dependencies. One small PR against `ai-router`. Independently
valuable — ships real improvement before any embedding work exists.**

1. ✅ **Fix the dishonest fallback.** When the KB search returns nothing, inject **no**
   knowledge-base block at all, rather than 15 arbitrary clauses under "answer ONLY from
   this content".
   **Amended 14 Aug 2026 — dropping the block is not sufficient on its own.** The
   "Answer ONLY from this content" instruction must become *conditional on the block
   existing*. As originally written, Phase 0 removes the content but leaves the instruction
   pointing at content that is no longer there — self-contradictory, and it pushes the model
   toward answering a regulatory question from general training knowledge with no citation
   and no caveat. Replace it, in the no-block case, with an instruction that says the
   knowledge base does not cover this and that the answer is general guidance to be verified
   against the instrument itself. This also satisfies the standing organisational rule that
   AI output on regulatory interpretation is draft only.
2. ✅ **Set `kb_miss = true`** on the `complybot_response_logs` row whenever compliance-mode
   retrieval returns nothing. The column already exists. This gives immediate visibility
   into how often retrieval fails, and becomes the data source for Phase 3's Gaps tab.
   **Amended 14 Aug 2026:** also add a `retrieval_strategy text` column and set it on every
   row. Phase 0 sets `kb_miss` under the *old, broken* retrieval, where it will be true on
   very nearly every question; Phase 2 sets it under the new retrieval, where it means
   something real. Without a marker distinguishing the two, Phase 3's Gaps tab cannot tell a
   genuine content hole from legacy noise, and filtering by `created_at` alone is fragile
   across deploys and rollbacks.
3. ~~**Add clause-number detection**~~ — **REMOVED 14 Aug 2026. Do not build this.** Under
   the revised §3 mechanism the model reads the real clause identifiers from the directory
   and asks for them by name, so no regex exists to maintain. Building it in Phase 0 would
   mean building something Phase 2 immediately deletes. Items 1 and 2 stand alone and remain
   independently worth shipping first.

   *(If — and only if — the revised mechanism is abandoned and the embedding plan revived,
   the regex spec is: normalise the reference (strip "Standard"/"clause", collapse
   whitespace, uppercase letter suffixes); exact-match `clause_number`; prefix-match so
   `1.2` also returns `1.2b`; add patterns for `Schedule N` and `Section N`; expand range
   rows so `1-6` is found by a query for clause 3; and fall through to normal search
   whenever the pattern does not resolve to exactly one tight cluster. Recorded here so the
   live-data findings in §3 are not lost.)*

### Phase 1 — DEFERRED, not deleted (revised 14 Aug 2026) — no PR in current segmentation, see §4A
**No migration. No edge function. Nothing to build in this phase today.**

The embedding/fingerprint store is **not required** at the current KB size (§3). It is
deferred behind the tool boundary rather than abandoned, and becomes the implementation of
`lookup_clauses`/`search_articles` *without any change above that boundary* if the KB
outgrows the prompt.

**Revisit this phase when any of these becomes true:**
- The legislation KB exceeds roughly **300 rows**, or the directory exceeds roughly
  **4,000 tokens** (measure, don't estimate — the query in §1 gives the exact figure).
- Phase 4's eval harness shows the model is failing to *select* the right clause from the
  directory, and better clause titles have already been tried and did not fix it.
- Long-form prose content (practice guides, whole PDFs) is added to the KB — that content
  genuinely needs chunking and vectors, which is precisely why Vivacity's `srto_corpus`
  does (§6B).

**When revived, the original design below is sound and should be used as written** — it was
never wrong, only unnecessary at 54 rows. Two corrections to fold in at that time, both
found during this review:

- **Store the composed text as a real column, not only its hash.** The original spec named
  `embedding_source_hash` and "a `pg_trgm` GIN index" without stating what is indexed. A
  composition spanning the seven ARRAY columns listed in §1 cannot be usefully
  trigram-indexed unless it is materialised. Add `embedding_source_text text` (or a stored
  generated column), index *that* with GIN, hash *that* for change detection, and embed
  *that* — one composition, produced by **one shared function** used by both the embed job
  and the search path. Two copies of the composition logic is exactly the drift mechanism
  that already broke `navigationIndex.ts` (#10).
- **The search path must tolerate `embedding IS NULL`.** Between the migration landing and
  the first embed run completing, every row is unembedded. Skip the semantic tier for those
  rows rather than erroring or excluding them, or the deploy breaks on arrival.

<details>
<summary><strong>Original Phase 1 design (deferred — implement only per the trigger conditions above)</strong></summary>

- Migration adds to **both** `legislation_knowledge_base` and
  `complybot_knowledge_articles`: `embedding vector(1536)`, `embedding_source_hash text`,
  `embedded_at timestamptz`. Plus a vector index and a `pg_trgm` GIN index.
  The `embedding_source_hash` is how we detect an edited row needs re-embedding without
  regenerating everything.
- New edge function `complybot-embed-kb`: finds rows whose hash doesn't match their current
  composed text, sends them to OpenAI's embedding endpoint, writes fingerprints back.
  54 + 11 rows costs a fraction of a cent.
- **What gets embedded:** not the raw legal text alone. A composed blob per clause of
  clause number + title + plain-English intent + what the law requires + evidence
  requirements. That composite resembles how an RTO actually phrases a question; dense
  legal wording alone retrieves poorly.
- **No chunking.** Each clause is already a self-contained, appropriately-sized unit.
  Chunking 54 short records would degrade retrieval.
- Triggers: a button in the Training page, automatic on KB row save by a super admin, and a
  weekly `pg_cron` safety net.

</details>

**Independently confirmed:** Vivacity's `ask_viv_corpus_ingestion_state` table implements
the same incremental-re-embed idea (per-source high-water mark + `content_hash` unique
index, polled by `pg_cron` every 30 minutes rather than a per-row trigger — their code
comment explains that polling "tolerates a failed run without any per-row bookkeeping").
If this phase is revived, copy that shape.

### Phase 2 — Tool-use retrieval + `ai-router` rewrite (REVISED 14 Aug 2026) (→ PR 5) ✅ DONE (PR #523, merged 19 Aug 2026)
**No migration. No RPC. No embedding call. One rewrite of `ai-router`, properly modularised.**

1. **Build the directory.** Generate the clause directory (number + title, ~700 tokens) at
   request time from `legislation_knowledge_base`, cached — not hand-maintained. It must be
   *derived*, never a copy, or it drifts exactly as `navigationIndex.ts` did (#10).
2. **Define the tools.** `lookup_clauses(clause_numbers: string[])` for Compliance mode; the
   how-to-article equivalent for Help mode, per #3's mode split. Tool *descriptions* matter
   as much as the schema — see §6B for the standard Vivacity's tool descriptions set.
3. **Run the tool loop** with a hard iteration cap (§6A). On the final iteration, force a
   text-only response so a loop that never converges still answers the user.
4. **Inject only what the tool returned.** Nothing retrieved → no knowledge-base block, and
   the conditional instruction from Phase 0 item 1. `kb_miss = true`,
   `retrieval_strategy` set accordingly.
5. **Extract into modules.** `ai-router/index.ts` is 1,038 lines against a 500-line limit
   and is already on the `AGENTS.md` do-not-copy list. Retrieval, tool definitions, tool
   dispatch, and response validation each become their own module alongside the existing
   `navigationIndex.ts` and `attachments.ts` — with **co-located `_test.ts` files**. This is
   the structure Vivacity arrived at (§6B: a 1,881-line entry point supported by ~30 shared
   modules, many with tests) and their own audit log calls the first tested edge function
   "a pattern worth repeating."
6. **Apply every cross-cutting requirement in §6A** — kill switch, iteration cap,
   tool-errors-as-tool-results, prompt caching, terminology guard. These are not optional
   polish; they are the difference between this and the version that has to be rolled back.

**Added cost per question:** one extra model round trip (~1–2s). No embedding call, no
second vendor in the request path, no OpenAI dependency. With prompt caching the directory
is close to free after the first call.

**No longer in this phase:** `rpc_search_legislation_kb`, the blended score, the relevance
floor, the clause-number regex, and the OpenAI embedding call — all superseded by §3.

### Phase 3 — Make the Training page actually train (→ PR 7)
**Frontend plus one small function. Useless before Phase 2 — `kb_miss` would flag on
virtually every question today.**

- **New "Gaps" tab** listing `kb_miss = true` questions plus every thumbs-down, grouped so
  repeated variations of the same question appear as one row with a count. This is the
  authoring queue, ranked by how often real users hit each hole.
- ✅ ~~**Diagnose and fix the Feedback tab.**~~ **DONE in PR #435.** This is no longer
  Phase 3 work. PR #435 gap-filled `complybot_feedback`, removed the feedback billing gate,
  restored super-admin visibility via permissive policies, and added own-row update
  protection. Phase 3 should consume the feedback data that accumulates after this fix; it
  should not re-diagnose the original RLS defects.
- **"Promote to KB" action** on any gap row — opens the KB editor pre-filled with the
  failed question. Save → the clause immediately appears in the next request's directory →
  next person asking gets a grounded answer. This is the loop closing.
  *(Revised 14 Aug 2026: under §3 there is no fingerprint to regenerate. The directory is
  derived per request, so a newly-saved clause is live immediately — strictly simpler than
  the original embedding-regeneration step.)*
- **Added 14 Aug 2026 — per-clause quality telemetry, not just per-question.** Vivacity's
  `ai_drafting_by_clause` RPC and `v_ai_finding_draft_outcomes` view (§6B) break AI quality
  down *by clause* — acceptance rate, rejection rate, average edit distance, low-confidence
  share — which tells you *which KB content is weak*, not merely which questions failed.
  The ComplyHub equivalent: group thumbs-down and `kb_miss` by the clause the model
  selected. A clause that is retrieved often but rated badly is an authoring problem; a
  question that retrieves nothing is a coverage problem. The Gaps tab should distinguish
  these two, because they go to different people.

### Phase 4 — Prove it works, then tune (→ PR 8)
- Populate `ai_eval_query_sets` (2 rows today) with ~30-50 real questions drawn from the
  301 response logs, each tagged with the clause that *should* be retrieved.
- A script that runs the set and reports retrieval accuracy. Run before and after each
  change — without it, tuning is guesswork.
- **Revised 14 Aug 2026 — what Phase 4 now measures and tunes.** There are no blend weights
  and no floor to tune. The levers are instead:
  1. **Selection accuracy** — did the model ask for the right clause given the directory?
     This is directly checkable against the tagged eval set, and is the headline metric.
  2. **Directory richness** — number + title only (~700 tokens) versus number + title +
     plain-English intent (~3,700 tokens). Test both; use the cheaper one unless the data
     justifies the larger.
  3. **Clause titles themselves** — the most likely fix for a selection miss, and Angela's
     work rather than an engineering change.
  4. **Model choice** — see #7 as revised. Sonnet is the starting point for the agentic
     path; Phase 4 is where a Haiku fallback for simple navigation questions gets tested.
  5. Only if the numbers justify it — AI query rewriting for vague questions.

### Sequencing (added 14 Aug 2026)

PR #435 completed the first early item. ✅ **PR #500 (merged 19 Aug 2026) completed Order 3 / PR 3**
(Phase 0 items 1+2 — honest KB-miss fallback + `kb_miss`/`retrieval_strategy` columns), migration
applied to production and ledger-repaired. Order 2 / PR 2 (#11) remains **on hold** per Brian's
19 Aug 2026 call. ✅ **PR #523 (merged 19 Aug 2026) completed Order 4 / PR 5** (Phase 2's main
`ai-router` rewrite) — deployed to production, shipped dark behind the `complybot_tool_retrieval`
feature flag, enabled only for the Vivacity Testing Tenant for live testing. The next AI should
continue at **Order 5** (Phase 3, then Phase 4), or PR 6 (terminology/banned-term guard +
citation-quote verification), unless Brian chooses to run #9's cap work (PR 4) in the other
worktree first or in parallel.

| Order | Work | Why it goes first | DB job? |
|---|---|---|---|
| 1 | ✅ **`complybot_feedback` RLS fix** (#4 + #5) | **Done in PR #435.** Gap-filled the missing table, removed the feedback billing gate, fixed super-admin read visibility, and added own-row update protection | Done |
| 2 | **ON HOLD 19 Aug 2026 — Route-permission / sidebar fix** (#11) | Re-verified 19 Aug 2026: original description was partly stale — see #11's correction block. Real live bug is missing `/auditor/*` routes for Regulatory Officer, not a guard-blocking issue. Brian's call: not being actioned right now. Still a prerequisite for #10 if #10 is ever picked up | No (→ PR 2, on hold) |
| 3 | ✅ **Phase 0** (items 1 and 2 only) — **done, PR #500 merged 19 Aug 2026** | Independently valuable, no dependencies, ships honest failure behaviour immediately | No (→ PR 3) |
| 4 | ✅ **Phase 2 — DONE, PR #523 merged 19 Aug 2026** | The main rewrite | No (→ PR 5, complete) |
| 5 | **Phase 3, then Phase 4** | Phase 3 needs Phase 2 live; Phase 4 needs something to measure | Phase 3 only (→ PR 7, then PR 8) |

Runs in parallel, independent of the above: **#6's cleanup PR** (dead tables, orphaned
frontend, dead layouts/sidebars, `complybot-learning-logger`) (→ PR 9) and **#10's navigation
index regeneration** (→ PR 2B, added to §4A below) — the latter gated on item 2 above.

### §4A — PR segmentation (added 14 Aug 2026, by request — supersedes strict one-item-per-PR)

Brian asked for the remaining work to be segmented into PR-sized chunks sized by what actually
hangs together, not rigidly one plan-item per PR. This replaces no locked decision above — it is
purely a delivery-sequencing layer on top of them. Every phase and every numbered open item above now cross-references its PR number inline; PR 2B was added here for #10's navigation-index regeneration, which the first pass at this table had omitted.

| PR | Contents | Size | Depends on | Parallelizable? |
|---|---|---|---|---|
| **1** | ✅ `complybot_feedback` RLS fix (#4+#5) — **done in PR #435** | Small — 1 migration | none | Complete |
| **2** | #11 route-permission/sidebar fix — **ON HOLD 19 Aug 2026, see #11's correction block; scope has changed (real bug is missing Auditor routes, not the originally-described 3 bugs)** | Small — frontend only, no DB | none | Yes — frontend-only |
| **2B** | #10 navigation index regeneration + CI drift check (union of the 3 live sidebar configs vs. `navigationIndex.ts`) | Small — frontend generation + CI check, no DB | PR 2 (hard prerequisite) | Yes — frontend-only, once PR 2 lands |
| **3** | ✅ Phase 0 items 1+2 — `ai-router` honest fallback + `kb_miss`/`retrieval_strategy` column — **done, PR #500 merged 19 Aug 2026, migration applied to prod + ledger repaired** | Small — 1 migration + `ai-router` edit | none functionally, sequenced after PR 2 per §4 unless Brian chooses to run this DB slot earlier | No — small DB job |
| **4** | #9 trial usage cap — settings rows + composite index + `ai-router` quota check + UI banner/block | Medium — 1 migration + `ai-router` + widget UI | Angela's cap number (locked: 20/16) | Yes — designed to run in the other worktree in parallel with PR 5 |
| **5** | ✅ **DONE, PR #523 merged 19 Aug 2026.** Phase 2 core rewrite — directory generation, `lookup_clauses`/article tools, tool loop, module extraction, plus the safety-critical §6A items that can't ship without it (feature-flag kill switch, iteration cap, tool-errors-as-results, prompt caching) | Large — the main rewrite | PR 3 (fallback behaviour it builds on) | Complete |
| **6** | Terminology/banned-term guard + citation-quote verification (§6A items 5+6) | Medium — separable, own test file | PR 5 (operates on its output) | Could ship right after PR 5, or fold in if small enough once scoped |
| **7** | Phase 3 — Gaps tab, Promote-to-KB, per-clause telemetry | Medium — frontend + small function | PR 5 live | No |
| **8** | Phase 4 — eval harness + tagged question set | Small — script + data | PR 7 (or at least PR 5) live | No |
| **9** | #6+#8 cleanup — dead tables, orphaned frontend/layouts/sidebars, `complybot-learning-logger` | Medium — pure removal | none functionally | Yes — can run anytime in parallel |

**Parallel lanes across the two worktrees:** PR 4 and PR 9 have no dependency on PR 5 and can run
alongside it in the other worktree once the relevant shared database slot is clear. PR #435
has cleared the feedback-RLS slot; the next database contenders are PR 4 (#9 cap) and PR 3
(Phase 0 `retrieval_strategy`), while PR 2 remains the next sequenced frontend-only task.

**Status as of 14 Aug 2026:** ✅ PR #435 / PR 1 is merged to `main`. Continue with PR 2
(#11 route-permission/sidebar fix). Before #11 is picked up, verify whether `AppRoutes.tsx`
wraps the caveated Regulatory Officer "Auditor" routes in `RoleRouteGuard`; that check was
explicitly out of scope for the pass that found them, so it is unconfirmed rather than
confirmed-broken.

---

## 5. Open items — work one at a time, lock each into this file

| # | Item | Status |
|---|---|---|
| 1 | Embedding provider and model | **SUPERSEDED 14 Aug** — no embeddings at current KB size; tool-use over a directory (§3). Original decision stands *if* Phase 1 is ever revived |
| 2 | Exact blend weights for the three retrieval signals, and the relevance floor value | **SUPERSEDED 14 Aug** — no blend, no floor. Model selection replaces both |
| 3 | Do legislation clauses and how-to articles share one search call, or stay two separate calls? | **LOCKED** — stay separate, matching existing mode split |
| 4 | Should super admins see feedback across all tenants in the Training page? | ✅ **DONE in PR #435** — yes, fixed to match existing working precedent |
| 5 | Root cause of `complybot_feedback` being empty | ✅ **DONE in PR #435** — confirmed RLS blockers fixed: missing table/policies were gap-filled, billing gate removed for feedback inserts, super-admin read policy corrected, own-row update guard added. Remaining follow-up is observation only: if feedback stays empty after live use, investigate engagement/UI prompting rather than reopening the original RLS bug |
| 6 | Retire the four dead ComplyBot tables and orphaned legacy code | **LOCKED** — yes, separate sequenced cleanup PR |
| 7 | Model tiering for compliance-mode answers | **RE-LOCKED 14 Aug (reversed)** — Sonnet for the agentic tool-use path, per Brian |
| 8 | Fate of `complybot-learning-logger` | **LOCKED** — retire, bundled into #6's cleanup |
| 9 | Usage cap for trial tenants on ComplyBot calls — no cap exists today, for anyone | **LOCKED, revised 14 Aug** — Compliance mode only, Help mode unlimited; per-trial (not calendar-month) boundary; **20 questions per 14-day trial, soft warning at 16 (80%)**; ships as its own PR |
| 10 | Navigation index coverage gap (Help mode click-path guidance) | **LOCKED (revised)** — regenerate from 3 live sidebar configs, not `roleNavigation.ts`. **Blocked on #11**; generate in CI, don't copy once |
| 11 | Possible drift between `roleNavigation.ts` route-permission gating and the actual live sidebar configs | **RESOLVED — 3 confirmed bugs found.** Own small PR, but **no longer parked**: hard prerequisite for #10, sequenced 2nd (§4) |
| 12 | Cross-cutting engineering requirements (kill switch, iteration cap, tool-error handling, prompt caching, terminology guard) | **LOCKED 14 Aug** — see §6A, lifted from Vivacity's shipped implementation |

---

## 6. Locked decisions

### #1 — Embedding provider and model: OpenAI `text-embedding-3-small` (1536 dims)
**Locked 14 Aug 2026. SUPERSEDED the same day — see the banner below before implementing.**

> **⛔ SUPERSEDED 14 Aug 2026. Do not implement as part of Phases 0–4.**
>
> No embeddings are generated at the current KB size. Measured live: clause number + title
> across all 54 rows is **2,643 characters (~700 tokens)**; the *entire* KB including full
> legal text is **44,706 characters (~11,800 tokens)** against a 200,000-token context
> window. Vector search solves a scale problem this KB does not have. Retrieval is instead
> agentic tool-use over a directory (§3).
>
> **What survives:** the reasoning below remains correct and this decision is re-adopted
> unchanged *if* Phase 1 is ever revived under its stated trigger conditions — `OPENAI_API_KEY`
> is already live, embeddings are a fixed cheap conversion rather than a reasoning step, and
> the smallest tier is adequate for short well-scoped documents. **Independently confirmed:**
> Vivacity's `srto_corpus` and `ask_viv_corpus` both use `text-embedding-3-small` at 1536
> dims (§6B), so this is the house standard, not a guess.
>
> **What is now wrong:** the closing sentence "no chat-model call is ever used for
> retrieval — only for the final answer" is reversed. Under §3 the model *does* choose what
> to retrieve, which is the entire point. The token-efficiency principle it was defending is
> better served by prompt caching a ~700-token directory than by adding a second vendor to
> the request path.

**Decision:** Use OpenAI's `text-embedding-3-small` to generate the vector fingerprints
for both `legislation_knowledge_base` and `complybot_knowledge_articles`. Do not
introduce a second embedding vendor (e.g. Voyage) at this stage.

**Why:**
- `OPENAI_API_KEY` is already live and in production use across 11 edge functions — zero
  new provisioning, no new secret, no new vendor relationship.
- Embeddings are not a reasoning/generation step — they're a fixed, cheap conversion of
  text to a vector. There is no "smarter model does better retrieval" tradeoff the way
  there is for a chat model; the smallest OpenAI tier is adequate for short, well-scoped
  documents like these 54 clauses and 11 articles.
- Cost is negligible: fingerprinting the current KB (65 rows total) costs a fraction of a
  cent, one-off (re-run only when a row's text changes, per the `embedding_source_hash`
  mechanism in Phase 1). Per-question cost is one small embedding call, roughly a
  hundredth of a cent — unavoidable regardless of provider.
- Matches the standing token-efficiency principle for this whole project: a cheap,
  narrow-purpose model does the lookup; the expensive answer-writing model (Haiku today)
  is reserved for generation, not for scanning the KB itself. Do not use a chat model to
  "read and pick the relevant clause" — that is what embeddings + the RPC scoring in
  Phase 2 exist to avoid.
- Voyage (Anthropic's recommended embedding partner, arguably stronger on legal/technical
  text) was considered and deferred — it would require a new vendor key, and any quality
  gain over OpenAI can't be justified as measurable until Phase 4's eval harness exists.
  Revisit only if Phase 4 numbers show retrieval accuracy is the bottleneck and vendor
  swap is the fix, not blend-weight tuning.

**How to apply:** Phase 1's `complybot-embed-kb` edge function calls OpenAI's embeddings
endpoint with `text-embedding-3-small`, storing 1536-dimension vectors. Phase 2's
`ai-router` rewrite embeds each incoming user question the same way before calling
`rpc_search_legislation_kb`. No chat-model call (Haiku, Sonnet, or otherwise) is ever used
for retrieval — only for the final answer once context has been assembled.

### #5 — Root cause of `complybot_feedback` being empty: RLS blockers fixed ✅ (done in PR #435)
**Locked 14 Aug 2026. Completed by PR #435.**

**Finding:** `complybot_feedback` has four RLS policies. Two matter for INSERT as an
authenticated user:
- `fb_billing_gate` (PERMISSIVE, `cmd = ALL`) — requires
  `sec.tenant_is_active(caller's active_tenant_id)` to be true. `tenant_is_active` checks
  `billing_subscriptions.billing_state IN ('trial_active','active','past_due')`, OR a
  diamond/manual-billing tenant, OR an invoice-paid tenant with `paid_through_date` in the
  future.
- `fb_user_insert` (**RESTRICTIVE**, `cmd = INSERT`) — requires `user_id = auth.uid()` and
  `tenant_id = caller's active_tenant_id`.

Because `fb_billing_gate` is `ALL` with no explicit `WITH CHECK`, Postgres uses its
`USING` expression as the check for INSERT too. Since `fb_user_insert` is RESTRICTIVE, both
must pass. Net effect: **any tenant without an active billing record cannot insert
feedback, full stop, and the failure is silent** — the frontend (`useComplyBotFeedback.ts`
→ `EnhancedComplyBotWidget.tsx`) only sees a generic error and shows "Could not save
feedback — please try again," with no distinction from any other insert failure.

**Verified against live data:** grouping the 301 rows in `complybot_response_logs` by
tenant and checking each against the three billing-active conditions — at least 6 tenants
(≈20 of the 301 logged conversations) fail all three, meaning every feedback click from
those tenants was silently discarded. This is a **confirmed, reproducible bug**, not
speculation.

**What it does NOT fully explain:** the highest-volume tenant (145 of 301 conversations)
and most others **do** pass the billing check, yet feedback is still zero across the
board. So a second factor is real and currently unmeasurable: genuine non-engagement
(users simply not clicking the thumbs) is indistinguishable from any other silent failure
mode, because there is no client-side error telemetry differentiating "never clicked" from
"clicked, insert failed for an unlogged reason."

**Why the gate exists at all:** appears to be a copy-paste of the standard tenant-data
billing gate pattern used elsewhere, applied to a table where it doesn't obviously belong
— feedback about bot quality has no real dependency on billing status, and arguably
trial/demo tenants are exactly the accounts whose feedback is most valuable pre-conversion.

**Applied in PR #435:** migration
`20260814020103_fix_complybot_feedback_rls.sql` gap-filled the uncaptured
`public.complybot_feedback` table before touching policies, removed `fb_billing_gate`,
recreated the missing/uncaptured insert ownership guard, and made the policy operations
idempotent for branch DBs and production retry. This item is closed.

**Observation follow-up only:** after PR #435 has been live long enough for real thumb
ratings, re-check the row count. If it remains near-zero, treat that as likely
non-engagement or weak in-UI prompting; do not assume the original billing-gate RLS bug is
still open without fresh evidence.

### #9 — Usage cap for trial tenants: per-trial compliance-mode quota, Help mode unlimited (→ PR 4)
**Originally locked 14 Aug 2026 as a monthly quota covering both modes. REVISED and
RE-LOCKED the same day** after Brian confirmed: (a) cap Compliance mode only, Help mode
stays unlimited; (b) ships as its own PR, separate from Phase 2, sequenced into the
multi-PR/two-worktree segmentation described in "How to apply" below.

**Current locked shape:**
- **Compliance mode only is capped.** Help mode (navigation/click-path guidance) is not
  capped by this mechanism at all — no soft warning, no hard block. Rationale confirmed with
  Brian: the point of a trial is to give a real taste of the product while creating a
  reason to convert. Blocking navigation help stops a trial tenant from learning the product
  at all, which damages activation before conversion is even on the table. Compliance
  answers are the differentiated, costed value — that's where a ceiling belongs.
- **Boundary is per-trial, not per-calendar-month.** Live data check (14 Aug 2026): 86 of 88
  tenants have `trial_length_days = 14` (one at 30, one at 60); 7 tenants are mid-trial
  right now. A calendar-month reset is the wrong boundary for a 14-day trial — it either
  never resets (trial sits inside one month) or hands the tenant double the cap for free
  (trial straddles two months), purely depending on signup date, with no relationship to
  product usage. The cap counts from `tenants.trial_started_at` to
  `tenants.billing_trial_ends_at` (or the equivalent pair once the 15-column trial sprawl
  noted below is reconciled), once per trial, not reset monthly.
- **Ships as its own PR**, separate from Phase 2's retrieval rewrite. It has no functional
  dependency on retrieval, is blocked on a number only Angela can supply, and bundling it
  would force Phase 2's review to cover retrieval, refactor, *and* commercial gating at
  once.

**Cap value — LOCKED 14 Aug 2026 by Brian: 20 Compliance-mode questions per 14-day trial.**
Brian's stated range was 15–20; the top of the range was chosen deliberately, on the
reasoning that the value lives in a settings row (not a code constant — see "Amended" note
below), so it carries zero deploy risk to start generous and lower it later if real
post-launch trial usage data says otherwise. **Soft warning at 80% = 16 questions used**
(unchanged proposal, now locked alongside the cap).

**Anchored against real usage, checked live 14 Aug 2026 before locking this number:**
none of the 7 tenants currently `trial_active` have used Compliance mode even once — every
one of the 58 Compliance-mode calls ever logged came from a tenant already past trial
(paying or trial-expired). Among tenants who have used it at all, usage is low and lopsided:
the single most active tenant ever asked 30 Compliance-mode questions total (all-time, not
per-trial); the next-highest is 7; most are 1–4. There is no real trial-usage history to
tune against, because trial tenants have not meaningfully used Compliance mode under the
current broken retrieval — this number is a considered judgement call made ahead of the fix
shipping, not a data-fitted one, and should be revisited once real post-launch trial data
exists.

**Remaining open item:** whether trial tenants get any distinct messaging/upgrade path in
the block state, beyond "direct them toward upgrading" — a copywriting decision, not a
blocker for implementation.

**Finding that prompted this:** there is currently **no usage cap of any kind, for any
tenant, trial or paying**. `ai_usage_tracking` exists as a table (`calls_used`,
`tokens_used`, `cost_estimate` columns — clearly built for this purpose) but **nothing in
the codebase writes to it** — it's a dead table, same pattern as the ComplyBot tables from
§1. The only existing tenant-status gate is the billing check found in #5, and that's
binary (can-use-at-all), not a quota (how-many-this-month). A trial tenant that never
converts can generate unlimited Claude API calls today, and once Phase 2 ships, an
unlimited number of extra OpenAI embedding calls on top of that — pure unbounded cost with
no commercial floor under it.

**Decision:** add a per-trial Compliance-mode question quota, scoped to ComplyBot
(`ai-router`) only, applied only to tenants whose `billing_subscriptions.billing_state =
'trial_active'`. Paying, past_due, diamond-manual, and invoice-paid tenants are not capped
by this mechanism — a platform-wide AI usage cap for paying tiers is a separate, larger
pricing/product decision, out of scope here (see §7 Parked). Help mode is never capped by
this mechanism, for any tenant, trial or otherwise.

**Why `billing_state = 'trial_active'` and not one of the tenant-table trial columns:**
a live check of the schema found **15 separate trial-related columns** spread across
`tenants` and `billing_subscriptions` (`trial_ends`, `trial_expires_at`,
`trial_started_at`, `is_trial`, `billing_trial_ends_at`, `trial_length_days`,
`trial_start_date`, `trial_end_date`, `trial_consumed`, `has_had_trial`, `trial_days`,
`trial_status`, `trial_end`, plus duplicates). `billing_subscriptions.billing_state` is
used here because it's the exact field the existing `sec.tenant_is_active()` function
already trusts as "the most reliable source of truth" (its own code comment). Reusing it
keeps this feature consistent with the billing gate found in #5 rather than adding a 16th
trial signal. Confirmed live: 10 tenants currently `trial_active`, 39 `trial_expired`.

**Mechanism (no new table):** `complybot_response_logs` already has `tenant_id`,
`created_at`, and (once implemented) a mode column distinguishing Compliance from Help.
Before `ai-router` makes its Anthropic call **for a Compliance-mode request only**, run
`count(*) from complybot_response_logs where tenant_id = X and mode = 'compliance' and
created_at >= tenants.trial_started_at`. If the caller's tenant is `trial_active` and the
count is at or above the cap, return a blocked response **without making any model call** —
this is what actually stops the cost, not just a UI-level warning. Help-mode requests never
run this check at all.

**Enforcement shape:**
- Soft warning in the widget at (proposed) 80% of quota — Compliance mode only,
  informational banner, not a block. **Confirm percentage with Angela.**
- Hard block at 100% of the Compliance-mode quota — no further Compliance-mode `ai-router`
  calls succeed for that tenant until the trial ends or converts, with a message that names
  what they're losing and points toward upgrading. This is the highest-intent moment in the
  trial — the tenant has just spent up to two weeks confirming the bot answers real
  regulatory questions — so the copy matters more than the mechanism.
- Help mode: **no warning, no block, ever**, for trial tenants under this mechanism.
- Reset boundary: **once per trial** (trial start → trial end), not calendar month. If a
  trial is ever extended, the quota window extends with it rather than resetting.

**Cap value:** **not yet set — Angela's call, per-trial scope.** The original "50 questions
per calendar month" figure is void along with the boundary it was scoped to and should not
be reused as an anchor for a per-trial number — a 14-day-trial figure and a
calendar-month figure answer different questions. **Do not ship without this number
confirmed.**

**The cap value must not be a code constant.** Store it in `system_settings` (verified
live 14 Aug 2026: a key/value `jsonb` table, 14 rows, already the workspace's home for
tunable numbers) or per-tenant in `trial_config` (verified live: `tenant_id`, `max_users`,
`role_mix` — an existing per-tenant trial-limits concept, one row today) if a per-tenant
override is ever wanted for a specific prospect. Angela's number becomes a row, not a
release. Same for the 80% soft-warning threshold. **Do not add a new bespoke config table
for this** — `_zz_deprecated_ai_quota_config` (verified live: `tenant_id`,
`daily_call_limit`, `monthly_token_limit`, `hard_stop`, **0 rows**, status `deprecated`) is
exactly that: an AI quota system that was designed once, given its own table, and abandoned
with no enforcement code ever written against it. Reusing `system_settings`/`trial_config`
instead of repeating that pattern is a direct lesson from this table's existence, not a
style preference.

**The meter needs an index and should count attempts.**
`complybot_response_logs` today has separate single-column indexes on `tenant_id` and
`created_at DESC` and **no composite** (verified live). A per-request `count(*)` filtered on
both will scan more than it should as the table grows — add a composite
`(tenant_id, created_at)` index, or `(tenant_id, mode, created_at)` once the mode column
exists. Separately, if the log row is only written *after* a successful response, failed or
partially-failed calls do not count against the quota and a tenant can exceed the cap by
failing. The meter counts **attempts**, not successes — the cost-correct choice, since a
failed call still spends the Anthropic token budget this cap exists to protect.

**How to apply — segmented for the multi-PR / two-worktree split (confirmed 14 Aug 2026).**
Ships as its own PR, independent of Phase 2, so the two active worktrees can take it and the
retrieval rewrite in parallel once the feedback-RLS fix and #11 have cleared the shared
database-job slot (§4 "Sequencing"). Scope for this PR specifically:
1. Migration: `system_settings` rows for the cap value and soft-warning percentage (values
   TBD, confirm with Angela before merge — do not ship with a placeholder number), plus the
   composite index on `complybot_response_logs`.
2. `ai-router` change: the quota check, gated to Compliance mode only, added early in the
   request path — before any retrieval or model call runs, so a blocked trial tenant costs
   nothing. This is a small, self-contained addition to `ai-router` and does not require
   Phase 2's tool-use rewrite to already be in place; it can land before or after Phase 2
   with no ordering dependency, since it only inspects the caller's tenant and mode before
   the retrieval path is invoked.
3. UI: soft-warning banner and hard-block message in the ComplyBot widget, Compliance mode
   only.

Not required for this PR: anything touching Help mode, anything touching Phase 1/2's
retrieval mechanism itself.

### #2 — Blend weights and relevance floor: placeholder defaults, retune after Phase 4
**Locked 14 Aug 2026. SUPERSEDED the same day — see the banner below before implementing.**

> **⛔ SUPERSEDED 14 Aug 2026. Do not implement.**
>
> There is no blended score and no relevance floor under §3. The model's own selection from
> the directory replaces both, which removes the tuning problem entirely rather than
> deferring it to Phase 4.
>
> **Two findings from this review are recorded here so they are not lost if embeddings ever
> return — the 0.75 floor was wrong, and provably so:**
>
> 1. **Scale mismatch in the blend.** `pg_trgm similarity()` normalises over the trigram
>    union of *both* strings. A ~10-word question against a multi-paragraph composed blob
>    yields values typically under 0.1, so the 0.3-weighted term contributes ~0.03, not
>    ~0.3 — the blend is effectively semantic-only. For query-inside-document matching the
>    correct operator is `word_similarity()`/`%>`, not `similarity()`.
> 2. **The floor was above every real-world value.** `text-embedding-3-small` cosine
>    similarity for a genuinely relevant question/document pair typically lands 0.30–0.55;
>    0.75+ is near-duplicate territory. To clear a 0.75 *blended* floor the semantic term
>    alone would need roughly 0.96. Nothing would ever pass: every question would flag
>    `kb_miss`, no KB block would ever be injected, and Phase 3's Gaps tab would be built on
>    noise.
>
> **Confirmed against a live production system.** Every threshold in Vivacity's shipped RAG
> (§6B): `match_srto_chunks` declared default 0.7; `retrieve-srto-context` default 0.7;
> `draft-finding` 0.65; `search_standards` **0.5**; notes/emails/EOS/documents search
> **0.3**; `match_ask_viv_corpus` default **0.5**. Every real call site sits at 0.3–0.5, and
> the declared 0.7 defaults are quietly overridden downward wherever they are actually used.
> **If a threshold is ever needed again, start at 0.5 and calibrate against Phase 4's eval
> set — never above 0.7, and never set it from intuition.**

**Decision:** `rpc_search_legislation_kb` (Phase 2) scores candidates in two tiers, not
one flat blend:

1. **Clause-number match is an early exit, not a blended signal.** If the question
   contains a detectable clause reference (`3.2`, `Standard 1.1`, `clause 2.4`, etc. — the
   same regex added in Phase 0) and that clause exists in `legislation_knowledge_base`,
   return it directly as the sole result. Skip semantic and fuzzy scoring entirely for
   that request. This also means **skipping the embedding call** for these questions —
   the fastest, cheapest path through the whole system, and a direct application of the
   token-efficiency principle from #1 (don't spend on a model call the deterministic
   lookup already answers).
2. **Otherwise, blend two signals:**
   `score = 0.7 × semantic_similarity + 0.3 × trgm_similarity`
   - `semantic_similarity` — cosine similarity between the question's embedding and each
     clause's stored embedding (pgvector `<=>` operator).
   - `trgm_similarity` — `pg_trgm` `similarity()` between the raw question text and the
     clause's composed text (same composed blob used for embedding, per #1's "how to
     apply").
   - Semantic weighted higher because it's the primary tool doing the actual work here;
     `pg_trgm` is a backstop for exact-terminology matches that embeddings alone may not
     rank highly.
3. **Relevance floor:** candidates scoring below **0.75** on the blended score are
   excluded, not padded in. If nothing clears the floor, the function returns an empty
   set — which Phase 0's fix already knows how to handle (no knowledge-base block
   injected, `kb_miss` flagged).
4. **Result cap:** return at most **3** clauses (not 5), keeping the injected context lean
   per the same token-efficiency principle raised for #1.

**Why these specific numbers, and why they're explicitly not final:** there is no eval
data yet to justify 0.7/0.3 over, say, 0.6/0.4, or 0.75 over 0.70 as the floor.
`text-embedding-3-small` cosine similarities are known to cluster higher than intuition
suggests even for loosely-related text, which is exactly why a floor is necessary and why
it needs real tuning rather than a guess treated as final. These values are a reasonable,
defensible starting point that unblocks writing Phase 2 — **they are the first thing
Phase 4's eval harness should be used to validate or correct**, not a decision to revisit
only if something looks wrong in production.

**How to apply:** hardcode these four values as named constants at the top of
`rpc_search_legislation_kb` (or as function parameters with these defaults) so Phase 4
can adjust them without a rewrite. Apply the identical two-tier approach to the how-to
articles RPC (see #3).

### #3 — Legislation clauses and how-to articles: two separate searches, not merged
**Locked 14 Aug 2026.**

**Decision:** keep the existing mode split. `rpc_search_legislation_kb` is called only in
Compliance mode; a rewritten `rpc_search_knowledge_articles` (same hybrid
semantic + trgm + relevance-floor treatment as #2, minus clause-number matching since
articles don't have clause numbers) is called only in Help mode. No unified/merged search
across both tables.

**Why:**
- **Cost.** Always searching both tables on every question means paying for two searches
  (and, if per-table embedding calls are ever added, double the embedding cost) on every
  single question, even though most questions cleanly need only one kind of content. This
  is the same token/cost-efficiency principle applied in #1 and #2.
- **The tables don't score comparably.** Legislation clauses have a strong exact-match
  signal (clause number) that articles don't have. Forcing both into one ranked list means
  either inventing an artificial score for articles to make them comparable, or running two
  scoring paths anyway and just merging the display — extra complexity without a
  demonstrated need.
- **No evidence this is needed yet.** Cross-surfacing (a compliance question also
  returning a relevant how-to guide, or vice versa) is a plausible future improvement, not
  a confirmed gap. If Phase 4's eval work later shows real users frequently ask blended
  questions that need both in one answer, that becomes a concrete, measurable reason to
  revisit — not something to build speculatively now.

**How to apply:** Phase 2 ships two RPCs, each following the two-tier scoring shape from
#2 (clause-number early exit only applies to the legislation RPC), invoked exactly where
the existing `routeQuestion()` mode split in `ai-router` already sends Compliance vs Help
mode today.

### #4 — Cross-tenant feedback visibility for super admins: fixed ✅ (done in PR #435)
**Locked 14 Aug 2026. Completed by PR #435.**

**Decision:** super admins can read `complybot_feedback` across all tenants in the
Training page, exactly matching the behaviour that already works today on
`complybot_response_logs`.

**Finding:** `complybot_response_logs` has a working, correctly-authored
`cbl_superadmin_select` policy — **PERMISSIVE**, `qual = sec.is_super_admin()` — which is
why the Response Logs tab shows all 301 rows with no issue. `complybot_feedback`'s
equivalent, `fb_user_select`, expresses the same intent (`user_id = auth.uid() OR
sec.is_super_admin()`) but was authored **RESTRICTIVE** instead of PERMISSIVE. Because a
RESTRICTIVE policy must additionally satisfy every applicable PERMISSIVE policy, a super
admin reading this table also has to pass `fb_billing_gate` — which checks
`tenant_is_active` against **the super admin's own `active_tenant_id`**, not the tenant
whose feedback is being viewed. Super admins typically have no active tenant/billing
record of their own, so this check silently fails and blocks the read outright. This is a
**second, independent RLS authoring bug** on this table (on top of the insert-side one in
#5), and it directly confirms the suspicion already written into `FeedbackTab.tsx`'s own
warning banner.

**Relationship to the standing "super_admin cannot read tenant content" rule:** this is
not a new exception — `complybot_response_logs` already carries an accepted, working
carve-out for this exact subsystem (ComplyBot quality/diagnostics data surfaced in the
super-admin Training console), and it's functioning correctly today with no reported
issue. This decision fixes a broken copy of that same, already-approved pattern rather
than introducing a new one. Flagged here explicitly since it is an RLS change on a live
table.

**Applied in PR #435:** the migration dropped the broken `fb_user_select` shape and
created two clean PERMISSIVE policies: `fb_own_select` for `user_id = auth.uid()` and
`fb_superadmin_select` for `sec.is_super_admin()`. This item is closed; the next AI should
not rework this policy unless a new production check proves the read path is still broken.

### #6 — Retire the dead ComplyBot tables and orphaned legacy code: yes, separate cleanup (→ PR 9)
**Locked 14 Aug 2026.**

**Finding (updates the original audit):** the original audit called
`complybot_conversations`, `complybot_messages`, `complybot_prompts`,
`complybot_interactions` "dead tables" based on their 0 row counts. Re-checked here: there
IS live-looking code referencing them —
`src/hooks/useComplyBotConversations.ts`, `src/lib/complyBotService.ts`,
`src/pages/ComplyBot.tsx`, `src/pages/complybot/PromptsManagement.tsx`, and a
non-Enhanced `src/components/ComplyBot/ComplyBotWidget.tsx` (distinct from
`EnhancedComplyBotWidget.tsx`, which is the actual live one via `ComplyBotWrapper`). But
**none of these files are imported or routed anywhere in the app** — confirmed via a full
grep of `AppRoutes.tsx` and every other source file for imports of any of them. They are
orphaned: real code, zero reachability. The single live touchpoint is
`supabase/functions/seed-registers/index.ts`, which still inserts demo rows into
`complybot_messages` during tenant seeding.

**Decision:** retire all four tables plus the deprecated
`_zz_deprecated_complyhub_knowledge` vector table, and remove the orphaned frontend files
— but as a **separate, independently-sequenced PR**, not folded into Phases 0-4.

**Why separate rather than part of a phase:** it's motivated by and adjacent to this
investigation (same ComplyBot data model), so it belongs in this document rather than a
disconnected one — but it has no functional dependency on the retrieval rework itself, so
bundling it into a Phase PR would only add unrelated risk to that PR's review. Being pure
removal (no RLS, no retrieval logic), it can run in parallel with Phase 1/2's database work
without competing for the "one database job at a time" slot in the same way a schema
*addition* would — worth confirming with Brian at the time whether that still holds, since
it does involve `DROP TABLE`.

**Sequencing (order matters):**
1. Remove the orphaned frontend files (`ComplyBotWidget.tsx` non-Enhanced,
   `pages/ComplyBot.tsx`, `pages/complybot/PromptsManagement.tsx`,
   `lib/complyBotService.ts`, `hooks/useComplyBotConversations.ts`).
2. Remove the `complybot_messages` insert from `seed-registers/index.ts`.
3. Only then drop the four tables and the deprecated vector table in a migration —
   dropping first would break the still-active (if minor) seed reference from step 2.

**Scope expanded 14 Aug 2026** after #10's investigation confirmed, via a full
reachability trace, that five layout components this document had been treating as live
(because they all mount `ComplyBotWrapper`) are actually dead code with zero importers
from the real route tree: `GlobalAppShell.tsx`, `UnifiedAppShell.tsx`, `AdminLayout.tsx`,
`DashboardLayout.tsx`, `SharedShell.tsx`. Only `RootAppLayout.tsx` is genuinely wired into
`AppRoutes.tsx`. This doesn't change any conclusion already locked in this document
(`EnhancedComplyBotWidget` remains genuinely live via `RootAppLayout`), but these five
dead layouts — plus the sidebar components/configs confirmed orphaned in #10
(`RoleBasedSidebar.tsx`, `NewSidebar.tsx`, `UnifiedSidebar.tsx`, `SidebarV3.tsx` and the
`sidebar-v3/` folder, `BrandedSidebar.tsx`, `SidebarNav.tsx`,
`navigation/sidebar/RoleSidebar.tsx`, `config/sidebarConfig.ts`,
`components/nav/sidebarConfig.ts`) — belong in the same cleanup PR as the ComplyBot dead
code, since they're the same class of finding (confirmed-unreachable via the same
reachability-trace method) even though they're a different subsystem. Note: there is
already a test (`forbiddenLayouts.test.ts`) guarding against reintroducing several of
these — check it before removal so the cleanup doesn't fight an existing safeguard.

### #7 — Model choice: Sonnet for the agentic path
**Originally locked 14 Aug 2026 as "Haiku everywhere". REVERSED the same day by Brian —
Sonnet, after the architecture changed to agentic tool-use.**

> **✅ CURRENT DECISION (14 Aug 2026): use Claude Sonnet 5 (`claude-sonnet-5`) for
> ComplyBot's agentic tool-use path.** Confirm the exact model ID against the Anthropic
> docs at implementation time rather than trusting this string.
>
> **RESOLVED 19 Aug 2026 (Scout verification before PR 5):** the model ID string is **`claude-sonnet-4-6`**, not `claude-sonnet-5` as originally guessed. Confirmed by grepping the codebase: `claude-sonnet-5` appears nowhere in `rto-compass-hub`, while `claude-sonnet-4-6` is already the live house convention across 13 other edge functions (`dap-ai-draft`, `derive-assessment-tasks`, `extract-assessment-tool-fields`, `generate-tas-sections`, `governance-minutes-draft`, and others), with two older files still on the dated snapshot `claude-sonnet-4-20250514`. Brian's call: use `claude-sonnet-4-6` for Phase 2 — matches existing convention, no new model relationship to validate.
>
> **Why this reversed.** The original decision below is sound reasoning applied to a
> *different system*. It was made about a single-shot, pre-fetch-then-generate design where
> the model's only job was to write an answer from context it was handed. Under §3 the model
> now has a second, harder job: reading a directory and deciding what to retrieve. That is a
> reasoning task, and it is the task the whole architecture depends on — a wrong selection
> means a wrong answer with no other safety net. Carrying a decision across an architecture
> change unexamined is exactly the failure this document exists to prevent.
>
> **Independently confirmed:** Vivacity runs `ask-viv-assistant` — their agentic tool-use
> assistant — on Sonnet, and uses Haiku only for a cheap mechanical sub-task (conversation
> summarisation). See §6B.
>
> **Cost check.** Compliance mode is 58 of 301 logged responses since February 2026 (~2 per
> week platform-wide). At that volume the Sonnet/Haiku price difference is immaterial; the
> quality difference on the selection step is not.
>
> **Where Haiku may still earn a place — test in Phase 4, do not assume:** simple Help-mode
> navigation questions, which are single-shot whitelist matching rather than agentic
> retrieval, and are the bulk of the volume (243 of 301). A Sonnet-for-compliance /
> Haiku-for-navigation split is the natural end state, but it must be measured against the
> eval set, not adopted on the same intuition that produced the original decision.

**SUPERSEDED — original decision:** keep `claude-haiku-4-5-20251001` for every ComplyBot
mode, including compliance-mode legislation questions. Do not upgrade to a stronger model
(e.g. Sonnet 5) as part of this work.

**Data checked before deciding:** compliance-mode calls are 58 of 301 total logged
responses since February 2026 (~2 per week platform-wide) versus 243 help-mode calls —
genuinely low volume. Average compliance response length (2,318 chars) is roughly double
help-mode's (1,175 chars), consistent with legislative reasoning being the heavier task,
but volume is too low for cost to be the deciding factor either way.

**Why not tier anyway, given the cost would be small:** the diagnosed root cause of poor
compliance answers (§1 of this document) is broken **retrieval**, not insufficient model
reasoning — the model is currently compensating for being handed 15 random clauses (or
nothing useful) by falling back on its own general training knowledge. Phases 0-2 fix
that by ensuring the *correct* clause reaches the model. Once retrieval is fixed, Haiku is
answering a much easier question than it is today. Upgrading the model now, before
knowing whether a properly-grounded Haiku is already sufficient, would be spending against
a guess rather than a measured gap — exactly the "overkill model for retrieval/lookup
work" pattern flagged as a standing concern for this whole project.

**How to apply:** no code change for this item. Phase 4's eval harness is what settles
this properly — run the ~30-50 question eval set against Haiku once Phases 0-2 are live,
and only escalate compliance mode to a stronger model if that data shows genuine
inaccuracy with correct clauses already in context.

### #8 — Fate of `complybot-learning-logger`: retire, bundled into #6's cleanup
**Locked 14 Aug 2026.**

**Finding:** a full grep of `src/` for any invocation of `complybot-learning-logger`
returns zero callers. It is not merely low-usage (4 rows in `complybot_queries`) — it is
unreachable from the live app, the same class of finding as the orphaned legacy files in
#6.

**Decision:** retire the function entirely (delete the edge function directory, drop
`complybot_queries` alongside it), bundled into the same cleanup PR as #6 rather than as
a separate piece of work — same "orphaned, unreachable ComplyBot code" category.

**Why not revive or repurpose it:** its scoring helpers
(`identifyKnowledgeGaps`, `generateFollowUpQuestions`, `calculateContextRelevance`,
`calculateCitationQuality`) are naive keyword heuristics approximating exactly what this
document already builds properly elsewhere:
- Detecting a knowledge-base miss → Phase 0's `kb_miss` flag (retrieval genuinely found
  nothing) rather than `identifyKnowledgeGaps`'s guess (scanning the answer text for
  words like "unsure").
- Scoring relevance/citation quality → Phase 2's actual similarity + relevance-floor
  scoring rather than hand-rolled keyword-overlap math.
- Surfacing what's missing → Phase 3's Gaps tab, grounded in real failed queries rather
  than pattern-matched guesses.

Reviving dead code whose purpose is now served better by real mechanisms built elsewhere
in this same plan would only maintain a second, worse version of the same idea.

**How to apply:** add `supabase/functions/complybot-learning-logger/` and
`complybot_queries` to #6's removal list — same sequencing rule applies (confirm nothing
else references it before dropping; the grep already confirms no frontend caller, but
re-check for any edge-function-to-edge-function invocation before the migration ships).

### #10 — Navigation index coverage gap: regenerate from the 3 live sidebar configs (→ PR 2B)
**Locked 14 Aug 2026. Revised same day** after Brian correctly flagged that more than one
file looked like it defined the sidebar, and a scoped read-only investigation (Explore
agent) confirmed `roleNavigation.ts` was the wrong source. Original text below is struck
through in spirit — corrected version follows.

**Investigation finding (supersedes the original "derive from `roleNavigation.ts`"
plan):** a full reachability trace found that of the six layouts this whole document
had been treating as "live" (because they all mount `ComplyBotWrapper` — see §1 and #6),
**only `RootAppLayout.tsx` is actually wired into `AppRoutes.tsx`.**
`GlobalAppShell.tsx`, `UnifiedAppShell.tsx`, `AdminLayout.tsx`, `DashboardLayout.tsx`, and
`SharedShell.tsx` all have zero reachable importers from the real route tree — confirmed
dead, and reinforced by an existing test (`forbiddenLayouts.test.ts`) that fails the build
if certain deprecated layouts/sidebars are imported, meaning this was a deliberate,
tracked deprecation, not an accidental orphaning. (This doesn't change #6's conclusion —
`EnhancedComplyBotWidget` is still genuinely live, because `RootAppLayout`, the one real
layout, does mount it — but it means five additional dead layout files now belong in #6's
cleanup list; see that item's update below.)

**`roleNavigation.ts` is not the sidebar's source of truth.** It has zero importers from
the live render path. The real tenant-facing menu is assembled inside `RootAppLayout`,
branching by role/mode across **three genuinely different, non-overlapping live
configs**:
- `src/config/adminSidebarConfig.ts` — Administrator, Governing Person, Consultant,
  Consultant Assistant, and super-admin/consultant "view-as" modes
- `src/config/ssoSidebarConfig.ts` — Student Support Officer only
- `src/config/roleMenuConfigs.ts` (via `getMenuConfig`) — every other tenant role
  (Trainer, etc. — the "enhanced" default)
- `src/config/superAdminNav.ts` — true super-admin mode (separate from tenant view-as)

This split is by design, not drift — each config covers a genuinely distinct context.
`roleNavigation.ts` is not dead, but it does a different job: it contains
`routePermissions`/`canAccessRoute`, intended to decide what a role is *allowed to open*,
separate from what appears in their sidebar. **Re-verified 19 Aug 2026: this system does
not actually gate any live route today.** `RoleRouteGuard.tsx` — the component that would
enforce it — has zero importers anywhere in `src/`; it is dead code, not wired into
`AppRoutes.tsx`. Live route guarding is done instead by a separate family of components
(`AdminRoute`, `AuditorRoute`, `TenantGuard`, etc.) directly in `AppRoutes.tsx`. Of
`roleNavigation.ts`'s other consumers (`useRoleNavigation.ts`, `useRegulatorMode.ts`,
`ReadOnlyContext.tsx`), none currently act on its fallback-affected values in a way that
changes what a user sees or can do — see #11 for the full trace.

**Confirmed orphaned/dead** (in addition to the five layouts above): `roleNavigation.ts`
is NOT in this list (it's live, just for a different purpose) — but
`src/config/sidebarConfig.ts`, `src/components/nav/sidebarConfig.ts`,
`RoleBasedSidebar.tsx`, `NewSidebar.tsx`, `UnifiedSidebar.tsx`, `SidebarV3.tsx` and the
whole `sidebar-v3/` folder, `BrandedSidebar.tsx`, `SidebarNav.tsx`, and
`navigation/sidebar/RoleSidebar.tsx` (imported only by `EnhancedRegisterHub.tsx`, itself
unreachable from `AppRoutes.tsx`) all have no live import path.

> **⛔ EVERYTHING BELOW THIS LINE UNTIL THE NEXT `###` HEADING IS SUPERSEDED. DO NOT
> IMPLEMENT IT.** It is kept only as a record of how the wrong source of truth was
> identified. Its central claim — that `roleNavigation.ts` drives the sidebar and should be
> the generation source — is **false**, and the corrected plan is the numbered list above.
> Marked explicitly on 14 Aug 2026 because "struck through in spirit" is not struck through:
> a fresh chat reading this document cold could act on it in good faith.

**Original text below (superseded, kept for record):**

**Context — raised by Brian while reviewing #3.** Help mode's click-path guidance
(`supabase/functions/ai-router/navigationIndex.ts`) already exists and is architecturally
sound: `findNavigationItems` scores a question against a hand-maintained route list,
`buildRouteWhitelist` injects only those approved paths into the system prompt, and
`validateAndSanitiseResponse` strips any link the model outputs that isn't on the
whitelist, replacing it with a safe fallback. This directly guards against the
hallucinated/dead-route risk Brian was concerned about.

**Finding: the real problem is coverage, not hallucination.** `navigationIndex.ts` has
**46** hand-written entries. Tested directly against Brian's own example question —
"where do I upload assessment tools" — and confirmed the real page
(`/dashboard/registers/assessment-tools`) is **not in the index at all**. The bot would
either honestly decline or, worse, keyword-match to "Assessment Validation" (a different,
related-but-wrong page, since both share the word "assessment"). The index's own file
comment says it was "derived from `roleNavigation.ts`" — confirming this drift already
happened once before, silently, since no one is alerted when the copy falls behind.

**The fix is generation, not dictation.** `src/config/roleNavigation.ts` is the real,
live-tested config driving the actual sidebar every user sees (`RoleBasedSidebar.tsx`
reads it directly) — it has **114** path entries with label, section, and per-role
visibility already correct, and it stays accurate under its own pressure (if it drifted,
real navigation would visibly break). Brian does not need to supply routes by hand.

**Decision — process (revised):**
1. Generate a draft `navigationIndex.ts` entry for every path found across the **three
   live configs** (`adminSidebarConfig.ts`, `ssoSidebarConfig.ts`, `roleMenuConfigs.ts`),
   plus `superAdminNav.ts` for super-admin-only pages, carrying label/section/roles
   across directly. Merge duplicates where the same path appears in more than one config
   for different roles (expected — a page like Trainer Credentials may be visible to both
   Administrator-tier and default-tier roles via different configs).
2. The one genuinely missing piece per entry is still **keywords** (how a user might
   phrase the question in natural language) — draft 3-5 candidates per entry as a first
   pass.
3. Cross-check the merged set against `AppRoutes.tsx`'s full route declarations for
   anything present in neither — true orphans, flagged for Brian's judgment rather than
   auto-added, since some may be intentionally hidden internal/test routes.
4. **Brian reviews the generated diff** — spot-checking labels/sections/roles for
   correctness and sanity-checking the keyword drafts — rather than authoring entries
   from scratch.
5. Add a repeatable re-diff step (script or periodic reminder) against all three live
   configs together, not a single one-time regeneration — the same "derived from X, then
   silently drifted" failure mode that hit the original `navigationIndex.ts` could just
   as easily hit a three-source merge if nothing re-checks it later.

**How to apply:** scoped as its own small piece of work, adjacent to but independent of
Phases 0-4 (touches only `navigationIndex.ts`, no retrieval/database changes) — can
proceed in parallel with the database-bound phases. Natural pairing with Phase 3's Gaps
tab: a question that fails navigation matching is a similar signal to `kb_miss`, worth
surfacing the same way once both exist.

**⛔ Added 14 Aug 2026 — #11 is a hard prerequisite for this item.** #11 confirmed that
`/dashboard/registers/assessment-tools` — the exact page used as the worked example
throughout #3 and #10 — is visible in the Administrator sidebar but **blocked by
`RoleRouteGuard`**, along with `/industry-engagement`. Regenerating the navigation index
before fixing that would teach ComplyBot to confidently direct Administrators to pages that
reject them, which is strictly worse than today's honest decline. Fix #11 first (it is
small), or, if it must proceed in parallel, the generation step must exclude any path not
openable by the role it is being offered to — which requires resolving #11's findings
anyway.

**Added 14 Aug 2026 — generate in CI, don't copy once.** Step 5's "repeatable re-diff step
(script or periodic reminder)" is too weak. This document already identifies
"derived from X, then silently drifted" as the failure that *has already happened once* to
this exact file; a periodic reminder reproduces it. Make it a CI check that fails when the
union of paths across `adminSidebarConfig.ts`, `ssoSidebarConfig.ts`, `roleMenuConfigs.ts`
and `superAdminNav.ts` does not match `navigationIndex.ts`'s path set. Keywords stay
hand-curated and are not checked; only path coverage is enforced.

### #11 — Possible drift between `roleNavigation.ts` and the live sidebar configs (→ PR 2)
**OPEN — raised by the Explore agent's investigation, not yet resolved.**

**What's unresolved:** `roleNavigation.ts`'s 114 `routePermissions` entries (what a role
is *allowed to open*) were not cross-referenced line-by-line against what
`adminSidebarConfig.ts` + `ssoSidebarConfig.ts` + `roleMenuConfigs.ts` actually *show* a
given role in their sidebar (combined, well over 1,000 lines across three files) — the
investigating agent explicitly flagged this as out of its scope, not as "checked and
clean."

**Why this matters, distinct from #10:** if these disagree, it's a genuine
permission-vs-visibility bug — either (a) a role is permitted to open a route
(`RoleRouteGuard.tsx` lets them through) but has no sidebar link to it (a page only
reachable by typing the URL directly), or (b) a role sees a sidebar link to a page its
`routePermissions` entry actually blocks (a dead-end click). Either is a real product bug
independent of anything ComplyBot-related — this item exists in this document only
because it was surfaced while investigating #10, not because it's in scope for the RAG
work itself.

**Next step:** a follow-up diff pass, line-by-line or scripted, comparing
`roleNavigation.ts`'s `routePermissions` map against the combined route set exposed by
the three live sidebar configs, per role. Given the size (114 vs. 1,000+ lines) this is
its own scoped task, likely another Explore-agent pass rather than manual review — flag
disagreements only, since agreement is the expected/correct state and doesn't need
reporting.

**RESOLVED 14 Aug 2026** by a second scoped Explore-agent pass. Findings, in order of
severity:

**New layer discovered — `roleNavigation.ts`'s fallback is not simple allow/deny (though
the guard that would enforce it, `RoleRouteGuard.tsx`, turned out to be dead code — see
#10's correction).** `super_admin` and `Governing Person` are coded to always pass
(`roleNavigation.ts:1111-1112`, `RoleRouteGuard.tsx:35-37`). For every other role, a path
absent from `routePermissions` falls through to `isPathAllowedForRole()`
(`roleNavigation.ts:1127-1128, 699-707`), which checks a **fourth nav-truth system** —
`ADMIN_NAV`, `TRAINER_NAV`, `SSO_NAV`, `REGULATOR_NAV`, etc. (`roleNavigation.ts:257-660`),
selected via `roleNavigationConfigs`/`getNavigationForRole`
(`roleNavigation.ts:663-675, 679-683`). This means `roleNavigation.ts` contains its own
embedded fallback nav-list system, on top of `routePermissions` — see #10's correction for
why none of this is currently live.

**Investigated 14 Aug 2026, re-verified and corrected 19 Aug 2026 against `main` @
`b2a76e5e2` — the analysis below assumed `RoleRouteGuard.tsx` actually enforced
`routePermissions`/the `*_NAV` fallback against real navigation. It doesn't:
`RoleRouteGuard.tsx` has zero importers anywhere in `src/`, confirmed dead code, not wired
into `AppRoutes.tsx` at all. Re-tracing what's actually live:**

1. **Consultant/Consultant Assistant → `TRAINER_NAV` fallback is real in the code
   (`roleNavigation.ts:675-696` — neither role has an entry in `roleNavigationConfigs`,
   so `getNavigationForRole` falls back to `TRAINER_NAV`, the wrong role's page list) but
   currently inert, not an active bug.** Traced all four live consumers of this fallback:
   `RoleRouteGuard.tsx` and `src/components/navigation/sidebar/RoleSidebar.tsx` are both
   dead code; `ReadOnlyContext.tsx` is live but its real mount points (`RootAppLayout.tsx`,
   `ReadOnlyPortalWrapper.tsx`) pass an explicit `isReadOnly` override that bypasses the
   fallback-dependent logic; `useRegulatorMode.ts` is live but its only real caller
   (`RegulatorModeBadge.tsx`) never reads the fallback-affected field; `useRoleNavigation()`
   itself has zero callers at all. Nothing currently reachable from the router acts on the
   bad fallback value. Worth fixing as latent hygiene, not urgent.
2. **The two sidebar links flagged as dead ends — `/industry-engagement`
   (`adminSidebarConfig.ts:134`) and `/dashboard/registers/assessment-tools`
   (`adminSidebarConfig.ts:140`, the exact page used as the worked example in #3/#10) —
   are NOT dead ends today.** Both are genuinely absent from `routePermissions` and from
   `ADMIN_NAV`'s equivalent list, but both routes exist in `AppRoutes.tsx` and are
   reachable by every role that can see them in the sidebar — the config-file gap is real
   but currently harmless, since the guard that would have enforced it doesn't exist in
   the route tree.
3. **The real, live, user-facing bug is different and worse: most of Regulatory Officer's
   "Auditor" sidebar section (`roleMenuConfigs.ts:446-499`) points at routes that were
   never registered in `AppRoutes.tsx` at all** — `/auditor/schedule`, `/auditor/compliance`,
   `/registers`, `/evidence`, and roughly 8 more — a 404/missing-route problem, not a
   permission block. Only `/dashboard/auditor` (guarded by `AuditorRoute.tsx`) and `/risk`
   (a working redirect) in that menu actually function. Confirmed via `git log` this is not
   a work-in-progress feature — the Auditor role/menu and its guard date back to the app's
   first commit (`e18dcafa5`, 7 Oct 2025); it has been broken, unnoticed, for over 10
   months.

**One checked candidate correctly ruled out as a false positive:** Trainer's missing
sidebar link to `/dashboard/registers/tcr` (Trainer Credentials) has a legitimate
explanation — a separate self-service equivalent exists at
`/dashboard/trainer-portal/profile`.

**Disposition:** real, independent product bugs, unrelated to the RAG/ComplyBot work this
document exists for — surfaced only as a side effect of #10's investigation. **On hold —
not being actioned right now (Brian's call, 19 Aug 2026).** If picked up later: (1) the
missing `/auditor/*` routes are the actual priority — register the missing routes or
remove/relabel the dead menu items in `roleMenuConfigs.ts`'s auditor section; (2) close the
Consultant/Consultant Assistant `TRAINER_NAV` fallback as hygiene; (3) no fix needed for the
two sidebar links, they already work.

---

## 6A. Cross-cutting engineering requirements
**Locked 14 Aug 2026 (open item #12).** These apply to Phase 2 and to anything else that
calls a model. They are not optional polish — most of them are the difference between a
rollout that can be corrected and one that has to be reverted under pressure. Each is either
a gap this review found in the plan, or a pattern lifted from Vivacity's shipped
implementation (§6B).

**1. Master kill switch plus rollout rings — REVISED 14 Aug 2026: use existing infrastructure,
not Vivacity's shape.** A flag that disables the new retrieval path and falls back to the
previous behaviour, ring-able from one tenant to all — **with no deploy required to advance
or reverse**. Phase 2 replaces the retrieval path wholesale on a live product; without this,
the only way back is an emergency PR.

**Verified live 14 Aug 2026: ComplyHub already has a feature-flag system, in production use
(`feature_flags`, 86 rows, `feature_flag_audit_events` giving a change audit trail
Vivacity's version lacks).** Two live keys today: `feature_governance_portal` (23 tenants,
`status = active`) and `require_training_product_id_on_tas` (63 tenants, `status = draft`) —
one row per tenant per flag, with `is_enabled`, `default_value`, `status`, `environment`,
`admin_only` columns plus owner/purpose/retirement-plan governance fields. **Do not build
Vivacity's `app_settings` boolean-column shape — register a new flag,
`complybot_tool_retrieval` (matching the live `feature_*` naming), instead of adding
bespoke columns.**

**Two things to verify before relying on this** (schema was checked, not the read-path
code): whether `default_value` is actually honoured when a tenant has no row (determines
whether rollout means inserting opt-in or opt-out rows), and whether a service-role read
helper already exists for edge functions, or `ai-router` needs to query the table directly.
**Hard rule regardless of either answer: if the flag read fails for any reason, fall through
to the old retrieval path — never fail toward the new, unproven one.**

**2. Hard iteration cap on the tool loop.** Vivacity uses `MAX_TOOL_ITERATIONS = 6`. An
agentic loop without a ceiling is unbounded spend and unbounded latency on a single request.
On the final iteration, re-call the model **with tools removed** so it is forced to produce
a text answer rather than terminating with nothing — Vivacity does exactly this. Also handle
`stop_reason === "max_tokens"` explicitly; a silently truncated answer to a compliance
question is worse than an error.

**3. Tool failures return a `tool_result`, never throw.** When `lookup_clauses` fails —
database error, timeout, malformed clause id — return `{ error: "..." }` as the tool result
so the model sees the failure and can tell the user honestly. Throwing turns a recoverable
degradation into a 500. This is the general form of the "what happens when retrieval fails"
gap raised in this review, and Vivacity's `search_standards` already implements it.

**4. Prompt caching on the directory.** The clause directory is static between KB edits,
which makes it a perfect cache target — a cached read is a fraction of the cost of a fresh
one, and the directory is sent on every single request. **Vivacity does not do this** — a
grep for `cache_control` in `ask-viv-assistant/index.ts` returns nothing — so this is a win
available to ComplyHub that the reference implementation is leaving on the table, not a
pattern to copy from it.

**5. Terminology and banned-term guard on model output.** Vivacity runs every AI draft
through `phrase-filter.ts` and `response-validator-v2.ts` (449 lines, with a 573-line test
file), which block terms including **"board"** and **"directors"** — enforcing the
organisational rule that the correct terms are *governance* and *governing persons* — plus
"AI" self-reference, and an overlong-verbatim-quote guard capped at 30 words. **Confirm
whether ComplyBot has any equivalent; this review did not verify it and suspects it does
not.** For a compliance product this is a credibility issue, not a nicety: a bot that tells
an RTO to "take this to the board" is visibly wrong to the customer in their own domain
language. Note the 30-word quote cap also serves the standing rule against reproducing
Standards text verbatim beyond short quotes.

**Failure handling — LOCKED 14 Aug 2026 (Brian's call, differs from Vivacity's).** Vivacity
retries once, then fails the response if a banned term persists. **ComplyHub's guard instead:
retry once with an explicit correction instruction → if the banned term still appears, run a
deterministic word-boundary find-and-replace ("board" → "governing persons", "directors" →
"governing persons") rather than refusing to answer.** Reasoning: the filter enforces a
terminology preference, not a safety boundary — refusing a real compliance answer over a word
choice is a worse user-facing outcome than a mechanical substitution the user never sees as
an error. Vivacity's context tolerates a hard fail because a rejected internal draft just
means an auditor re-clicks "generate"; ComplyBot's failure is visible to a paying customer
waiting on an answer. **Log every substitution** — a term needing repeated correction is a
system-prompt tuning signal, not just a filter success, and should feed the same
Phase 3/§4-item-6 per-clause quality telemetry.

**Implementation trap, confirmed by inspection, not yet by a live grep:** a naive substring
match on `board` will false-positive on **dashboard** and **onboarding** — both words
ComplyBot will use constantly, "dashboard" especially, since it's a core navigation term in
Help mode. **Must use word-boundary matching (`\bboard\b`, case-insensitive)**, with an
explicit allowlist path for a legitimate exact-title quote from a regulator document if one
ever contains the word. Ship this pass with its own `_test.ts` covering the
dashboard/onboarding cases explicitly — it is the single most unit-testable piece in this
entire plan.

**Pipeline order:** existing route sanitiser (`validateAndSanitiseResponse`) → terminology
filter → `complybot_response_logs` write. Log the **final**, post-filter text — what appears
in the Training page's Response Logs tab must be exactly what the user saw, not the
pre-filter draft.

**6. Citation/quote verification.** Vivacity's `analyse-evidence` verifies that any quoted
excerpt of 12+ characters appears verbatim (normalised) in the source document, and strips
quotes that do not. ComplyBot already has the same idea for links —
`validateAndSanitiseResponse` strips any route not on the whitelist. Extend that principle
to clause quotations: if the model quotes legislative text, it must match the retrieved
clause text or be stripped.

**7. Modules with co-located tests.** Retrieval, tool definitions, tool dispatch and
response validation each become their own module under a `_shared/`-style folder with a
companion `_test.ts`. This is how Vivacity keeps a 1,881-line entry point maintainable
(~30 extracted modules, many tested), and their own audit log records the first tested edge
function as "a pattern worth repeating." It is also the only credible answer to
`ai-router/index.ts` being 1,038 lines against a 500-line limit and on the `AGENTS.md`
do-not-copy list.

**8. Security posture — do not inherit Vivacity's.** Any new function or RPC needs
`SET search_path = public` to pass the CI guard, and execute granted to **`service_role`
only**. Vivacity grants `match_srto_chunks` and `match_ask_viv_corpus` to `authenticated`,
which is safe *for them* because Unicorn is an internal-staff-only application. ComplyHub is
customer-facing and multi-tenant; the same grant would let any logged-in user query the KB
directly. `legislation_knowledge_base` and `complybot_knowledge_articles` are both global
(no `tenant_id`, RLS enabled — verified live 14 Aug 2026), so there is no tenant-scoping
requirement, but there is an exposure one.

**9. No hardcoded service URLs.** Vivacity's `pg_cron` migration hardcodes the full project
URL (`https://<project-ref>.supabase.co/functions/v1/...`) directly in the scheduled SQL.
That is a straight violation of ComplyHub's standing never-hardcode-service-URLs-or-
credentials convention. If any scheduled job is ever added here, the URL comes from
configuration.

---

## 6B. Reference implementation — Vivacity's "Ask Viv" (`unicorn-cms-f09c59e5`)
**Read 14 Aug 2026, repo pulled to `main` @ `333a2a7d`.** Vivacity has already shipped a
production RAG assistant twice over. It is the single most useful input to this plan and the
reason §3 changed. This section records what was learned so a fresh chat does not need to
re-read that repo.

**Note it is a different codebase with different constraints** — internal-staff-only, Lovable
AI Gateway, Gemini for drafting. Take the patterns, not the plumbing.

### What it is

`ask-viv-assistant` is a **fully agentic tool-use RAG**. Its own header comment states the
design choice explicitly: *"using real tool-use (agentic) retrieval instead of a
pre-fetch-then-generate model: Claude decides for itself when to look up a client, pull
facts, or search."* It exposes 13 tools and runs on Sonnet with `MAX_TOOL_ITERATIONS = 6`.

**This matters because pre-fetch-then-generate is exactly what ComplyBot does today.**
Vivacity started where ComplyBot is and deliberately moved away from it. This plan is not
inventing an architecture; it is adopting one already validated in-house on the same domain.

### The key structural insight

Unicorn keeps **tool-use on top and embeddings underneath**. `search_standards` is a tool
the model *chooses to call*; its implementation happens to be a vector search over
`srto_corpus`. The two layers are independent.

That is why "directory versus embeddings" was a false choice, and why Phase 1 is deferred
behind a tool boundary rather than deleted. Unicorn needs vectors underneath because
`srto_corpus` is chunked PDFs — ~800-token chunks with 150-token overlap, running to
thousands of rows. ComplyHub's KB is 54 curated rows totalling ~11,800 tokens. Same outer
shape, simpler inner implementation, identical seam.

### Files worth reading, if reading the repo again

| Path | What it shows |
|---|---|
| `supabase/functions/ask-viv-assistant/index.ts` | Tool definitions, the tool loop, iteration cap, forced text-only final turn |
| `supabase/migrations/20260803040606_ask_viv_assistant_foundation.sql` | Vector table, HNSW index, search RPC, usage table, kill-switch/ring columns, conversation summarisation columns |
| `supabase/migrations/20260803051036_ask_viv_corpus_ingestion.sql` | Incremental re-embed via high-water mark + `pg_cron`; also the hardcoded-URL anti-pattern |
| `supabase/functions/_shared/ask-viv-prompts/` | `phrase-filter.ts`, `response-validator-v2.ts`, `intentClassifier.ts` — output guards, with tests |
| `docs/kb/reference/ai-audit-stack.md` | Their own reference doc: corpus schema, per-function pipelines, model table, and a candid open-questions list |

### Patterns adopted into this plan

All nine items in §6A, plus: Sonnet for the agentic path (#7), the settings-row cap value
(#9), per-clause quality telemetry (Phase 3), and the incremental re-embed shape (Phase 1,
if revived).

### Deliberately not adopted

| Their choice | Why not here |
|---|---|
| Lovable AI Gateway | ComplyHub calls Anthropic directly. Their gateway is *why* they are on Gemini for drafting at all — it does not route Anthropic models. Not a constraint here |
| Gemini 2.5 Pro for drafting | Consequence of the above, not an independent model judgement |
| `grant execute ... to authenticated` on search RPCs | Safe for an internal-staff-only app; unsafe for customer-facing multi-tenant. See §6A item 8 |
| Hardcoded project URL in cron SQL | Violates ComplyHub convention. See §6A item 9 |
| No prompt caching | A gap in theirs, not a pattern. See §6A item 4 |
| Hardcoded per-user daily caps (`draft-finding` 40, `analyse-evidence` 30) | They flag this as an open question in their own docs. #9 uses a settings row instead |

---

## 7. Parked (out of scope for this work)

- `ai-router` exceeding the 500-line limit generally — only the retrieval-logic extraction
  in Phase 2 is in scope.
- `complybot-meeting-insights` using OpenAI while the rest of ComplyBot uses Anthropic.
- The broader Lovable-era migration ledger drift.
- Growing the legislation KB beyond 54 entries — an authoring throughput question for
  Angela, not an engineering one, though Phase 3's Gaps tab is what should drive it.
- **Trial-column sprawl** — confirmed 14 Aug 2026 while locking #9: 15 separate
  trial-related columns exist across `tenants` and `billing_subscriptions`
  (`trial_ends`, `trial_expires_at`, `trial_started_at`, `is_trial`,
  `billing_trial_ends_at`, `trial_length_days`, `trial_start_date`, `trial_end_date`,
  `trial_consumed`, `has_had_trial`, `trial_days`, `trial_status`, `trial_end`, plus
  duplicates). This is concrete evidence supporting a broader ComplyHub rework, not just
  a ComplyBot one — but it's a platform-wide data-model consolidation project in its own
  right, not something to absorb into this document. Raised here as a flag for a future,
  separately-scoped piece of work.
- **Platform-wide AI usage capping for paying tiers** (as opposed to the trial-only cap
  locked in #9) — a pricing/packaging decision, not an engineering one, out of scope here.
- **`ai_usage_tracking` table** — dead, unused, same as the other dead tables in #6. Not
  resurrected by #9's mechanism (which reuses `complybot_response_logs` instead); whether
  to build it out properly for broader AI cost observability is a separate decision.
- **Route-permission vs. sidebar-visibility bugs found while resolving #11** — three
  confirmed, independent product bugs unrelated to ComplyBot: Consultant/Consultant
  Assistant silently defaulting to Trainer's fallback nav permissions
  (`roleNavigation.ts:679,683`); two confirmed dead-end sidebar links
  (`/industry-engagement`, `/dashboard/registers/assessment-tools`) for
  Administrator/Consultant/Consultant Assistant; and a conditionally-confirmed cluster
  (Regulatory Officer's entire Auditor section, pending verification of whether those
  routes are actually guarded in `AppRoutes.tsx`). Recommended fix shape is written into
  #11 above. This is real, worth fixing, but it's a `RoleRouteGuard`/permissions bug, not
  a RAG or ComplyBot-training-directory issue — track and fix as its own small PR.
  **PROMOTED OUT OF PARKED 14 Aug 2026:** still its own small PR, but no longer optional or
  deferrable — it is a hard prerequisite for #10 and is sequenced as item 2 in §4
  "Sequencing". Reason: `/dashboard/registers/assessment-tools` is the worked example #10
  exists to fix, and it is currently guard-blocked.
- **Conversation memory for ComplyBot** — the bot is stateless today; every question starts
  cold. Vivacity's `ask_viv_conversations` carries `context_summary` and
  `context_summary_covers_turns`, folding the earliest turns into a Haiku-generated summary
  once a threshold is crossed so long conversations don't grow unboundedly. Genuinely
  valuable and a natural fit once tool-use lands (a follow-up like "and what evidence do I
  need for that one?" is unanswerable without it), but it is a distinct feature with its own
  data model, cost profile and RLS surface — not something to absorb into the retrieval
  rework. Raised 14 Aug 2026 while reading §6B.
- **Embedding-backed retrieval** — not abandoned, deferred behind the tool boundary with
  explicit revival triggers. See Phase 1 as revised; do not re-litigate it here.
