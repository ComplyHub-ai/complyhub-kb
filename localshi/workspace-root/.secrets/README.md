# OpenRouter Secrets

This directory holds workspace-local credentials for OpenRouter API access. It is **outside both git repos** and is never committed.

## Setup

1. Get your API key from https://openrouter.ai/keys
2. Copy `openrouter.env.example` to `openrouter.env` (the `.gitignore` belt prevents accidental commits)
3. Edit `openrouter.env` and replace `sk-or-v1-REPLACE_ME` with your real key
4. Before launching Claude Code, load the key:
   ```bash
   source .secrets/load-openrouter.sh
   ```
   Or add to `~/.zshrc` for automatic loading every shell session.

5. Verify inside Claude Code with `/status` — you should see `https://openrouter.ai/api` as the base URL

## Security

- Never paste the key into chat, commits, or shared docs
- File permissions: `openrouter.env` should be mode `600` (user read/write only)
- The `.gitignore` belt in `complyhub-kb/.gitignore` prevents accidental copies into the KB repo

## Models available (via OpenRouter)

See `complyhub-kb/reference/ai-model-routing.md` for the full routing policy:

- **Scout (explore):** `deepseek/deepseek-v4-pro` or `moonshotai/kimi-k2.7-code`
- **Hound (debug):** `anthropic/claude-sonnet-4.6` → escalate to `anthropic/claude-opus-4.6`
- **Compass (plan):** `anthropic/claude-opus-4.6`
- **Maker (execute):** `anthropic/claude-sonnet-4.6`
- **Tinker (PR dry-run):** `deepseek/deepseek-v4-flash`
- **Sentinel (PR verdict):** `anthropic/claude-opus-4.6`

## If key is missing or invalid

If a Claude Code Agent call fails with "401 Unauthorized" or "API key not found", one of three things happened:

1. `openrouter.env` doesn't exist — copy from `.example` and add your key
2. `load-openrouter.sh` wasn't sourced before launching Claude Code — reload the shell or restart Claude Code
3. The key in `openrouter.env` is invalid — check at https://openrouter.ai/keys and copy the full string without extra spaces

**First Anthropic OAuth:** The first time you use an OpenRouter Anthropic model in Claude Code, you may see an OAuth browser login (different from the Anthropic API login). That's expected and only happens once per machine.
