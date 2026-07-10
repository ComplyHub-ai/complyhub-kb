# Vercel MCP — reference

> Moved from `CLAUDE.local.md` (10 July 2026, added 02 July 2026 originally). Content unchanged from the original.

Vercel MCP is registered at **user scope** in `C:\Users\brian\.claude.json` (HTTP transport, OAuth — no token in any repo file). It persists across restarts. If tools ever stop loading, run `claude mcp get vercel` to confirm it is Connected, then restart Claude Code.

| Name | ID | Notes |
|---|---|---|
| Team | `team_oUNjuuI0xecWTumBWDTNZuEm` (slug `complyhub`) | The only team |
| Project | `prj_PWwpFRTBB4i4RAni8diFr7YaFk89` (`complyhub-rto`) | Node 22.x |

**Domains on this project:** `rto.complyhub.ai` (production), `complyhub-rto.vercel.app`, `complyhub-rto-git-main-complyhub.vercel.app`.

**Production truth (verified 02 July 2026):** Merging a PR to `main` fires a Vercel **production** deploy that serves `rto.complyhub.ai` — this happens automatically, no manual publish. This is the GitHub path and is intentional. (The Lovable/staging path is separate — Lovable publishes via the `staging` branch and requires its own publish action.)

**Branch preview URL pattern (deterministic):** `complyhub-rto-git-<branch-slug>-complyhub.vercel.app` where `<branch-slug>` is the branch name with `/` and other non-alphanumerics turned into `-` (long slugs get a hash suffix — confirm via `list_deployments` when unsure).

**Vercel access is READ-ONLY by default.** Use `list_deployments`, `get_deployment`, `get_deployment_build_logs`, `get_runtime_errors`, `get_runtime_logs`, `get_project` freely for diagnosis.

**Never use without Brian explicitly saying "deploy to Vercel":**
- `deploy_to_vercel` — triggers a real deployment. Gated exactly like Supabase `apply_migration`.

### Trigger phrases → actions

**"check the deploy"** (or "did the build pass" / "is it deployed")
1. `list_deployments` for the project, filter to the active branch (`meta.githubCommitRef`)
2. Report `state` (READY / BUILDING / ERROR / CANCELED), target, and commit message
3. If `ERROR` → pull `get_deployment_build_logs` and report the actual failing lines

**"get the preview url"** (or "what's the preview link")
- Return the Ready preview deployment URL for the active branch (or the `complyhub-rto-git-<branch>-complyhub.vercel.app` alias). Only hand over a URL once its `state` is READY.

**"check runtime errors"** (or "any production errors" / "check the logs")
- `get_runtime_errors` / `get_runtime_logs` on the production deployment. Use as a first-look tool for production bug reports, alongside the DB data-state check (`complyhub-kb/reference/diagnosis-discipline.md`).
