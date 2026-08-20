# Open PR Review — rto-compass-hub

> Last synced: 20 August 2026

## Open PRs (5)

| # | Title | Branch | Author | Tier | Verdict | Severity |
|---|---|---|---|---|---|---|
| 534 | fix(consultation): stop ICR autolog merging distinct plan surveys | cursor/critical-bug-management-e08c (draft) | app/cursor | tier-b | TBD | — |
| 533 | fix(security): fail-closed membership on suggestion Accept RPCs | cursor/critical-bug-investigation-35b6 (draft) | app/cursor | tier-b | TBD | — |
| 514 | fix: bump react-router-dom to 7.18.2 (GHSA-qwww-vcr4-c8h2) | copilot/fix-react-router-csrf-bypass | app/copilot-swe-agent | (none) | TBD | — |

## Notes

- **Three separate PRs target the same nanoid CVE surface** (#528, #518, #517) — these are very likely mutually exclusive/overlapping fixes for the same dependency tree. Must diff against each other before merging any — merging more than one could conflict or double-patch lockfile entries.
- **#532 and #531 both claim "Forms campaign" work** — one from copilot-swe-agent, one from angela-connell — need to confirm these aren't duplicate/competing implementations of the same feature before merging either.
- Dependency PRs (#528/#518/#517 nanoid, #516 dompurify, #515 PostCSS, #514 react-router-dom) are flagged by Brian as highest-stakes — full lockfile + transitive-dependency + breaking-change review required before any merge, not just "tests pass."

## Recommended merge order (once each item's own blocker is cleared)
    
9. **#534, #533** — still drafts; not mergeable until undrafted and given a full review, independent of the above ordering.

Rationale: everything in steps 1–6 edits `package.json`/`package-lock.json`, so sequencing avoids self-inflicted conflicts; steps 7–9 are functionally independent of the dependency batch and of each other, so their order relative to 1–6 doesn't matter — only decide 7 before spending review effort on it.

## Review log

### Dependency PRs — full analysis (2026-08-20)

Method: diffed each branch against its own git merge-base with main (not branch-tip vs main-tip, which is misleading — that comparison shows *all* drift since divergence, not what the PR itself changed or what a real three-way merge produces), then cross-checked against GitHub's own live `mergeable`/`mergeStateStatus` computation.

| # | Package bump | Own diff (vs merge-base) | GitHub mergeable | Verdict |
|---|---|---|---|---|
| #516 | dompurify 3.4.12→3.4.13 (XSS, GHSA-55q2-fjhq-7xh7) | Clean, single line, package.json only | MERGEABLE, all checks pass | **SAFE TO MERGE** |
| #517 | docx's transitive nanoid 5.1.6→5.1.16 (CVE-2026-67214) | Clean, package-lock.json only, no package.json touch | MERGEABLE, all checks pass | **SAFE TO MERGE** — low risk, lockfile-only |
| #514 | react-router-dom ^7.18.0→7.18.2 (CSRF, GHSA-qwww-vcr4-c8h2) | Clean, single line, package.json only | MERGEABLE but **Supabase Preview check FAILING** | Hold — investigate preview failure before merge (branch is old; could be stale schema/config incompatibility or infra flake, not yet diagnosed) |
| #518 | nanoid 3.3.15→3.3.18 (CVE-2026-67213, zero-size DoS; also patches CVE-2026-67214) | Clean, single line, package.json only | MERGEABLE but **Supabase Preview check FAILING** | Hold — same unresolved preview failure as #514. Otherwise this is the *better* of the two nanoid top-level fixes (covers both CVEs vs #528's one) |
| #528 | nanoid 3.3.15→3.3.16 (CVE-2026-67214 only — does NOT cover CVE-2026-67213 that #518 fixes) | Clean vs main, but **includes an unrelated deletion of `html/html.meta.json.gz`** (a tracked static-export asset) and an unrelated `.gitignore` hunk | MERGEABLE, all checks pass | **Recommend closing in favour of #518** — inferior CVE coverage plus unexplained scope creep. #518 and #528 both add the same `package.json` "nanoid" key at different values — only one can ever be merged, never both |
| #515 | PostCSS 8.4.47→8.5.23 (CVE-2026-69153) | Clean single line vs its own merge-base, but main independently bumped postcss to 8.5.18 after this branch forked — same line, different value both sides | **CONFLICTING** (GitHub-confirmed, `mergeStateStatus: DIRTY`) | **Cannot merge as-is** — needs a rebase onto current main first. Once rebased, 8.5.23 is still the correct, higher target — safe to redo after rebase |

**Correction note:** an earlier pass in this session compared branch-tip directly against main-tip and wrongly concluded several of these PRs would "revert" dompurify/PostCSS/version-number fixes on merge. That was an artifact of the wrong diff base — verified against merge-base and GitHub's live mergeable computation, that conclusion doesn't hold except for #515, which GitHub itself flags as a real conflict (not a silent bad merge — git refuses to auto-resolve it).

**Net recommendation for dependency PRs:** merge #516 and #517 now. Diagnose the Supabase Preview failure on #514 and #518 before merging either (do NOT merge blind past a failing check). Close #528. Ask the branch author/bot to rebase #515, then re-review.

### #532 vs #531 — competing implementations of the same feature (2026-08-20)

Both titled "Forms campaign phase 2 distribution," both touch `StandaloneFormsPage.tsx` and the same `ai-router` files, both branch from before `20260820090000_fix_tenant_api_key_rpc_membership_check.sql` landed on main.

- **#532** (copilot-swe-agent): one large squashed migration (`add_standalone_form_campaigns_phase2.sql`, ~1150 lines).
- **#531** (angela-connell, tier-b): 8 incremental migrations — foundation, response/send RPCs, permission hardening, anon-RPC revocation, token routing, close-transition enforcement, billing/event indexing.

The actual code in `StandaloneFormsPage.tsx` differs substantially between the two (different imports, different UI approach) — these are not a rebase of one onto the other, they're independently-written competing implementations. **Do not merge either without deciding which is the intended one** — merging both is impossible (same migration-name collision on the shared `fix_tenant_api_key_rpc_membership_check.sql` base file plus direct file conflicts) and merging the "wrong" one risks losing the more security-hardened version (#531 has explicit RLS/anon-access hardening steps #532 doesn't show as separate migrations). **Recommend Brian confirm which branch is the live one** before either proceeds to a Scout/Reviewer pass.

### Remaining PRs — lighter pass (2026-08-20)

| # | Notes |
|---|---|
| #534 | Still marked **draft** — cursor bug fix for ICR autolog survey dedup. Not ready for merge review regardless of other findings; adds a test file, touches the same `ai-router`/migration files as the Forms PRs (stale-base drift, not necessarily conflicting). Needs full Scout pass once undrafted. |
| #533 | Still marked **draft** — cursor security fix for fail-closed membership on suggestion Accept RPCs. Same stale-base drift pattern. Security-relevant (tier-b) — needs a proper Scout+Reviewer pass, not a light one, once undrafted. |
| #485 | Non-draft, tier-b, 31 files changed, GitHub reports MERGEABLE (behind, not conflicting). **Not yet given a full review** — this is DB/RLS-surface work per its tier label and deserves the full Scout→Reviewer cycle before any merge call, not the lighter pass given to it here. |
| #536 | Trivial version bump (1.16.0→1.17.0), tier-a, MERGEABLE. No concerns — safe as a mechanical merge once other work affecting `package.json`'s version field has landed (merge last to avoid an unnecessary conflict). |
