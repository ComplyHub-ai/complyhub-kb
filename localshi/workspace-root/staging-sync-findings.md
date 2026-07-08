# Staging → Main sync — findings (rto-compass-hub)

> Working notes for the `feat/staging-sync` branch-catchup pass started 06 Jul 2026.
> Source: fresh `/audit-branch-drift` + full-pass triage subagent, re-verified against `origin/main` HEAD `915218af2` (post PR #116) and `origin/staging` HEAD `26fb758f8`.
> Purpose: so this doesn't need to be re-derived from the triage agent every time — update this file as each item gets reviewed/ported/excluded.

**PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/124** — opened 06 Jul 2026, `feat/staging-sync` → `main`, 7 commits. Preview build confirmed green before opening.

**✅ MERGED AND FULLY DEPLOYED (06 Jul 2026):**
- Merge commit `fa91ef0a059b5df5d7cbfc02bbf86f443ad319e2` on `main`
- Remote + local `feat/staging-sync` branch deleted
- Vercel production deploy `dpl_A4TSZDc3J7gTfBgjk8VbrZ4xViSo` confirmed `READY`, matches merge commit SHA
- Both migrations applied to production and verified live:
  - `fix_qualification_context_unit_aqf_level` (recorded as version `20260706043712`) — confirmed `rpc_build_qualification_context` contains the `product_type = 'qualification'` guard
  - `fix_learner_profile_pack_aqf_blocker` (recorded as version `20260706043811`) — confirmed `rpc_generate_learner_profile_pack` contains the `v_qual_context_exists` check

**Staging-sync Phase 1 is complete.** Next: Phase 2 (reset `staging` to mirror `main`) — needs its own mandatory pre-reset drift scan first, per the standard workflow, since staging has kept moving throughout this whole effort (confirmed: MCP feature, and separately the unrelated `feat/complybot-conversation-history` branch collision found along the way — see "Pre-Phase-2 sanity check" section above).

---

## ⚠️ Pre-Phase-2 sanity check (06 Jul 2026, later same day)

Before resetting `staging` to mirror `main`, Brian asked to double-check nothing was missed. Two things surfaced:

1. **"Added MCP agent integration" — genuine new staging feature, not yet ported.** Landed on `origin/staging` on 5 Jul 23:43 UTC — *after* the original triage snapshot (`26fb758f8`), so it wasn't missed, it's just new. A Lovable-native MCP server scaffold: `supabase/functions/mcp/index.ts`, `src/lib/mcp/` (two starter tools — `echo`, `app_info`), wired via a `vite.config.ts` plugin (`@lovable.dev/mcp-js`) and a new `package.json` dependency.

   **Investigated in full (06 Jul, later same day):**
   - No database migration needed — the feature touches zero tables. (The `complybot_conversations` reference found via `types.ts` regeneration in this same commit is unrelated — see item 2 below.)
   - No `types.ts` regeneration needed for the same reason.
   - `src/lib/mcp/*.ts` confirmed standalone — nothing else in the app imports these files.
   - `supabase/functions/mcp/index.ts` is self-contained (Deno resolves its own `npm:` imports at deploy time) — doesn't depend on the Vite plugin to function once deployed.
   - Staging's `bun.lock` should NOT be copied over — this repo uses `npm` (`package-lock.json`), not `bun`; the new `@lovable.dev/mcp-js` dependency (confirmed real, v0.20.0 on npm) needs adding via `npm install` instead.

   **Decision (Brian, 06 Jul) — DONE, ported:**
   - **Endpoint left with no authentication** (`verify_jwt = false` in `config.toml`, matching the manifest's stated `"auth": {"type": "none"}`), since both tools are genuinely harmless read-only demo tools (echo text back; return a static description) with no tenant data involved, and 7 other functions in this codebase already use `verify_jwt = false` for similar low-risk cases. **Flagged to revisit next session** — not a final security sign-off, just a "fine for now."
   - **Auto-rebuild Vite plugin (`mcpPlugin()`) excluded** — Brian's call: since it's an unverified Lovable-specific build step that could break every Vercel deploy if it depends on something only Lovable's own hosting provides, it's left out. The deployed edge function is instead **hand-maintained** — a README in `supabase/functions/mcp/README.md` documents this explicitly, so future edits to `src/lib/mcp/*` need a manual matching edit to the edge function bundle.
   - **What was ported:** `src/lib/mcp/index.ts` + `src/lib/mcp/tools/{echo,app-info}.ts` (unchanged from staging, confirmed standalone — nothing else imports them), `supabase/functions/mcp/index.ts` (the pre-generated Deno bundle, taken as-is since it's self-contained and doesn't need the plugin to run), `.lovable/mcp/manifest.json` (inert static JSON, kept for documentation parity), `@lovable.dev/mcp-js@^0.20.0` added via `npm install` (proper `package-lock.json` update — did **not** copy over staging's `bun.lock`, this repo uses npm), registered in `supabase/config.toml` with `verify_jwt = false`.
   - Type-check and lint: clean.
   - **Commit on `feat/staging-sync`:** `dee04a4ad87cf8a21a593f306d0138df4ef4e7ec` — `feat: add ComplyHub MCP server (echo, app_info starter tools)`
   - **`feat/staging-sync` now has 8 commits ahead of `main`:** `4e86084f6` → `78c87e660` → `856a0d851` → `c491169d8` → `b538f63` → `32fff213e` → `dee04a4ad` (this MCP feature).
   - **Vercel preview build CONFIRMED GREEN** (06 Jul 2026) — pushed the branch, deployment `dpl_B8FpCLTjuXAVFETp32YaWkjPap8g` went `READY` with no errors. This is real evidence, not an assumption, that skipping the Lovable auto-rebuild Vite plugin was the right call — the MCP feature builds cleanly in the Vercel/npm pipeline without it. Preview URL: `complyhub-rto-git-feat-staging-sync-complyhub.vercel.app`.

2. **NOT a staging issue — a separate, unrelated branch collision found by accident.** While tracing a stray `complybot_conversations` table reference (surfaced via a regenerated `types.ts` in the MCP commit, not an actual staging migration), found `feat/complybot-conversation-history` — a real, in-progress branch by Angela (via Cursor, committed same day, not yet merged to main) that rebuilds Conversation History with feedback + response-log linking. This directly conflicts with the "remove Conversation History" change already ported onto `feat/staging-sync` (from commit `c491169d8`, itself following staging's "Removed Conversation History" commit). **Decision (Brian, 06 Jul):** leave as-is — the Lovable-side removal was likely an unfinished mid-work step Angela picked back up properly in Cursor; the two branches will be reconciled against each other later, as their own separate PR-review step, after Phase 2. No action taken on `feat/staging-sync` for this.

**Implication:** the `origin/staging` vs `origin/main` diff this whole effort has been built on does NOT catch collisions with other open feature branches (there are ~15+ other `feat/*`/`fix/*` branches in the remote). This one was found by luck, not by process. Worth a broader sweep of open branches before Phase 2 if thoroughness matters more than speed here — not yet done.

---

## ⚠️ Pre-Phase-2 drift scan round 2 (06 Jul 2026, later same day) — new items found, not yet ported

Re-ran the mandatory pre-reset drift scan fresh (per the branch-catchup skill, not reusing the round-1 audit above, since staging kept moving). Found two more items not covered anywhere above:

1. **`complybot-trending` edge function — confirmed live, currently-broken production bug, fix identified but NOT yet ported.** Checked the real production schema directly: `v_cb_trending_prompts` has no `route` column (`tenant_id, routed_mode, prompt, uses, avg_kb_hit_rate, last_used` only), and `complybot_suggestion_candidates` doesn't exist in production at all. Main's current code queries both anyway (`.eq('route', route)` against the view, and a `.from('complybot_suggestion_candidates')` query), so every real call to this function throws and falls back to an empty/500 response. It's not dead code — actively called from `EnhancedComplyBotWidget.tsx`. Staging's fix (commits `76921bbc1`, `c0bc3f6a3`/`5ec8a8604` window, `eb67df23b`, `5fada15d7`, `867befc6a`, `6776043c9`, all dated 06 Jul 00:22–01:57 UTC) removes both broken queries and returns `200` + `fallback: true` instead of a `500`. **Decision (Brian, 06 Jul):** don't port in isolation — classify this together with the ~15+ other open `feat/*`/`fix/*` branches sweep (implication note above), since one of those branches may already contain a fix/PR for this same function. Check it as part of that broader sweep, not as a standalone staging-sync port.

2. **"Fixed credential insert errors" (`5ec8a8604`) — confirmed NOT portable standalone, revisit alongside the deferred credential-type overhaul.** This commit patches a bug (`qualification_code` NOT NULL violation for codeless higher_ed/licence/teaching credentials) inside the larger credential-type categorisation feature (`resolvedCredentialType`, `vet`/`higher_ed`/`licence`/`teaching` categories) that only exists on staging — confirmed via grep that `resolvedCredentialType` and the higher_ed/licence/teaching category logic are absent from main entirely. This is the same overhaul already flagged as deferred under item #1 (TAE40110) above ("the bundled `ingest-trainer-credentials` credential-type/category overhaul — needs its own DB check-constraint review before porting"). DB check now done: confirmed `trainer_matrix_credentials.qualification_code` **is `NOT NULL` with no default** in production — so the bug this commit fixes is real, and if the overhaul is ever ported without this fix, inserting a higher_ed/licence/teaching credential will fail. **Action needed:** when the credential-type/category overhaul is eventually scheduled and reviewed, this insert-error fix (`5ec8a8604`) must be folded in as part of that same piece of work — flagging here so it isn't dropped a second time.

**✅ Item 1 (`complybot-trending`) — DONE, ported 06 Jul 2026.** Branch `fix/complybot-trending-broken-queries`, commit `3de9ccc2d`, PR #125, merged to `main` at `80e18dae0`, Vercel production deploy `dpl_HRWrxst3Fy57GJz6mbifr1vLP4ib` confirmed `READY`. Same PR also fixed a related Cursor-flagged bug in `AIToolReviewInsights.tsx` (false "AI insights generated" toast on empty/failed AI responses) — see below.

**Bonus fix in the same PR — `AIToolReviewInsights.tsx` false-success toast (flagged by Cursor on a prior PR review).** Cursor's literal claim (code never checks `ok`, so an `{ ok: false }` response is silently treated as success) doesn't reproduce as described — `callEdge` throws on any non-2xx response, and every error path in `ai-tool-review-insights/index.ts` uses a non-2xx status, so `ok: false` can never actually reach the success branch today. But the adjacent case Cursor also raised is real: a `200 ok: true` response with zero insights fell through to the same static fallback list as an outright failure, and still showed `"AI insights generated"` — a genuine false-success case. Fixed by explicitly checking `data?.ok === true && insights.length`, and showing `"AI unavailable — showing structured suggestions instead"` for both the empty-response and thrown-error cases (previously the catch block showed no toast at all, so real failures were silent).

---

## Pre-Phase-2 drift scan round 3 (06 Jul 2026) — post-#4-merge double-check, one more gap found

After PR #125 merged, re-ran the full pre-reset drift scan from scratch (not assuming #4 was the last word) — confirmed `complybot-trending` and `AIToolReviewInsights.tsx` are now genuinely superseded on main (remaining diff is pure formatting noise), and re-verified every other staging-newer/main-missing file traces back to an already-documented decision (`complyPrompts.ts`, the AQF-builder files, the two migrations, `ingest-trainer-credentials`, `.lovable/plan.md`, `bun.lock`, the `html/*` Lovable-hosting build snapshot, `vite.config.ts`'s `mcpPlugin()`, `useCreateConsultingOrg.ts`).

**One genuine, previously-unreviewed gap found:** `src/components/tas/builder-sandbox/LearnersPanel.tsx` — staging adds a small read-only "AQF Level" badge on the Learner Intelligence Pack panel for standalone-unit builds, sourced from `qualification_context.aqf_level` (the same field the `useUnitAqfLevel` hook from the earlier AQF fix, `856a0d851`, already reads/writes). Never mentioned anywhere in this document before now — missed in every prior review pass.

**✅ DONE, ported 06 Jul 2026.** Branch `feat/learners-panel-aqf-badge`. Ported with one deliberate change from staging's version: staging fetched `qualification_context` directly via `supabase.from()` inside the component body (banned per `CLAUDE.md` — data fetching belongs in hooks). Reused the existing `useUnitAqfLevel` hook instead (already used by `ElectivesSection.tsx` for the same table/column) rather than adding a raw query or a duplicate hook. Added `productType` prop to `LearnersPanelProps`, wired it at the call site in `src/pages/tas/builder-sandbox/index.tsx` using the same `(builderState.currentTAS as any)?.product_type` cast pattern already used for `CohortIntegrityPhasePanel` in the same file. Type-check and lint clean.

---

## NEEDS-MANUAL-REVIEW bucket — final decisions and porting (06 Jul 2026, same day as deep dive)

All 6 items reviewed with Brian. Decisions and what was actually ported, on `feat/staging-sync`:

| # | Item | Decision | What was ported |
|---|---|---|---|
| 1 | TAE40110 credential fix | Not yet ported — pending its own pass | Deferred (needs its own scoped work; the `ingest-trainer-credentials` bundle needs a DB constraint check first) |
| 2 | Remove Compliance Overview page | **Port the removal** — confirmed intentional (isolated, self-contained commit, distinctly titled, not swept up in unrelated visual-edit work) | Deleted `src/pages/admin/ComplianceOverview.tsx`; removed route from `AppRoutes.tsx` and `routes/admin.tsx`; removed sidebar quick-access entry in `adminSidebarConfig.ts` |
| 3 | TGA live units helper | **Port** | New hook `src/hooks/useTgaQualificationUnitsLive.ts` (using `callEdge` instead of staging's raw `supabase.functions.invoke`, per house rules) + wiring into `src/pages/tas/engine/index.tsx` (live-units-preferred-over-DB-fallback logic, loading/error states, gates the "Continue to Configure" button while live fetch is in flight) |
| 4 | AQF Level Builder UI | **Skip** — superseded by the fix already on this branch (`856a0d851`); reintroduces the same bad code-guessing heuristic | Not ported. The one salvageable piece (Learner Profile Pack blocker softening) also not yet done — separate follow-up |
| 5 | AI chat / ComplyBot UI cluster | **Port all of it** (Angela confirmed all ComplyBot changes must be ported) | See full breakdown below |
| 6 | "Fixed all TypeScript errors" | **Port with 2 exclusions** | See full breakdown below |

Type-check (`npx tsc --incremental --noEmit`) clean across every file. ESLint clean on every changed file (including several **pre-existing** lint violations in files touched for other reasons — `Math.random()` → `secureId()` in `CompactComplyBotChat.tsx`, two empty `catch {}` blocks and a `setState`-in-effect in `tas/engine/index.tsx`, a `setState`-in-effect in `RiskRegister.tsx`, plus several pre-existing `exhaustive-deps`/`react-refresh` warnings suppressed with the codebase's established `eslint-disable-next-line` convention — fixed because the pre-commit hook lints whole files with zero warning tolerance, not just changed lines, but otherwise unrelated to this sync).

**Commit on `feat/staging-sync`:** `c491169d870125aab8dd991333fa2c514f2b1ecb`
**Commit message:** `feat: port Compliance Overview removal, TGA live units, ComplyBot cluster, and TS-error bug fixes from staging`
**`feat/staging-sync` now has 5 commits ahead of `main`:** `4e86084f6` (7 safe ports) → `78c87e660` (4 bug fixes) → `856a0d851` (deep-dive fixes: AQF level, 2 AI narrative generators, TGA unitgrid fetch) → `c491169d8` (Compliance Overview removal, TGA live units, ComplyBot cluster, TS-error fixes) → `b538f63` (added the compliance-overview redirect to the live route tree `AppRoutes.tsx`, since staging's own redirect fix landed only in the dead `routes/admin.tsx` file).

### #5 — ComplyBot cluster, full port detail

- `src/pages/admin/ComplyBot.tsx` — layout changed from 3-equal-columns to chat-expanded-on-top + signals-row-below; chat height changed from fixed `h-[750px]`/`h-[600px]` to `flex flex-col min-h-[500px] lg:min-h-0`; Conversation History panel removed (approved by Angela — it's a ComplyBot change).
- `src/components/ComplianceIntelligence/index.ts` — removed the now-dead `ConversationHistoryPanel` export (nothing else imports it; the component file itself was left in place, matching staging's own scope).
- `src/components/ComplianceIntelligence/CompactComplyBotChat.tsx` — swapped Radix `ScrollArea` for a plain scrollable `div` (staging's fix for a scroll bug); added the AI disclaimer text below the send button; **also fixed a pre-existing `Math.random()` session-ID generator to use `secureId()`** since the file was already being touched and the codebase bans `Math.random()` for IDs.
- `src/components/ComplyBot/EnhancedComplyBotWidget.tsx` — added the same AI disclaimer text.
- `supabase/functions/ai-router/index.ts` — replaced the two separate "Compliance Answer" / "ComplyHub Help" prompt templates with one unified prompt that answers both question types without ever refusing one in favour of the other; changed the default routing mode from "help" to "compliance" (compliance mode now handles both); removed a now-redundant "HELP MODE REMINDER" block from the help-mode context (the unified prompt already covers it).
- **Skipped:** the 89-file "TAS Quality Engine" → "TAS Builder" mechanical rename (confirmed pure find-replace, no logic — not part of "ComplyBot changes", a separate naming decision for another day) and `src/config/complyPrompts.ts` (confirmed via repo-wide grep that nothing imports its exports — porting it would just create an unused duplicate of the `ai-router.ts` prompt logic).

### #6 — TypeScript-errors commit, full port detail

Ported (27 files total, minus 2 exclusions):
- Type-only casts (`as unknown as X` instead of bare `as X`, or `as never` for Supabase upsert payloads) in: `TrialExpiredScreen.tsx` (also fixed the visual style→Tailwind swap, verified inert), `MeetingMinutesUploadModal.tsx`, `QiSubmissionsTable.tsx`, `EvidenceIndexPanel.tsx`, `useConsultantCommissionSummary.ts`, `useConsultantPortfolio.ts`, `useConsultantReferralPipeline.ts` (+ added the missing `commission_rate?: number` field it needed), `useSendConsultantTrialInvite.ts`, `useUpdateConsultantOrgProfile.ts`, one hunk of `MarketJustificationPhasePanel.tsx` (the `ai_source_count` cast — NOT the `consultations` hunk, see exclusion below).
- **Real, live bug fixes** ported: `QiStatusBadge.tsx` (3 of 5 statuses had no styling — now all 5 render properly); `mcn/index.tsx` (an invalid `success` badge variant that silently rendered unstyled → changed to `outline`); `RiskRegister.tsx`, `TrainerMatrixEngine.tsx`, `quality-indicators/index.tsx` (all three had an `EmptyState` `action` prop that doesn't match the component's real `ctaLabel`/`onCta` props — their "Add Risk" / "Add Trainer" / "Start QI Collection" buttons were invisible; now fixed); `carryoverActionsFetch.ts` (sort could silently break — `NaN` — when `carryover_count` was null, now defaults to 0); `QiAcerSurveysTab.tsx` / `QiRapidSurveyTab.tsx` / `QiSubmissionsTable.tsx` / `ResponsesTable.tsx` (all wired `ExcludeRespondentModal` and `QiResponseStatusBadge` with props those components don't actually accept); `SuperAdminAffiliateHub.tsx` (import paths used wrong casing — `superadmin` vs `SuperAdmin` — would fail on a case-sensitive Linux/Vercel build; component was unreferenced/dead until now anyway); `importRegisterCsv.ts` (dynamic table-name insert needed a type assertion — used a `Database`-typed cast instead of staging's banned `(supabase.from as any)`); `useGovernanceReportReadiness.ts`, `tas/builder-sandbox/index.tsx` (casts); `tas/engine/index.tsx` (added a missing `FileText` icon import — was already used at the render site, a real missing-import bug); `types/qi.ts` (new `QiSurveyLink` interface, purely additive).
- `QiRegisterDetail.tsx` — ported as a stopgap (`rtoName=""`) exactly as staging did. **Follow-up needed:** this silences the type gap but doesn't source a real RTO name, so survey emails sent from these tabs currently show a blank RTO name — not fixed here, flagged for its own follow-up.
- **Excluded (confirmed harmful):** `useCreateConsultingOrg.ts` — staging's fix renames a field to `tenant_name`, which is not a real column on the `tenants` table (confirmed against `src/integrations/supabase/types.ts`); porting it would break creating a new consulting organisation.
- **Excluded (superseded):** the `consultations` hunk in `MarketJustificationPhasePanel.tsx` — this exact bug (undeclared `consultations` variable, live save-crash) was already fixed better on this branch in commit `78c87e660`, sourcing from live linked-records data rather than a stale snapshot.

### Follow-ups filed (06 Jul 2026) — now done

1. **Item #1 (TAE40110) — DONE.** Ported the credential-gating fix: new `src/lib/credentials/taeQualifications.ts` helper (`isTaeFullQualification()`, backed by the existing `TAE_CERTIV_QUALIFICATIONS` constant which already included TAE40110); `useFullTrainerMatrix.ts` and `useTrainerEvidence.ts` now recognise TAE40110 alongside TAE40116/TAE40122 for 1A classification, supervision rights, validation rights, and auto train/assess assessment (deliberately left `can_deliver_tae` as TAE40122-only — a superseded Cert IV alone still can't deliver TAE units per policy); label/comment updates in `credentialTypeConfig.ts` and `trainer-matrix-engine.ts`; one-line AI prompt update in `analyze-trainer-evidence/index.ts`. **Still deferred:** the bundled `ingest-trainer-credentials` credential-type/category overhaul — needs its own DB check-constraint review before porting, kept out of scope here.
2. **Item #4 remnant — DONE.** New migration `20260706110000_fix_learner_profile_pack_aqf_blocker.sql` — `rpc_generate_learner_profile_pack` now blocks on "no `qualification_context` row exists yet" (captured via `FOUND` right after the lookup) instead of "`aqf_level` happens to be null", so a standalone-unit build with a context row but no AQF level chosen isn't stopped from generating a Learner Profile Pack.
3. **QiRegisterDetail.tsx — DONE.** Now sources the real tenant name via `useTenant().tenantName` instead of the `rtoName=""` stopgap, so ACER/rapid survey emails carry the actual RTO name.
4. **#5's "TAS Quality Engine" → "TAS Builder" rename:** still deferred — confirmed safe, separable, purely mechanical 89-file find-replace if the team wants consistent naming later — a naming decision, not a bug fix, left for Carl/Brian to schedule separately.

Type-check and lint clean on all files above.

**Commit on `feat/staging-sync`:** `32fff213e5cb02bb8e158752422203d6dface1da`
**`feat/staging-sync` now has 7 commits ahead of `main`:** `4e86084f6` → `78c87e660` → `856a0d851` → `c491169d8` → `b538f63` (redirect fix) → `32fff213e` (this round: TAE40110, Learner Profile Pack blocker, blank RTO name).

---

## Deep dive (06 Jul 2026) — standalone units, the AI dispatcher, and the reset-row commit

Brian asked for a thorough, independent re-check of three items rather than taking anyone's word (including RJ's) at face value. Findings below.

### #3 — Standalone-unit TAS builds: RJ was half-right, but not for the reason staging assumed

**RJ's claim:** main's handling of standalone-unit builds (a TAS for a single unit of competency, not a whole qualification) is wrong, and staging's version is the correct one.

**What we actually found, tracing the real code path on main (not staging):**

- The premise staging's fix was built on — "main hard-requires a `qual_code`, which standalone units don't have" — is **false**. Standalone-unit builds get a `qual_code` too, it's just populated with the *unit's* code (e.g. `BSBWHS411`) instead of a qualification code. Nothing skips or blocks for lack of it.
- But there IS a real, still-open bug, just a different one than staging thought it was fixing: the database function that sets up a TAS build's "qualification context" (`rpc_build_qualification_context`) was written assuming its input is always a real qualification code shaped like `HLT57715`. It tries to work out the AQF level by reading the digit in the 4th character of that code. For a unit code like `BSBWHS411`, the 4th character is "W", not a digit — so the AQF level comes back blank. For other unit codes it could coincidentally land on a real digit and silently produce a **wrong** AQF level instead of an obvious error.
- Nothing about this throws an error or blocks the user. It fails silently — the record is created, it just quietly contains the wrong information (a unit code where a qualification code should be, and usually no AQF level). Every downstream AI-generated document (market research pack, industry themes, strategic justification) that depends on "the qualification code" ends up working off the wrong subject, producing content that's off-topic or nonsensical rather than throwing a visible error.
- There is also no way anywhere in the current interface for a user to manually confirm or fix the AQF level of a standalone unit if the automatic guess is wrong or blank — no such control exists on main today.
- **Verdict:** staging's diagnosis of the problem ("no qualification context gets created for standalone units") was wrong — a context record does get created. But the instinct that "this needs separate handling for standalone units" was correct, just for a different underlying reason. Staging's proposed fix (a dedicated database function for units, plus a screen for confirming the AQF level) is a reasonable way to fix the *real* problem — it just wasn't solving the problem it thought it was solving, so it can't be ported as-is; it would need to be re-built against the actual root cause.
- **What still needs a human, not more code reading:** whether any real client's unit codes have coincidentally produced a wrong (not just blank) AQF level in production, and whether the resulting AI-generated content is genuinely confusing to a user or just harmless filler — both need someone to actually look at real data / a generated document, not something we can determine by reading code.
- **This is a real bug, but separate from the 4 already fixed** — not fixed yet, needs its own scoped piece of work (fix the AQF-level lookup for unit codes, decide whether to add a manual override control).

### #4 — How to redo the AI task dispatcher, and a bigger discovery underneath it

**What the excluded commit (`8936a3000`) actually contained:** it wasn't just the one broken AI feature we already fixed (AI Tool Review Insights). It bundled **three** separate AI-writing helpers into one dispatcher bolted onto the already-oversized chatbot file:
1. Writing the "Market Need & Strategic Justification" narrative (used by the "Generate AI Strategy" button in the Market Justification section of the TAS builder)
2. Writing the "Cohort Profile & Integrity" narrative (used by the similar AI button in the LLN/cohort section)
3. Reviewing assessment tools and giving improvement suggestions (the one we already fixed)

**The bigger discovery:** while tracing why staging felt the need to build these, we confirmed that **items 1 and 2 above are, right now, also completely non-functional on main** — in exactly the same silent way as the assessment-tool one was. The chatbot function's real response never contains the specific fields these two "Generate AI Strategy" buttons are looking for, so every single time a user clicks either button, it silently falls back to a generic template — never real AI-written content — regardless of whether the underlying call "succeeds" or "fails". Worse: this happens on the *success* path too, not just when something goes wrong, so the toast saying "Narrative generated" is shown every time even though it's always the same fallback template underneath. Our earlier fix (item 4 in the original punch list) only corrected the wording shown when the call visibly fails — it didn't touch the much more common case where the call "succeeds" but still silently produces the fallback text.

**How it should be redone:** the same way we already fixed the assessment-tool one — as two more small, dedicated, single-purpose AI functions (not bolted onto the chatbot file), one for each narrative type, following the same template. This is a contained, well-understood fix now that we know exactly what's broken and why — but it's additional scope beyond the 4 already committed, so flagging it as a follow-up rather than doing it silently as part of this sync.

### #3, #4, #5 — all fixed (06 Jul 2026, on `feat/staging-sync`, not yet committed)

Following the deep dive above, Brian asked to fix all three properly rather than just file them as follow-ups. Also confirmed live in production via screenshot: the "consultations is not defined" save error (item #1, already fixed in `78c87e660`) — matches our diagnosis exactly.

**#3 fix — standalone-unit AQF level:**
- New migration `20260706090000_fix_qualification_context_unit_aqf_level.sql` — `CREATE OR REPLACE FUNCTION rpc_build_qualification_context`, guards the position-4-digit AQF heuristic to only run when `product_type = 'qualification'`, so it no longer silently derives a wrong or meaningless AQF level from a unit code.
- New hook `src/hooks/useUnitAqfLevel.ts` (reads/writes `qualification_context.aqf_level` for a given `tas_build_id`).
- `ElectivesSection.tsx` — the "Standalone Unit Selected" panel now includes an AQF Level dropdown (1–9) so a user can set it manually, since it can't be reliably derived for a single unit. Confirmed this can't get silently overwritten: the auto-build effect (`builder-sandbox/index.tsx`) only calls the RPC when no `qualification_context` row exists yet, so a manually-set level persists.
- Note on the also-investigated "unit visibility/selection errors during TAS creation" claim: separately verified — units are already fully selectable and buildable in the current TAS creation flow (`pages/tas/engine/index.tsx`, dedicated Units tab, `useTenantAllUnits`, `rpc_tas_create_draft` all have first-class unit handling). No defect found there; nothing to fix.

**#4 fix — the two additional broken AI narrative generators:**
- New edge function `supabase/functions/tas-market-justification-narrative/index.ts` — dedicated function for the "Generate AI Strategy" button in the Market Justification section, reusing staging's prompt (it was reasonable, just in the wrong place).
- New edge function `supabase/functions/tas-cohort-profile-narrative/index.ts` — same treatment for the Cohort Profile / LLN section's "Generate AI Strategy" button.
- Both registered in `config.toml` with `verify_jwt = true`.
- `MarketJustificationPhasePanel.tsx` and `CohortIntegrityPhasePanel.tsx` — `handleGenerateNarrative` in both now calls the correct dedicated function via `callEdge` instead of the chatbot's `ai-router` (which never had a matching response shape). Real AI-generated content will now actually reach these two "Generate AI Strategy" buttons for the first time. Catch-block wording also corrected to honestly say "AI unavailable — used structured draft" in both files (previously implied success either way).

**#5 fix — deterministic TGA unit-list fetch:**
- `supabase/functions/tga-extract-packaging-rules/index.ts` — added the same deterministic fetch from TGA's `/unitgrid` endpoint that staging built, used as the authoritative `unitList` when available. Unlike staging's version (which hard-failed the whole import if the unitgrid fetch didn't succeed), this falls back gracefully to the existing AI-extraction-with-retry path if the unitgrid fetch fails for any reason — more resilient than either the old AI-only approach or staging's all-or-nothing version.
- Along the way, fixed a pre-existing (unrelated, but now-touched-file) lint violation: replaced `Math.random()` jitter in the retry backoff with `crypto.getRandomValues`.

**Type-check and lint:** clean across every file listed above.

**Commit on `feat/staging-sync`:** `856a0d85122edecaf3f26a1ee618fe82f7b53247`
**Commit message:** `fix: standalone-unit AQF level, wire up two dead AI narrative generators, deterministic TGA unit-list fetch`

**`feat/staging-sync` now has 3 commits ahead of `main`:** `4e86084f6` (7 safe ports) + `78c87e660` (4 bug fixes) + `856a0d851` (this deep-dive round). Migration `20260706090000_fix_qualification_context_unit_aqf_level.sql` will need branch-DB validation before merge, and manual `apply_migration` to production immediately after merge, per the standard migration workflow.

### #5 — What the "reset stale row" commit actually did (full breakdown)

This commit bundled three distinct things, only one of which is a one-off:

1. **A one-time, targeted database fix** — a single `UPDATE` statement that resets exactly one specific client record (identified by its ID) back to "not yet imported," but only if that record's data is actually broken (empty unit list). It's safe and self-limiting — it won't touch a healthy record even if run twice.
2. **A blunt fix to the stuck Import button** — staging just removed the "already imported" check entirely, so the button is always clickable, letting a user re-import and overwrite at any time even after a successful import. We already fixed the same underlying problem more precisely — the button only re-enables when the previous import was genuinely incomplete, staying locked once a real successful import has happened (avoids someone accidentally overwriting a good import).
3. **A more thorough version of the unit-list fetch** — instead of asking the AI to read the unit list out of a training.gov.au description (which is what triggered the original bug — the AI sometimes couldn't find a unit table in the text), staging changed the approach to fetch the authoritative unit list directly from training.gov.au's own structured data feed, and only asks the AI to fill in the surrounding rules text. This is a genuinely more reliable approach than what's on main today (main still relies on the AI to extract the unit list from prose, just with retries and a refusal-to-save-if-incomplete safeguard we already have). **This part is not superseded — it's arguably a better approach than what's on main and worth considering as its own follow-up**, separate from the one-off data fix and the button change (both already handled).

---

## Status summary

- **Branch:** `feat/staging-sync`, created off `main` at `915218af2`.
- **Drift at time of triage:** 128 commits staging-only, 24 main-only.
- **Phase 1 progress:** 7 safe commits ported and committed (`4e86084f6`). All 29 EXCLUDE-bucket commits (27 in Cluster 1 + `8936a3000` + `638b63ffc`) reviewed one-by-one with Brian on 06 Jul 2026 — **final decision: EXCLUDE all of them**, none get ported from staging. Reasoning: either the feature/fix is superseded by better work already on main, or the staging commit hits a hard-excluded file/area.
- **However — the review surfaced 4 real problems that exist on `main` right now, independent of staging.** These are not staging-porting decisions — they are bugs/gaps to fix directly on `main`, on this same branch (`feat/staging-sync`), before opening the PR. See "Plain English — what we're fixing now" below.
- **Not yet started:** NEEDS-MANUAL-REVIEW bucket (TAE40110, Compliance Overview page removal, TGA units live hook, AQF Level Builder, AI chat/ComplyBot cluster, "Fixed all TypeScript errors").
- **Phase 2 (reset staging to mirror main):** not started — gated on Phase 1 PR merge + mandatory pre-reset drift scan.

---

## Plain English — what we're fixing now (in this branch)

While checking whether staging had already fixed things that main was missing, we found 4 problems that exist on `main` today, regardless of what happens with staging. None of these come *from* staging — staging's versions of these areas are either worse or don't apply — but the underlying problems are real and we're fixing them directly:

1. **A form might fail to save.** The Market Justification part of the TAS builder has a coding mistake — it refers to a piece of data ("consultations") that was never actually loaded in that part of the code. If a user hits save in the affected spot, this could throw an error instead of saving. **Fixing this first — highest impact.**

2. **An "Import Units" button can get stuck forever.** If the automatic extraction of unit information from training.gov.au comes back empty (happens for some qualifications where the description doesn't list units in a table), the system marks the record as "done" anyway and permanently disables the import button — with no way to retry short of a database fix. Two real client records have already hit this. We're making the fetch more reliable and giving the button a way to reset itself.

3. **An AI feature ("AI Tool Review Insights") looks like it doesn't work at all.** It sends a request to the AI system asking for a type of review the AI system doesn't know how to handle, so it likely just fails silently every time it's used. We're either wiring up a proper handler for it or confirming it should be turned off.

4. **Minor — a support message is misleading.** When the AI can't generate a narrative and the system falls back to a plain template, the message still says something like "generated successfully" instead of being upfront that AI didn't do the work. Low priority, cosmetic honesty fix.

We're fixing items 1–4 now on `feat/staging-sync` (same branch as the 7 already-ported commits) before opening the PR, since they were found during this review and are small, contained fixes.

---

## ✅ PORTED — 7 safe commits (DONE, committed)

**Commit on `feat/staging-sync`:** `4e86084f610fbdf8eb5c574b7a534bd40c76cf56`
**Commit message:** `feat: port safe staging-only fixes into main (sidebar reorg, remount fix, LLN badge)`
**Type-check:** clean (`npx tsc --incremental --noEmit`). **Lint on changed files:** clean.
**Files touched:** `src/config/adminSidebarConfig.ts`, `src/layouts/RootAppLayout.tsx`, `src/components/tas/builder-sandbox/CohortIntegrityPhasePanel.tsx`.

Source staging commits ported (all verified as clean, no CLAUDE.md violations, no overlap with excluded areas):

| # | Commit | Description |
|---|---|---|
| 1 | `148682e48` | Moved WHS to Students & Support |
| 2 | `3fbe29f58` | Moved items to correct subgroups |
| 3 | `a645616c3` | Moved menu to Training & Assessment |
| 4 | `8a6da416b` | Fixed ComplyBot admin link |
| 5 | `cf87ce6a4` | Moved ComplyBot under Admin |
| 6 | `ad5ede7e4` | Fixed sidebar route mapping (adds `key={location.pathname}` to `<Outlet>` in `RootAppLayout.tsx` to force remount on same-layout navigation; `location` was already in scope via existing `useLocation()`) |
| 7 | `375de7894` | "Applied Option 1 threshold fix" — misleadingly named; actually an LLN risk badge fix in `CohortIntegrityPhasePanel.tsx`. Badge now shows "LLN Strategy Documented" vs "LLN Support Required" based on whether `record.lln_strategy` is actually populated, instead of a blunt required/not-required flag. Nothing to do with subscription/billing despite the commit title. |

Net effect on `adminSidebarConfig.ts`: Assessor Performance moved into Training & Assessment section; Work Health & Safety moved into Students & Support; Third Party Arrangements flattened out of the old `whs-third-party` subgroup into a plain Governance & Risk item (with the same `allowedRoles` list); AI & Automation section emptied (ComplyBot moved out); ComplyBot added to `adminQuickAccessItems` pointing at `/admin/complybot` (confirmed this route already exists on main in `AppRoutes.tsx:1891`, nested under `/admin`, so no dead link).

Verified before porting: `Database` lucide icon import in `adminSidebarConfig.ts` was already unused pre-change (only referenced inside a comment) — not something introduced by this change, left as-is.

---

## ❌ EXCLUDE bucket — full per-commit breakdown (re-verified 06 Jul 2026, read-only)

Brian asked to review these individually rather than discard the whole cluster at once. Full commit-level re-derivation completed — the original "~20 commits" estimate was actually **27 substantive commits** once traced through the real diff commits (the 5 originally-named hashes were Lovable merge-bridge commits, not the underlying changes). One commit (`029d8fdbc`) falls inside the known VOID self-revert range and is excluded as a no-op, not counted here.

**⚠️ Important — this pass surfaced real, currently-live problems on `main` that are independent of the port/exclude decision. Flagging separately at the bottom of this section — they need their own fix regardless of what happens with staging.**

### Cluster 1 — Assessment tools / TAS / Pending Password Resets — 27 commits, chronological (oldest first)

Verdict on the cluster as a whole stands: **EXCLUDE — superseded by main's PR #113** (`9332319e0`). But 3 of the 27 commits are **NOT actually covered** by main and represent real gaps/bugs — these need their own decision, not a blanket exclude.

| # | Commit | What it actually changed | Main coverage |
|---|---|---|---|
| 1a | `99d84c85b` | Adds draft-only delete-document mutation to `useAssessmentToolRegister.ts` | ✅ COVERED (verbatim in main) |
| 1b | `305330112` | Exposes the delete mutation from the hook | ✅ COVERED |
| 1c | `da3e1f309` | Imports Trash2/Lock icons in `AssessmentToolForm.tsx` | ✅ COVERED |
| 1d | `2f8537eb4` | Imports AlertDialog components for delete-confirm | ✅ COVERED |
| 1e | `c5939f35d` | Imports the register hook into the form | ✅ COVERED |
| 1f | `de74dece4` | Adds delete-confirm state + derived lock/can-delete flags + handler | ✅ COVERED |
| 1g | `1a6ff5525` | Renders the delete button/dialog + "document locked" notice | ✅ COVERED |
| 1h | `ac48aa709` | Adds draft-folder UUID ref + upload gate (draft-only, no existing doc) | ✅ COVERED |
| 1i | `c0b54c3d4` | Rewrites upload path to guarantee INSERT-only (no upsert overwrite) | ✅ COVERED |
| 1j | `10ec7cac3` | Replaces generic "no document" text with locked/upload-gated copy | ✅ COVERED |
| 1k | `3a4c40b04` | Coerces `qualification_codes` to array before use | ✅ COVERED |
| 1l | `a525e3595` | Uses new `displayFilename()` helper for shown filename | ✅ COVERED |
| 1m | `7d7b93c08` | Defines `displayFilename()` to strip UUID prefix from uploaded filenames | ✅ COVERED |
| 1n | `9ae3b0a96` | Rewords "missing qualification context" error in `IndustryThemesPanel` | ✅ COVERED |
| 1o | `99f59a5ac` | Same reworded error in `MarketResearchPackPanel` | ✅ COVERED |
| 1p | `cb163b7f6` | Adds `productType` prop to `MarketJustificationPhasePanel` | ✅ COVERED |
| 1q | `3e0bc66c4` | Derives `isStandaloneUnit` from `productType` | ✅ COVERED |
| 1r | `f7f53c2eb` | Hides market-research buttons for standalone units, shows explanatory alert instead | ✅ COVERED |
| **1s** | `75bfdb18f` | Changes AI-failure fallback toast to explicitly say "AI unavailable — used structured draft" instead of a generic success message | **❌ NOT COVERED** — main still shows the generic "Narrative generated" toast on both success and AI-failure paths. Minor UX honesty gap, not a functional break. |
| **1t** | `e18699174` | WIP commit; adds a missing `const consultations = record.industry_consultations ?? [];` used 3× in `handleSave` | **❌ NOT COVERED — exposes a live bug in main.** Main's `MarketJustificationPhasePanel.tsx` `handleSave` references `consultations` three times but never declares it in that scope (the only `consultations` const in the file belongs to an unrelated helper with a different parameter signature). Needs a type-check + look — independent of this cluster's port/exclude call. |
| 1u | `0a910a21b` | Imports KeyRound icon in `DevInterface.tsx` | ✅ COVERED |
| 1v | `ed3b93c3c` | Adds pending-resets state | ✅ COVERED |
| 1w | `23e46eb89` | Adds `loadPendingResets()` query + `copyResetLink()` | ✅ COVERED verbatim, incl. `password_reset_tokens` table existing in main's baseline |
| 1x | `9fe99c0fe` | Renders the Pending Password Resets card UI | ✅ COVERED verbatim |
| **1y** | `df819aabe`, `e86913b7f`, `8b7c67126`, `9a5d6e8e3`, `e723285e3`, `24c95b8a9` | builder-sandbox productType/standalone-unit wiring; new `IntendedAqfLevelSelector.tsx` component; new RPC `rpc_ensure_unit_qualification_context` used instead of `rpc_build_qualification_context` for standalone units | **⚠️ MIXED — not a clean COVERED.** Main has its own more built-out productType handling (PR #113) so the general direction is genuinely superseded, but `rpc_ensure_unit_qualification_context` and `IntendedAqfLevelSelector.tsx` have zero hits anywhere in main. Main's qualification-context auto-init effect still hard-requires `qual_code`, which standalone-unit builds don't have by definition. Can't tell from git alone whether main handles this another way or just doesn't auto-create a `qualification_context` row for standalone units. **Needs an actual functional test of a standalone-unit TAS build on preview before closing this out as fully covered.** |

**93a1b39ba / a628a354f / 035c8d1b5 / 014d9b98a** (the original 4 "named" hashes plus the draft-only-delete one) turned out to be Lovable merge-bridge commits wrapping the real changes above, not separate diffs — folded into the table rows they correspond to. `014d9b98a`'s specific unsafe delete-ordering finding (storage delete before confirmed DB update, raw `console.warn`) is still confirmed true of the underlying commit(s) in row 1a/1f — main's version does it safely, this is correctly excluded.

### Cluster 2 — Task/payload AI dispatcher — `8936a3000`

**Verdict:** EXCLUDE as implemented.
**Files touched:** `AIToolReviewInsights.tsx`, `CohortIntegrityPhasePanel.tsx`, `MarketJustificationPhasePanel.tsx`, `supabase/functions/ai-router/index.ts` (~200 lines added — a `{task, payload}` dispatcher with three hardcoded Claude-Haiku prompt handlers, calling `api.anthropic.com` via raw `fetch()`).
**Why excluded:**
- Grows the already-flagged 938-line `ai-router/index.ts` (CLAUDE.md explicitly lists this file as bad practice / do-not-copy-from).
- Hardcodes `OPERATIONAL_WRITE_ROLES` instead of importing from the shared roles/gates module — comment in the diff admits it's a Lovable-deployer workaround, irrelevant to the GitHub→Vercel pipeline.
- Raw `console.error` (banned).
- Bypasses the `_shared/` pattern entirely.

**⚠️ Real problem surfaced, independent of the exclude decision:** checked main for equivalents — zero. Main's `ai-router/index.ts` only accepts `task_type, messages, context, mode` — no dispatcher, no handling for `market_justification_narrative` / `cohort_profile_narrative` / `assessment_tool_review` task types anywhere. Worse: **`AIToolReviewInsights.tsx` in main still calls `ai-router` with `task_type: 'TOOL_REVIEW'`, which main's router doesn't recognise at all** — so as it stands today, the AI Tool Review Insights feature on main appears to be calling into a dead branch (not duplicated elsewhere — just non-functional). Excluding staging's implementation is still correct (coding-standard violations above), but whether "AI Tool Review Insights" is expected to work on main right now is an open question needing its own answer/fix, unrelated to this port decision.

### Cluster 3 — "Reset stale row to enable reimport" — `638b63ffc`

**Verdict:** EXCLUDE (as a commit — hits two hard-excluded areas by file), but the underlying bug it fixed is real and still unresolved on main.
**Files touched:** `.lovable/plan.md` (planning doc, not code), `ElectivesSection.tsx` (hard-excluded area), `supabase/functions/tga-extract-packaging-rules/index.ts` (hard-excluded area — the exact function area main already touched via `25e06a110`, but for a different bug), plus a one-off migration resetting a single named production row.

**What it actually fixed:** `tga-extract-packaging-rules` asked the AI to extract the unit list from prose that doesn't contain unit tables, so `unitList` could come back empty for real qualifications (confirmed case: BSB50120) with no error shown — the UI just silently displays "0 core · 0 electives". The fix added a deterministic fetch from TGA's `/unitgrid` endpoint as the authoritative unit list (AI only used for counts/rules/specialisations after that), and separately fixed `ElectivesSection`'s Import button being permanently disabled after a bad import with no retry path.

**⚠️ Real problem confirmed still live on main, independent of the exclude decision:** `tga-extract-packaging-rules/index.ts` on main has no `/unitgrid` fetch or deterministic list — still pure AI extraction. `ElectivesSection.tsx` on main still has `disabled={importingTGA || isExtracted}` — **the stuck-button-with-no-retry bug this commit fixed is still live on main.** This directly matches the known issue already logged in `tas.md` ("Already-broken `packaging_rules` records are stuck, not just click import again"). **Recommendation: don't port this commit as-is (still hits two excluded files/areas per policy), but open a fresh, from-scratch fix for the underlying bug** (empty unit list + stuck import button) — it should NOT be treated as already resolved just because this commit is excluded.

### Bugs/gaps on `main` surfaced during this review — FIX LIST (being fixed now on `feat/staging-sync`)

Final call (06 Jul 2026): all 29 EXCLUDE-bucket commits stay excluded — nothing from staging gets ported for Clusters 1–3. These 4 items are separate, real defects on `main`, being fixed directly rather than ported from staging (staging's versions are either worse or entangled with excluded work):

| # | Item | Status |
|---|---|---|
| 1 | **`MarketJustificationPhasePanel.tsx` `handleSave` references an undeclared `consultations` variable** (3 uses) — real save-time bug on main. Source: row 1t above. | ✅ FIXED — `consultations` is now a proper component-level `const` derived from `linkHook.linkedRecords` (same mapping already used for `viabilityRating`), reused by both. Type-check clean. |
| 2 | **`ElectivesSection.tsx` Import button gets permanently stuck disabled** after a bad/empty TGA extraction, no retry path. Confirmed still live on main; matches the existing `tas.md` known-issue entry (2 known stuck records: Australian College BSB50120, Vivacity Testing Tenant CHC43015). Source: Cluster 3 investigation. | ✅ FIXED (code) — the `is_extracted` fetch now also checks `packaging_rules.unitList` is a non-empty array; if `is_extracted=true` but the unit list is empty (pre-PR-#109 broken records), `isExtracted` now resolves to `false` so the Import button re-enables instead of staying stuck. **Not yet done:** the 2 already-known stuck production records still need a manual data fix (reset won't happen automatically from this code change since they'll now just show "not yet imported" and need the button clicked again — worth confirming this actually unblocks them on the branch DB before merge). |
| 3 | **`AIToolReviewInsights.tsx` calls `ai-router` with `task_type: 'TOOL_REVIEW'`, which main's router doesn't handle** — feature appears non-functional on main today. Source: Cluster 2 investigation. | ✅ FIXED — built a new small edge function `ai-tool-review-insights` (follows the CLAUDE.md edge-function template, ~500 lines under limit, doesn't touch the already-oversized `ai-router.ts`) registered in `config.toml`. Frontend now calls it via `callEdge` (was raw `supabase.functions.invoke`) and uses `logger.error` (was raw `console.error`). Same hardcoded fallback insights kept as the error-path fallback. |
| 4 | **AI-failure fallback toast in `MarketJustificationPhasePanel` doesn't distinguish "AI unavailable, used structured draft" from a normal success** — minor UX honesty gap. Source: row 1s above. | ✅ FIXED — bundled with #1 (same file). Toast now reads "AI unavailable — used structured draft" instead of "Narrative generated" when the AI call fails and the deterministic fallback narrative is used. |

**Commit on `feat/staging-sync`:** `78c87e6608d7d2f7bdaab5d616d24fda421b42f6`
**Commit message:** `fix: bugs surfaced during staging-sync review (save error, stuck import button, dead AI feature)`
**Files changed:**
- `src/components/tas/builder-sandbox/MarketJustificationPhasePanel.tsx` (items 1 & 4)
- `src/components/tas/builder-sandbox/ElectivesSection.tsx` (item 2)
- `src/components/assessment-validation/wizard/AIToolReviewInsights.tsx` (item 3)
- `supabase/functions/ai-tool-review-insights/index.ts` — new file (item 3)
- `supabase/config.toml` — registered the new function, `verify_jwt = true` (item 3; confirmed with Brian before editing, per workspace config.toml rule)

Type-check (`npx tsc --incremental --noEmit`) and lint on all changed files: clean.

**`feat/staging-sync` now has 2 commits ahead of `main`:** `4e86084f6` (7 safe sidebar/badge/remount ports) + `78c87e660` (these 4 bug fixes).

---

## 🔶 NEEDS-MANUAL-REVIEW bucket — full deep-dive (06 Jul 2026)

All 6 items investigated thoroughly (read-only, evidence-based, not just repeating commit messages). Verdicts below — none ported/committed yet, pending Brian's decision per item.

### 1. TAE40110 credential gating fix — `26bb807d2`

**What it is:** TAE40110 (2010-vintage Cert IV TAE) is a real, still-recognised qualification, same level as TAE40116/TAE40122. Staging adds it as a third accepted code wherever trainer-qualification checks happen.

**Finding:** Main already has an **internal inconsistency today, independent of staging** — the DB auto-build function, a UI badge component, and TAS document generators already treat TAE40110 as valid, but the two hooks that actually compute a trainer's 1A/1B/1C classification and auto-assessment result (`useFullTrainerMatrix.ts`, `useTrainerEvidence.ts`) only check the two newer codes. A trainer holding only TAE40110 could see contradictory signals in the app right now.

**Risk:** Low for the core gating fix — purely additive (recognises one more genuinely valid code), doesn't loosen evidence requirements. But the commit also bundles a larger, unrelated change to `ingest-trainer-credentials` (new credential-type categorisation logic for AI ingestion) that needs its own DB-constraint check before porting.

**Recommendation:** Port the TAE40110 gating fix (low risk, fixes a real existing inconsistency). Split out and separately review the `ingest-trainer-credentials` credential-type overhaul — verify the DB check constraint allows the new values first.

### 2. Remove "Compliance Overview" admin page — `6c28a9545`

**Finding:** This is a real, actively-built feature on main — a 315-line role-aware compliance dashboard pulling live data through 5 real hooks, with explicit QA acceptance criteria in its own code comments, still linked from the admin quick-access sidebar. The "touched more recently on main" claim from the first triage pass doesn't hold up under inspection — that recent touch was a single leftover debug `console.log` line, not feature work; the last real work on this page was ~6.5 months before staging removed it. Staging's removal is clean (deletes the page, both route registrations, and the sidebar link, no orphaned code) but there's no explanation anywhere in the repo (TODO, HANDOFF, code comments) for *why* it was removed.

**Update (06 Jul 2026, later same day):** Brian found in Lovable's chat history that Angela added a `/admin/compliance-overview → /dashboard` redirect specifically "so bookmarks and Executive/Compliance Manager landings no longer 404" — confirming the removal WAS a deliberate, considered decision (not incidental), and that the "no redirect" gap noted above was real but has since been fixed on staging in a follow-up commit (`76921bbc1`, dated 06 Jul, landed on staging *after* the original `/audit-branch-drift` snapshot — staging kept moving as expected). **Important catch:** that redirect commit only touched `src/routes/admin.tsx` — a route tree that is dead code, never imported or mounted anywhere in the app (confirmed via repo-wide grep; the live tree is `src/AppRoutes.tsx`, mounted in `App.tsx`). So on staging itself the redirect likely doesn't actually take effect at runtime. Added the same redirect to **both** files on `feat/staging-sync` — `AppRoutes.tsx` (the one that matters) and `routes/admin.tsx` (for consistency with staging, even though unused).

**Recommendation:** Do not port the removal on code evidence alone — this needs a direct product-decision check with Angela (she authored the original removal on staging, so there may be a real reason, e.g. consolidated elsewhere) before deleting a page with this much genuine, working functionality.

### 3. TGA "live units" helper — `ca024e5a6`

**Finding:** Confirmed a real, currently-observable gap this closes: today on main, if a qualification hasn't been synced to the local unit-cache table yet, the unit picker shows "no units found" and the user is stuck. Staging's hook adds a live fallback straight to training.gov.au via an edge function that's already deployed and working on main. Traced the "must not be persisted" safety comment all the way through the code — confirmed it's already respected structurally (nothing in the create-TAS flow writes the live-fetched units anywhere).

**Recommendation:** Port, with one small fix first — swap its one raw `supabase.functions.invoke()` call for the standard `callEdge` helper (mechanical, no behaviour change) to match house convention.

### 4. AQF Level Builder UI — `fd943a26c` + related

**Finding:** Heavy overlap with the AQF-level fix already shipped on this branch (commit `856a0d851`). Staging's version solves the same problem (standalone units lacking a reliable AQF level) via a different, more complex path — a new database function, a "suggested level" algorithm, and a Setup-screen card — and that suggestion algorithm **reintroduces the exact same "guess the level from a digit in a code" pattern that was just proven wrong and fixed**, just applied to the unit's parent qualification instead of the unit itself. Porting this would give the builder two competing places to set the same value. One genuinely separate, still-open piece was found: the Learner Profile Pack generator currently hard-blocks if AQF level is blank, even though nothing in the UI currently marks that as required — that part is real and not yet fixed.

**Recommendation:** Skip the bulk of this feature (superseded, and reintroduces a known-bad pattern). Consider a narrow, separate fix just for the Learner Profile Pack blocking behaviour — its own small piece of work, not tied to porting the rest.

### 5. AI chat / ComplyBot UI cluster — 6 commits

**Finding:** Much more portable than first thought once actually traced hunk-by-hunk. Confirmed none of the relevant files have been touched on main since staging forked, so:
- The panel-sizing/layout tweaks and the "AI responses may contain errors" disclaimer text (2 files) are cleanly portable today, no dependencies.
- 3 specific, identified chunks in the chatbot's backend function (unifying two prompt templates into one, changing the default conversation mode) were checked line-by-line against the already-excluded AI dispatcher commit — confirmed zero overlap, so these are portable in isolation too.
- The 89-file "TAS Quality Engine" → "TAS Builder" renaming that was tangling everything together turned out to be a pure, mechanical find-and-replace with no logic changes — confirmed separable and not actually a blocker, though not recommended to do now.
- One item flagged for a product call: one of these commits also quietly removes the "Conversation History" feature entirely — mechanically trivial, but a product decision, not just styling.

**Recommendation:** Port the safe UI/layout changes and the disclaimer text now (5 small, independent, zero-conflict changes). Port the 3 backend prompt/routing hunks as a second, equally low-risk step. Leave the file-renaming alone. Flag the Conversation History removal to Angela/Brian as its own yes/no before including it.

### 6. "Fixed all TypeScript errors" — `3abe771a4`

**Finding:** Bigger than first estimated — 27 files, not ~15. Also uncovered that the documented `npx tsc --incremental --noEmit` pre-push check is currently a no-op on this repo (a separate, real infrastructure problem worth raising to Carl regardless of this decision) — meaning several real type errors have been shipping to main undetected. Confirmed several **genuine, currently-live bugs on main** this commit happens to fix: three different pages where an "empty state" button (e.g. "Add Risk", "Add Trainer") is invisible due to a prop-name mismatch; a status badge that renders unstyled for 3 of 5 possible statuses; a sort that can silently break when a value is missing; a modal wired with props that don't exist on the component. One hunk should be **excluded outright** — it renames a field to `tenant_name`, which doesn't exist as a column, so porting it would break creating a consulting org. One hunk overlaps with and is superseded by work already done on this branch (the `consultations` save-crash fix). The billing-file style change was re-verified independently as truly cosmetic and safe.

**Recommendation:** Port the bulk of it (safe type fixes plus the several real bug fixes it happens to bundle) — but exclude the `tenant_name` field-rename hunk (confirmed harmful) and the `consultations` hunk (already fixed better on this branch).

---

## Self-revert range (VOID — never consider for port)

`git diff 3dc239fda 2f98e98d4` → empty, trees identical. Confirms staging's own revert (`3dc239fda`, "Reverted to commit 2f98e98d4...") fully undid whatever it did in between.

**Void commits:** `3dc239fda`, `c3e930739`, `029d8fdbc`, `2f98e98d4`, and everything strictly between them.

---

## Migrations check (as of first triage pass)

Only two staging-only migration files found across all 128 commits:
- A ~400-line migration belonging to the AQF Level Builder (NEEDS-MANUAL-REVIEW bucket) — not yet compared against main's baseline schema.
- A 7-line migration belonging to `638b63ffc` (Cluster 3, EXCLUDE) — moot since that commit is excluded.

No other staging commit touches `supabase/migrations/`. `seed.sql` only needs checking if the AQF migration is later approved for porting.

---

## Reference

- Main HEAD at branch creation: `915218af2` (merge of PR #116, `fix/assessment-tool-form-responsive-grid`)
- Staging HEAD at triage time: `26fb758f8` ("Removed Conversation History")
- Main-only commits already covering real work (PRs #109–#116): TGA packaging-rules unit-list fix, subscription rate source-of-truth fix, bulk AI analysis fixes, PR #113 sync (Governing Person write access + assessment-tools/TAS delete-doc race fix), assessment-tools UI/permission fixes (responsive grid, document row overflow, bulk-action permissions, register info popover).

___________________________________________
Here's what's still outstanding, in plain terms:

1. The broad sweep of 15+ open branches
We only ever compared Staging against Main. There are 15+ other in-progress branches sitting in GitHub that were never checked against what we just merged. One collision was already found by accident (see #4 below) — there could be others we haven't spotted. Still needs doing.

2. Credential categorisation upgrade — not started
Staging has a bigger, half-built feature for sorting trainer credentials into proper categories (degrees, licences, teaching quals, VET quals). It's not on Main yet at all. Whenever this gets picked up, there's a small bug-fix that needs to travel with it (a save error for credentials with no qualification code), already confirmed real against the live database.

3. Conversation History conflict — needs a decision, not code
Staging removed the old Conversation History feature from ComplyBot, which we brought across. Separately, someone (via Cursor) is mid-way through rebuilding Conversation History properly on its own branch. These two will clash whenever that branch is ready to merge — needs a product call on which version wins, not something we can resolve by just picking a side of code.

4. Standalone-unit AQF level — partially fixed, one edge case left
We fixed the main bug and added a way to manually set the AQF level. But there's still an open question: did any real client qualification codes accidentally produce a wrong AQF level in the past (not just a blank one)? That needs someone to actually look at real client data/documents, not something code review can answer.

5. Two small cosmetic/UX items, low priority

A scroll bar rendering oddly in one part of the training plan builder (the one we just decided to skip and pick up on its own later).
The TAS "Quality Engine" → "TAS Builder" renaming — an 89-file find-and-replace, purely cosmetic naming consistency, no rush.
6. A discovered infrastructure gap, unrelated to any of this
The automatic check that's supposed to catch coding errors before code reaches Main turned out to not actually be running for a while — meaning some bugs slipped through undetected. Worth flagging to Carl separately since it's a process issue, not a one-off bug.

That's everything still sitting open in the notes. Nothing here is blocking day-to-day use of the platform — they're all either small, deferred by design, or waiting on a person's decision rather than more digging.

---
---

# Round 2 — 07 Jul 2026 (fresh drift cycle: PRs #131, #132, #133)

> Staging kept moving after Round 1 above. This round started from a fresh `/audit-branch-drift`, not a continuation of the same branch — new PR numbers, new merge commits, unrelated to `fa91ef0a059`/`80e18dae0`/`915218af2` referenced in Round 1. Full detail below; condensed plain-English version also logged separately at `stagingTomainjuly7.md`.

## Trigger

Brian asked for a fresh `/audit-branch-drift`, specifically to check for a repeat of the known incident pattern: Lovable deploying code or schema changes directly to production, bypassing git, so that a later unrelated merge to `main` silently reverts it via the automated redeploy.

**Drift at time of audit:** `staging` had 77 commits `main` didn't have (mostly generic `gpt-engineer-app[bot]` "Changes" commits, centred on one real feature — skill-set support in the TAS builder). `main` had 15 commits `staging` didn't have (PR #127 trainer-report-race/tenant-leak fix, PR #129 ai-router classifier restore, PR #130 ComplyBot feedback).

## Finding 1 — edge function drift, confirmed repeat of the exact incident pattern

`supabase/functions/tga-extract-packaging-rules/index.ts` was live in production running content that matched `staging`'s version byte-for-byte (confirmed via direct `get_edge_function` pull + diff) — a new "skillset branch" that deterministically parses `SkillSetRequirements` HTML (`contentTypeCode '0126'`) instead of routing skill-sets through the qualification packaging-rules AI-extraction path. `main` had none of this logic at all.

Cross-checked against `deploy-edge-functions.yml`'s run history (`gh run list`) and the function's own `updated_at` timestamp (`2026-07-05T23:43:46Z`) — confirmed this was deployed directly (Lovable/MCP), not through any git-triggered workflow run in that window.

**Exposure at time of finding:** the next merge to `main` touching `supabase/functions/**` would trigger `deploy-edge-functions.yml`, which redeploys **all** functions from `main`'s git state. Since `main` had no skillset logic, that redeploy would have silently reverted this feature in production — no error, no warning. This is the identical failure mode that hit `ai-router` on 6 Jul (Round 1 territory, PR #129's restoration commit spells out the exact mechanism: "Angela deployed ai-router v560-v563 directly to production via Supabase MCP on 5 Jul... the 6 Jul staging-sync merge... triggered deploy-edge-functions.yml — a blanket redeploy... overwrote the live, fixed function... silently reverting two production fixes").

## Finding 2 — migration drift, same feature, worse than the file diff showed

4 migration files existed only on `staging`, all part of the same skill-set feature:
- `20260706214824_8eaa5c0a-b158-4250-9067-4c4efc62c276.sql` — carve-out for skillset builds in `rpc_get_build_readiness` (AQF/VoL step)
- `20260706220632_ef086cf6-ddb1-487b-81de-65d4a35b6b26.sql` — same, Market Needs industry-consultation step
- `20260707014837_8c80edd2-c90a-41d5-ac30-e8f3d3110d8b.sql` — `rpc_get_aot_prerequisites` skillset branch (NCVER coverage instead of AQF VoL)
- `20260707015731_36dd7e6b-855c-4ed1-b313-545b3bb29db4.sql` — attempted fix to `rpc_calculate_aot_engine`'s `tas_aot_packs` INSERT column names

Queried production directly (`pg_get_functiondef`) and confirmed all three underlying RPCs — `rpc_get_build_readiness`, `rpc_get_aot_prerequisites`, `rpc_calculate_aot_engine` — **already had this logic live**, applied directly to the database with no matching file in `main`. Filenames used Lovable's UUID convention (`YYYYMMDDHHmmss_<uuid>.sql`), which fails this repo's `^[0-9]{14}_[a-z][a-z0-9_]+\.sql$` filename guard.

## Finding 3 — bigger migration backlog than the 4-file diff suggested

While querying production's migration history to confirm Finding 2, ran the repo's own `Migration drift check` CI logic manually and found:
- **56 migrations merged to `main` were never applied to production.**
- **479 production migration version records have no matching file anywhere in git.**

This is a much larger instance of the historical Lovable direct-to-prod drift already documented in `supabase/migrations/CLAUDE.md` (the `20260624000100_gap_fill_tenants_schema_drift.sql` precedent, 10 columns, 3,608 orphaned records). **Not fixed in this round** — flagged for its own dedicated investigation; the scale (479 orphans) means a proper reconciliation pass, not an ad hoc gap-fill, is warranted.

Separately confirmed (via `pg_get_functiondef` diffing against `pg_proc`) that **6 additional production migration version records** from the same 6–7 Jul window have **no corresponding file on either branch at all** — a subset of the 479, called out specifically because they land in the exact time window this feature was being built, so they're likely part of the same skillset work and worth prioritising in that future reconciliation pass:
`20260706043712`, `20260706043811`, `20260707020620`, `20260707020720`, `20260707021220`, `20260707021303`.

## PR #131 — `fix/reconcile-skillset-edge-fn-migration-drift`

Branch off `main`. Ported the live edge function source and the 4 migration files verbatim (content matching what's confirmed live), then renamed the 4 files to satisfy the filename guard (content unchanged):
- `20260706214824_carve_out_skillset_from_build_readiness_aqf_vol.sql`
- `20260706220632_carve_out_skillset_from_build_readiness_market_needs.sql`
- `20260707014837_patch_aot_prerequisites_skillset_ncver_coverage.sql`
- `20260707015731_fix_aot_engine_insert_column_names.sql`

**Bot review (Cursor Bugbot + Vercel's reviewer, on commit `d5e1db9c3`) caught 4 real, active production bugs in the ported code** — verified each against the live schema/data before fixing, not taken on the bots' word alone:

| # | Bug | Verification | Fix |
|---|---|---|---|
| 1 | `rpc_calculate_aot_engine` read/wrote `qualification_context.vol_min_hours`/`vol_max_hours` — columns that don't exist (real columns: `volume_of_learning_min`/`volume_of_learning_max`) | Confirmed via `information_schema.columns` — the two columns literally don't exist on that table under those names | Corrected all 4 references (2 reads, 1 write UPDATE, 1 SELECT) to the real column names |
| 2 | `INSERT INTO tas_aot_packs` omitted `breakdown`, which is `jsonb NOT NULL` with **no default** | Confirmed via `information_schema.columns` (`is_nullable = 'NO'`, `column_default = null`) | Added `breakdown` to both the INSERT column list and the `ON CONFLICT DO UPDATE SET` clause, value = `v_hours_breakdown` |
| 3 | Prerequisite gate checked `v_prereq->'blockers'`, a key `rpc_get_aot_prerequisites` never returns (confirmed via `pg_get_functiondef` — it returns `is_ready`/`missing_fields`/`lock_reason`, no `blockers` key at all) — gate always evaluated to empty and never blocked, regardless of actual readiness | Confirmed by pulling the live function definition directly | Rewrote the gate to check `(v_prereq->>'is_ready')::boolean`, building a synthetic `blockers` array from `lock_reason` for the response shape |
| 4 | `tga-extract-packaging-rules`: a failed `q1_tas_builder` update on the skillset save path was only `console.error`-logged; response still claimed `success: true` | Code inspection — no live-data verification needed, the logic path is unconditional | Added an early `return` with `success: false`, `status: 500` on `saveError` |

**Verified live, before and after fixing:** pulled `pg_get_functiondef(rpc_calculate_aot_engine)` from production before the fix — confirmed it matched the *broken* ported code exactly (i.e. the bug was genuinely live, not just present in the PR diff). Applied the fix migration to production via `apply_migration`, re-pulled the function definition, confirmed it now matched the corrected code exactly.

**Merged, migrations applied to production, verified live** (`e19d3d291`).

**Post-merge check on the automatic redeploy revealed the next problem:** confirmed `tga-extract-packaging-rules`'s skillset logic survived — but only because the redeploy **never actually reached that function at all**. `list_edge_functions` showed its `updated_at` unchanged from before the merge. Root cause below.

## The `mcp` function — 25MB bloat, root cause and fix

**Discovery path:** checking why the PR #131 redeploy never reached `tga-extract-packaging-rules`. `gh run list --workflow=deploy-edge-functions.yml` showed the run for that merge commit as `failure`, matching a pattern of failures on the last several merges. Pulled the failed run's log: `unexpected create function status 413: {"message":"request entity too large"}` on a function called `mcp`.

**Root cause, traced in full:** `supabase/functions/mcp/index.ts` was ~50 lines of real logic (two tools: `echo`, `app_info`) wrapping `npm:@lovable.dev/mcp-js@0.20.0` (plus its `/stacks/supabase` submodule) for the JSON-RPC/MCP protocol handling. That package's own dependency tree is what balloons the deploy bundle to ~25MB when Supabase's bundler resolves it — confirmed directly: removing the package from `package.json` and running `npm install` caused **69 other packages to be removed automatically**, none of which were ever used directly.

**Why it mattered beyond `mcp` itself:** Supabase rejects any single function deploy over its size limit with a `413`. Because `deploy-edge-functions.yml` ran `supabase functions deploy` with no function list (deploying all ~209 in one request), this one oversized function could stop the whole batch partway through — the exact mechanism already documented as the root cause of the `ai-router` incident in Round 1/PR #129.

**Fix — full rewrite, not a workaround:**
- `src/lib/mcp/types.ts` — plain `McpTool`/`McpToolResult` interfaces + `defineTool` identity helper, no external package
- `src/lib/mcp/protocol.ts` — hand-rolled JSON-RPC 2.0 handling: `initialize`, `ping`, `tools/list`, `tools/call`, notification handling (no-response for messages with no `id`), batch request support
- `src/lib/mcp/tools/{echo,app-info}.ts` — same two tools, plain JSON Schema instead of zod
- `supabase/functions/mcp/index.ts` — hand-bundled Deno entrypoint mirroring the above (this directory's existing convention — the Lovable auto-rebuild Vite plugin is deliberately not wired into this repo's build)
- `@lovable.dev/mcp-js` removed from `package.json`
- 13 tests in `tests/lib/mcp/protocol.test.ts` covering both tools' happy/error paths, unknown method/tool, notifications, batching

**Verified working end-to-end, not just unit-tested:** pushed as PR #132, which triggered a Supabase branch-preview deploy for the branch — the first branch-preview in the observed history to actually show `FUNCTIONS_DEPLOYED` rather than failing. Confirmed `mcp` present in `list_edge_functions` on that branch project (`version: 1`, `status: ACTIVE`). Sent real JSON-RPC requests directly against the branch preview URL via `curl` and got correct `HTTP 200` responses for all four: `initialize` (correct `protocolVersion`/`serverInfo`/`instructions`), `tools/list` (both tools, correct schema), `tools/call` echo (echoed input correctly), `tools/call` app_info (correct description text).

**Second real bug, caught by Cursor Bugbot on the same PR, before merge:** the `deploy-edge-functions.yml` change that split `mcp` out into its own workflow used a hand-maintained exclusion list (`! -name '_shared' ! -name '_sdk' ! -name 'functions-disabled' ! -name '_archive' ! -name 'mcp'`) that **missed two other non-function helper directories** — `_sql` and `shared` (note: `shared`, not `_shared` — different directory) — confirmed by checking which top-level `supabase/functions/*` directories lack an `index.ts`. Passing those two names to `supabase functions deploy` as if they were real functions risked failing the *entire* production deploy job, not just skipping `mcp`. Fixed by replacing the blocklist with a positive check: `find supabase/functions -maxdepth 1 -mindepth 1 -type d ! -name '_*' -exec test -f '{}/index.ts' \; -print` — a real function is a folder with an `index.ts` that isn't underscore-prefixed (this repo's established convention for internal/shared code; verified `_shared/index.ts` is a barrel export file, not a function entrypoint, so the underscore check is necessary on top of the `index.ts` check, not redundant with it). Verified locally against the actual `supabase/functions/` tree (342 real functions correctly included, all 6 known non-function directories correctly excluded).

**Merged as PR #132** (`3f767a610`).

**Not verified from this session:** whether a literal MCP client application (Claude Desktop, Cursor) can connect to and use the rewritten endpoint in practice — the raw protocol tests above are strong evidence but not a substitute for an actual client handshake.

## GitHub Actions billing outage — discovered mid-session, unrelated to any code

While checking whether the PR #131/#132 merges had actually redeployed anything to production, found every GitHub Actions job on this repo failing in ~2 seconds with the annotation: *"The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings."* Confirmed via `gh api orgs/ComplyHub-ai/settings/billing/actions` that the session's GitHub token lacks the `admin:org` scope needed to view or fix this — it requires an org Owner (Carl) to check **Settings → Billing and plans** on the `ComplyHub-ai` org.

**Practical effect:** `deploy-edge-functions.yml` and `deploy-mcp-function.yml` did not run for the PR #131, #132, or #133 merges.

**Workaround used, with explicit reasoning for why it's safe:** manually deployed `mcp` and `tga-extract-packaging-rules` to production directly via the Supabase `deploy_edge_function` MCP tool, using the exact file content already committed on `main` at the time — not a bypass of review, a substitute delivery mechanism for code that had already gone through the full branch/PR/review process. Confirmed live afterward: `mcp` responded correctly to a real `initialize` request in production (version bumped 1→2); `tga-extract-packaging-rules` version bumped 407→408.

**Why this doesn't recreate the drift risk it superficially resembles:** GitHub Actions has no concept of "the previous version" — every run deploys whatever is currently checked out on `main` at trigger time. Since the manual deploys pushed exactly what was already committed, `main` and production stayed in sync for both functions; a subsequent Actions run (once billing is fixed, or via a manual re-run of the specific blocked run) would just redeploy the same already-current code — a no-op, not a regression. The failure mode only reappears if someone deploys something to production that was **never** committed to `main` first — precisely the pattern this whole round of drift-fixing exists to close. Documented as a standing rule in `CLAUDE.local.md` (dated, flagged for removal once billing is confirmed resolved and a real `deploy-edge-functions.yml` run goes green): commit to `main` first, always, before any manual deploy during the outage.

## PR #133 — `feat/staging-sync` (branch-catchup Phase 1)

With the skillset backend and `mcp` bloat both handled, ran `/branch-catchup` for the remainder of the original 77 staging-only commits. Reviewed the file-level diff rather than the (mostly-generic "Changes") commit list, and sorted the remainder into three groups.

### Group A — skillset feature frontend (ported)

The backend (edge function + RPCs, PR #131) had nothing wired up to display it — without this, the database supports skill-set builds with no UI path to reach that functionality.

| File | Change |
|---|---|
| `AOTPanel.tsx` | Shows NCVER-based baseline UI for skillsets instead of AQF Volume of Learning; consumes `product_type`/`baseline_source`/`ncver_total_hours`/`ncver_units_covered`/`ncver_units_missing` — the exact extra fields `rpc_get_aot_prerequisites` already returns post-PR#131 |
| `ElectivesSection.tsx` | Skillset-aware import labels/toasts ("SkillSet Requirements" vs "Packaging Rules") |
| `TasBuildProgressBar.tsx` | New `productType` prop; drops the AOT segment from both the visible tab strip and the weighted-percent calculation for standalone-**unit** builds only (skillsets keep AOT — they still run the engine, just with an NCVER baseline) |
| `UnitsPipelineStepper.tsx` | `isRationaleExempt` extended from unit-only to unit **and** skillset (neither needs elective-justification rationale) |
| `useTasStepStates.ts`, `useTasPhaseGateState.ts`, `useTasDerivedReadiness.ts`, `tasStepStateReadiness.ts`, `pages/tas/builder-sandbox/index.tsx` | Thread `productType` through the readiness/gate pipeline consistently with the above two exemption rules |

### Group B — Login page changes (held back, then confirmed and ported)

`src/pages/auth/Login.tsx`: hides the Magic Link tab (`SHOW_MAGIC_LINK_TAB = false`) and Google sign-in (`SHOW_GOOGLE_SIGNIN = false`) — underlying auth code (`signInWithOtp`, `GoogleLoginButton`'s `signInWithOAuth`) left intact, just not rendered; replaces the "Create your RTO / Join existing RTO / Explore Trial" footer links + tagline with a "Powered by Vivacity" logo attribution block.

**Initially held back** — these are product/UX decisions (feature flags, footer content), not bug fixes, and the reasoning wasn't documented anywhere in the repo (checked: no matching flag-naming convention used anywhere else in the codebase, so these read as ad hoc, not part of an established feature-flag system). **Confirmed by Brian as all three intentional** — applied, verified clean (no new convention violations, type-check/lint clean; no test required, pure UI content change), committed as `537ad1b4a`.

### Group C — three small, unrelated items (verified against production, not ported blind)

| Item | Verification | Verdict |
|---|---|---|
| `AddAssessmentToolModal.tsx` creates new tools with `status: 'active'` (current `main` behaviour) | `SELECT DISTINCT status, count(*) FROM assessment_tools GROUP BY status` → `approved` (37), `draft` (7), `published` (662), `under_review` (67) — **`'active'` appears nowhere in real production data** | Real bug — fixed to `'draft'` |
| `useCreateConsultingOrg.ts` omits `tenant_name` on insert | `information_schema.columns` confirms `tenant_name` is `text NOT NULL`, `column_default = null`; checked `information_schema.triggers` on `tenants` — no trigger populates it | Real bug — the current `main` version would fail outright on first use. Added `tenant_name: payload.org_name` |
| `types.ts` — regenerate fresh vs. port Lovable's copy | Regenerated via `generate_typescript_types` against the live schema instead of porting staging's snapshot | Surfaced one genuine drift item: `ai_router_logs.kb_miss` column exists live, was reflected nowhere in git before this |
| (`vivacity-logo.png`, initially bundled into Group C) | Checked actual consumers via `git grep` — only `Login.tsx` (Group B) uses it; the two `TemplateManagementSection.tsx` references point to an unrelated, already-broken `public/logos/` path on both branches | Pulled back out of Group C, applied with Group B instead — would have shipped as a dead file otherwise |

**Applied Groups A + C:** 14 files, +352/-119. Verified line-by-line against `CLAUDE.md` conventions (no new `console.*`, no `.single()`, no raw `supabase.from()` in components) — clean, all pre-existing violations found were confirmed pre-existing on `main` before this port, not introduced by it. Added 4 tests (`tests/lib/tasStepStateReadiness.test.ts`) for the new `productType` exemption logic, proving unit builds drop AOT from scoring while skill-sets don't. Committing surfaced one more real, pre-existing lint issue this repo's zero-warnings pre-commit hook caught: `UnitsPipelineStepper.tsx` mixed a component export with plain function/interface exports, breaking React Fast Refresh — split `deriveUnitsPipeline`/`UnitsPipelineStep` into `src/lib/deriveUnitsPipeline.tsx` (pure mechanical fix, verified zero behaviour change via `tsc`/`eslint --max-warnings=0`). Committed as `91978e010`.

Group B applied and committed as `537ad1b4a` after confirmation. Pushed both as PR #133, merged into `main` (`f3923829a`). Post-merge checklist: merge confirmed on `main`, remote + local branch cleaned up, Vercel production deploy confirmed for the merge commit.

## Phase 2 — pre-reset drift scan and staging reset

Per the branch-catchup skill's mandatory Step 2.2, ran the pre-reset scan fresh rather than trusting the PR #133 description — checked the last-touch commit timestamp on both branches for every one of the 49 files still showing a diff between `main` and `staging` post-merge:

| Category | Count | Detail |
|---|---|---|
| `main` ahead (real app code) | ~35 | Everything reconciled in this round, plus earlier separate PRs (#127 trainer-report-race, #129 ai-router restore, #130 ComplyBot feedback) that `staging` never received |
| `main`-only additions | 8 | New files from this round: `mcp`'s `protocol.ts`/`types.ts`, `deriveUnitsPipeline.tsx`, test files, `deploy-mcp-function.yml` |
| "Missing on `main`" by path, actually renamed | 4 | The 4 migration files — verified via direct content diff: 3 byte-identical to their `staging` UUID-named originals, the 4th differs only because `main` has the confirmed-live AOT engine bug fixes from PR #131 |
| Genuinely newer on `staging` | 3 | `.lovable/mcp/manifest.json`, `.lovable/plan.md`, `bun.lock` — all Lovable-internal tooling (this repo builds via npm/Vercel, not Lovable), never real application code, already excluded from every porting decision this round |

**Verdict: safe to reset — every file where `staging` was genuinely ahead was Lovable's own tooling, not application code.**

Force-pushed `main` → `staging`. Verified via `git ls-remote origin main staging`: both branches at `f3923829aa3c48bd0d87edeaa8733fac9e7081f8`.

## Updated status summary (supersedes the Round 1 status block above for current state)

- Both `main` and `staging` at `f3923829a` as of 07 Jul 2026.
- `mcp` rewritten, tested, deployed to production (manually, pending the billing fix for the automated path).
- `tga-extract-packaging-rules` and the 4 skillset migrations reconciled into `main`, applied to production, verified live.
- 4 real production bugs found and fixed in the AOT engine + skillset save path (Cursor/Vercel bot review + direct DB verification).
- 3 more real bugs found and fixed while branch-catchup porting (assessment tool status, tenant creation, plus the pre-existing Fast Refresh lint issue).
- 1 schema-drift item (`ai_router_logs.kb_miss`) surfaced by regenerating `types.ts` fresh instead of porting a stale copy.

## What's still outstanding after Round 2

1. **GitHub Actions billing outage** — needs Carl (org Owner, `admin:org` access) in `ComplyHub-ai`'s GitHub billing settings. Blocking every automated production deploy; currently worked around manually per-function.
2. **Real MCP client test** — connect Claude Desktop or Cursor to the live `mcp` endpoint. Raw protocol tests pass; a literal client handshake hasn't been tried.
3. **AOT engine fix — code confirmed live, not yet exercised end-to-end** — run an actual qualification or skill-set build through the app and confirm the calculation behaves correctly in practice, not just that the function definition matches.
4. **QA the ported skillset UI and Login page changes** in the live app.
5. **The 479-orphan / 56-unapplied migration backlog** (Finding 3 above) — needs its own dedicated reconciliation pass, likely starting with the 6 flagged orphans from the 6–7 Jul window since they're probably part of this same skillset feature.
6. **Round 1's still-open items** (the 15+ open-branch sweep, the Conversation History conflict, the TAE40110 credential overhaul, the standalone-unit AQF edge-case data check, the "TAS Quality Engine" rename) remain open — this round didn't touch them.
7. **Staging will diverge again** as Lovable keeps writing to it — expected, not a problem to solve, just the next cycle whenever it's due.