import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const root = join(homedir(), '.codex', 'sessions');
const usage = new Map(); const days = new Map();
function walk(dir) { if (!existsSync(dir)) return []; return readdirSync(dir, { withFileTypes:true }).flatMap((e) => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]); }
for (const file of walk(root).filter((f) => f.endsWith('.jsonl'))) {
  for (const line of readFileSync(file, 'utf8').split('\n')) try {
    const event = JSON.parse(line); const u = event?.payload?.usage || event?.usage || event?.response?.usage;
    if (!u || !Number.isFinite(u.total_tokens)) continue;
    const model = event?.payload?.model || event?.model || 'codex'; const day = (event.timestamp || event?.payload?.timestamp || '').slice(0,10);
    usage.set(model, (usage.get(model)||0) + u.total_tokens); if (day) days.set(day, (days.get(day)||0) + u.total_tokens);
  } catch {}
}
// Keep the public dashboard private by default: never publish a machine hostname.
const device = process.env.AI_WORKBENCH_DEVICE || (platform() === 'darwin' ? 'mac' : platform() === 'win32' ? 'windows' : 'linux');
const output = { device, platform: platform(), collectedAt: new Date().toISOString(), models:[...usage].map(([name,tokens])=>({name,tokens})), days:[...days].map(([date,tokens])=>({date,tokens})) };
mkdirSync('data/devices', { recursive:true }); writeFileSync(`data/devices/${device}.json`, JSON.stringify(output,null,2));
console.log(`Collected ${output.models.length} model(s) from ${root}.`);
