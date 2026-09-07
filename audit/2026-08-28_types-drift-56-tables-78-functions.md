# 2026-08-28 — Supabase generated types drift (56 tables, 78 functions missing)

**Discovered during:** PR #823 (transition and teach-out student workflow) Scout/Reviewer pass, worktree B.

**Finding:** The committed `rto-compass-hub/src/integrations/supabase/types.ts` was stale against the live production Supabase schema — 56 tables and 78 functions present in production were entirely absent from the generated types file. This was unrelated to PR #823's own content; it surfaced only because #823's new hook files were using `(supabase as any)` casts to work around missing types, which is what prompted regenerating the file.

**Action taken:** Regenerated `types.ts` from live production as part of landing #823. This fixed #823's specific hooks but is a point-in-time fix, not a process fix — the drift will recur as new tables/functions are added to production without a corresponding types regeneration step.

**Status:** Audit entry only, per Brian's instruction (28 Aug 2026) — not yet tracked as an active backlog item or living-doc entry. No further action taken this session.

**Follow-up worth considering (not actioned):** a CI or pre-push check that diffs `types.ts` against the live schema, so this kind of drift is caught automatically rather than being found incidentally during unrelated PR work.
