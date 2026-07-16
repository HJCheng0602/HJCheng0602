import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
if (!existsSync('.git')) throw new Error('Clone your profile repository first, then run npm run sync.');
execFileSync('git', ['pull', '--rebase'], { stdio:'inherit' });
execFileSync(process.execPath, ['scripts/collect-codex.mjs'], { stdio:'inherit' });
// The GitHub workflow is the single renderer. Each device only publishes its own
// aggregate snapshot, avoiding stale cards and merge races between Mac and Windows.
for (const args of [['add','data/devices'], ['diff','--cached','--quiet']]) try { execFileSync('git', args, {stdio:'inherit'}); } catch { if (args[0] === 'diff') { execFileSync('git',['commit','-m','chore: sync AI workbench usage'],{stdio:'inherit'}); execFileSync('git',['push'],{stdio:'inherit'}); } }
