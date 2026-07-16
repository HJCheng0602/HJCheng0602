# AI Workbench setup

The profile card shows **aggregated Codex CLI usage only**. It never publishes prompts, responses, project paths, session IDs, API keys, or machine hostnames.

## Publish the profile

1. Create a **public** GitHub repository named exactly `HJCheng0602` under the `HJCheng0602` account.
2. Push this directory to its `main` branch.
3. Open the account profile: GitHub will render `README.md` automatically.

## Connect each computer

On both macOS and Windows, clone the profile repository and run:

```bash
node scripts/sync.mjs
```

Set a friendly device label before the first run if desired. This is the only device name that becomes public:

```bash
# macOS / Linux
AI_WORKBENCH_DEVICE=macbook node scripts/sync.mjs

# PowerShell
$env:AI_WORKBENCH_DEVICE = 'windows-desktop'; node scripts/sync.mjs
```

Run it whenever you want the card to update, or schedule it locally. The script reads only `~/.codex/sessions/**/*.jsonl` and publishes one compact file per device under `data/devices/`.

## How it updates

```text
Codex CLI local logs → device aggregate → GitHub repository → GitHub Action → SVG card → Profile README
```

GitHub Actions merges device totals and renders the final SVG. This makes the dashboard resilient when your Mac and Windows machine sync at different times.

## ChatGPT in the browser

ChatGPT's web interface does not provide a trustworthy per-user real-time token export. It is intentionally excluded from the token total instead of being estimated inaccurately.
