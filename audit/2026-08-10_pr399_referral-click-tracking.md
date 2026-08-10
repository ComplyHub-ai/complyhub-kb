# Audit — PR #399: Referral Click Tracking + QI Migration Fix (10 August 2026)

**Date:** 10 August 2026
**Branch:** `feat/referral-click-tracking`
**PR:** [#399](https://github.com/ComplyHub-ai/rto-compass-hub/pull/399)
**Merge commit:** `dfb69980a8f9aef2af18d222f5ce1f897b81a17c`
**Purpose:** Phase 2 of the referral-attribution fix (Phase 1: PR #398). Spec from RJ: the affiliate dashboard's "clicks" KPI should always increment on a visit to a valid `?ref=` trial-signup link, even if the visitor never signs up.

---

## What was implemented

- New anon-callable RPC `public_track_referral_click(text)` (`20260810015315_add_public_track_referral_click_rpc.sql`), modeled on the existing `public_submit_qi_survey` pattern: validates the ref code's format server-side (`^[A-Z0-9]{3,20}$`, matching the existing `REF_CODE_REGEX` convention), does one targeted `UPDATE` on `affiliate_ref_codes.click_count`, and returns the same generic `{ok: true/false}` shape whether or not the code matched — no existence-enumeration surface. `REVOKE ... FROM PUBLIC` / `GRANT ... TO anon, authenticated`.
- `DemoSignup.tsx` captures `?ref=` on mount (`useSearchParams`), persists it to `sessionStorage` (`REFERRAL_CODE_STORAGE_KEY`, new constant in `pages/trial-signup/constants.ts`) for the signup-attribution work in the next phase, and fires the click-tracking RPC via a new `useTrackReferralClick` hook.
- `DemoSignupModal.tsx`'s two hard `window.location.href = '/trial-signup'` redirects were silently dropping any `?ref=` already on the current page; both now forward it via a `getTrialSignupUrl()` helper.

## Blast radius

New RPC + one new hook + edits confined to the trial-signup landing path (`DemoSignup.tsx`, `DemoSignupModal.tsx`, shared constants file). No shared route/role config touched.

## Dave standard / DB impact

New table write path (`affiliate_ref_codes.click_count`) via a new `SECURITY DEFINER` RPC callable by `anon` — the highest-sensitivity kind of DB change in this phase (unauthenticated write surface). Guarded by format validation and `is_active = true`; no other column exposed to client input. No RLS change (RPC bypasses RLS by design, same as the existing `public_submit_qi_survey`/`rpc_send_consultant_trial_invite` precedents). RJ chose to own this migration directly rather than flag it to Dave, consistent with owning the referral-attribution initiative end-to-end.

## Unrelated bug found and fixed in the same PR: `qi_phase0_remap_register_ids` variable shadowing

CI's branch-DB check failed with `record "r" is not assigned yet (SQLSTATE 55000)` inside `20260805081059_qi_phase0_remap_register_ids.sql` — completely unrelated to this PR's diff (confirmed via `git log`, that file was last touched in a different, already-merged commit `59a0170fb`). Root cause: the migration's `DO $$` block declared a plpgsql `record` variable named `r`, then separately used `r` as a SQL join alias inside two `UPDATE ... FROM ... JOIN` statements — the plpgsql variable shadows the join alias, so `SET register_id = r.id` resolved against the not-yet-assigned outer variable instead. It never fired in production because the join matched zero rows there at apply time (confirmed by querying `qi_survey_links`/`qi_responses`/`qi_annual_register` row counts directly), but it reliably fails a fresh branch-DB replay once seed data produces a matching row.

**First attempt was wrong and had to be corrected:** initially added a new, later-dated migration (`20260810020518_...`) re-implementing the corrected logic. This does not work — branch-DB replays run every migration file in chronological order, so the original buggy file still runs (and aborts the whole replay) *before* a later-dated fix migration is ever reached. The only real fix is correcting the buggy file's content in place.

**Resolution — a deliberate, documented exception to the "append-only migrations" rule:** edited `20260805081059_qi_phase0_remap_register_ids.sql` directly, renaming the shadowed variable (`r` → `v_reg`); every guard and the remap/backfill/rollup logic is otherwise byte-for-byte unchanged. Confirmed safe because: (1) this exact version is already recorded as `applied` in production's `schema_migrations` ledger, and the Supabase CLI skips re-running any file whose version is already in the target's ledger — so the edit cannot cause production to re-execute the block or diverge from what it already recorded as having run; (2) the only consumer of the file's live content going forward is a fresh branch DB, which has no ledger yet and needs the corrected version. Full rationale recorded in-file as a comment. RJ approved the exception explicitly before it was made (classifier-blocked `git add` on the edited file required RJ to stage/commit/push it himself from his own terminal).

No production-apply step needed for this fix — it's a one-off `DO` block, not a persisted function, and its production ledger entry is untouched.

## CI note

Branch-DB check failed twice on the `qi_phase0_remap_register_ids` bug above before the in-place fix landed; unrelated to the click-tracking feature itself.

## Production apply

`public_track_referral_click` applied via Supabase MCP `execute_sql` against project `gdwhlstfguxarnxasrrs` post-merge. Verified via `pg_get_functiondef` (body matches exactly) and `information_schema.routine_privileges` (`anon`/`authenticated` have `EXECUTE`, no `PUBLIC` grant).

**Open item:** RJ still needs to run `supabase migration repair --status applied 20260810015315` from a terminal with the CLI linked — not yet confirmed done as of this entry. `20260805081059` needs no repair command (ledger entry unchanged, only file content changed).

## Files changed

`src/pages/DemoSignup.tsx`, `src/components/DemoSignupModal.tsx`, `src/pages/trial-signup/constants.ts`, `src/hooks/useTrackReferralClick.ts` (new), `supabase/migrations/20260810015315_add_public_track_referral_click_rpc.sql` (new), `supabase/migrations/20260805081059_qi_phase0_remap_register_ids.sql` (in-place edit, exception to append-only — see above).
