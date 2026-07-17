#!/usr/bin/env bash
set -euo pipefail

if command -v node >/dev/null 2>&1; then
  node_bin="$(command -v node)"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  node_bin="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
else
  echo "Node.js was not found. Install it with 'brew install node', then run ./sync.sh again." >&2
  exit 1
fi

exec "$node_bin" scripts/sync.mjs
