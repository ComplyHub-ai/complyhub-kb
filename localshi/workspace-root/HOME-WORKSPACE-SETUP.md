# Home workspace setup

This snapshot contains the portable files that normally sit outside the two Git repositories. It
deliberately contains no live API keys, access tokens, local environment files, or generated migration
scratch data.

## 1. Clone the repositories

Create one parent folder containing both repositories:

```powershell
New-Item -ItemType Directory -Force "$HOME\complyhubworkspace"
Set-Location "$HOME\complyhubworkspace"
gh repo clone ComplyHub-ai/complyhub-kb
gh repo clone ComplyHub-ai/rto-compass-hub
```

Pull both repositories before restoring the snapshot:

```powershell
git -C ".\complyhub-kb" pull --ff-only
git -C ".\rto-compass-hub" fetch
git -C ".\rto-compass-hub" pull
```

## 2. Restore the portable workspace files

Copy only the portable files and directories listed below from
`complyhub-kb/localshi/workspace-root/` into the parent `complyhubworkspace/` folder:

```powershell
$snapshot = ".\complyhub-kb\localshi\workspace-root"
$portableFiles = @(
  "AGENTS.md",
  "CLAUDE.md",
  "active-work.md",
  "reconciliationwork.md",
  "pr-review-open-prs.md",
  "trigger-phrases.local.md",
  ".mcp.json.example"
)

Copy-Item ($portableFiles | ForEach-Object { Join-Path $snapshot $_ }) -Destination "." -Force
Copy-Item "$snapshot\.claude" ".\.claude" -Recurse -Force
Copy-Item "$snapshot\.cursor" ".\.cursor" -Recurse -Force
Copy-Item "$snapshot\.secrets" ".\.secrets" -Recurse -Force
```

Do not copy the snapshot folder itself as an extra nesting level.

The restored layout should include:

```text
complyhubworkspace/
├── AGENTS.md
├── CLAUDE.md
├── active-work.md
├── reconciliationwork.md
├── pr-review-open-prs.md
├── trigger-phrases.local.md
├── .claude/
├── .cursor/
├── .secrets/
├── complyhub-kb/
└── rto-compass-hub/
```

The historical files already under `localshi/workspace-root/` are archive material. They do not need
to be copied back to the workspace root unless specifically required.

## 3. Configure Claude Code locally

Copy `.claude/settings.local.example.json` to `.claude/settings.local.json`. Replace
`<ABSOLUTE_WORKSPACE_PATH>` with a quoted POSIX path that Bash can resolve. On Windows with Git Bash,
for example, use:

```json
"command": "bash \"C:/Users/<HOME_USERNAME>/complyhubworkspace/.claude/hooks/session-start-context.sh\""
```

Keep any existing local permissions when merging into an existing settings file.

The SessionStart hook uses the restored scripts in `.claude/hooks/` and loads the shared KB guidance.
Restart Claude Code after changing local settings.

## 4. Create the OpenRouter secret locally

The snapshot contains only an empty template. Never commit the completed secret file.

1. In OpenRouter, open the account menu and select **Keys**.
2. Create or copy an API key.
3. Copy `.secrets/openrouter.env.example` to `.secrets/openrouter.env`.
4. Replace the placeholder value in `openrouter.env` with the real key.

```powershell
Copy-Item ".\.secrets\openrouter.env.example" ".\.secrets\openrouter.env"
```

On Git Bash or WSL, restrict access and load it before launching Claude Code:

```bash
chmod 700 .secrets
chmod 600 .secrets/openrouter.env
source .secrets/load-openrouter.sh
```

Use `/status` in Claude Code to confirm the OpenRouter base URL. Do not print the key into a terminal
log, chat, issue, or commit.

## 5. Configure Supabase MCP with OAuth

Do not restore the old token-bearing MCP files. Use the OAuth examples:

- Copy `.mcp.json.example` to `.mcp.json` for Claude Code.
- Copy `.cursor/mcp.json.example` to `.cursor/mcp.json` for Cursor.
- The configured production project is `gdwhlstfguxarnxasrrs`.

On first use, complete the Supabase browser login. In Cursor, open **Cursor Settings → Tools & MCP**,
select the Supabase server, and authenticate if prompted. Keep database work read-only unless a
separate task explicitly authorizes a write.

## 6. Configure Vercel access and application environment variables

### Vercel MCP

Vercel MCP is user-scoped and should be connected separately on the home machine. In Cursor, open
**Cursor Settings → Tools & MCP**, add or enable Vercel, and complete the browser OAuth flow. Confirm
the selected team is **complyhub** and the project is **complyhub-rto**.

For Claude Code, check the user-scoped connection:

```powershell
claude mcp get vercel
```

If it is missing, use the current `claude mcp add --help` instructions to add the Vercel HTTP/OAuth
server, then authenticate in the browser.

### Local application environment

Run these commands from `rto-compass-hub/`:

```powershell
vercel login
vercel link --yes --project complyhub-rto --scope complyhub
vercel env pull .env.local --yes --environment=development
```

`vercel env pull` replaces the destination file. Back up an existing `.env.local` before pulling:

```powershell
if (Test-Path ".env.local") {
  Copy-Item ".env.local" ".env.local.backup"
}
```

Compare variable **names** with the repository's environment example, if present. Never print or
commit secret values. Variables exposed to the Vite browser bundle use the `VITE_` prefix and must not
contain private server credentials.

## 7. Final safety checks

Run status checks in both repositories:

```powershell
git -C ".\complyhub-kb" status --short
git -C ".\rto-compass-hub" status --short
```

Confirm that none of these appear as tracked or staged files:

- `.secrets/openrouter.env`
- `.env.local` or other populated `.env*` files
- `.mcp.json` or `.cursor/mcp.json`
- `.codex/config.toml`
- files containing API keys or personal access tokens

The committed snapshot should contain only templates (`*.example`) and setup instructions. Keep all
live credentials local to the home machine.
