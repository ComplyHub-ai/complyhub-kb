#!/bin/bash
# Load OpenRouter API key into environment for Claude Code
# Usage: source .secrets/load-openrouter.sh
# Or add to ~/.zshrc: source <workspace-root>/.secrets/load-openrouter.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/openrouter.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found. Create it from openrouter.env.example and add your API key."
    exit 1
fi

set -a
source "$ENV_FILE"
set +a

echo "✓ OpenRouter API key loaded from $ENV_FILE"
