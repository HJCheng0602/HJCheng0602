import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const root = join(homedir(), '.codex', 'sessions');
const usage = new Map(); const days = new Map();
function walk(dir) { if (!existsSync(dir)) return []; return readdirSync(dir, { withFileTypes:true }).flatMap((e) => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]); }
for (const file of walk(root).filter((f) => f.endsWith('.jsonl'))) {
  let model = 'codex', previousTotal = 0;
  for (const line of readFileSync(file, 'utf8').split('\n')) try {
    const event = JSON.parse(line);
    if (event.type === 'turn_context' && event.payload?.model) model = event.payload.model;
    const u = event?.payload?.type === 'token_count' ? event.payload.info?.total_token_usage : null;
    if (!u || !Number.isFinite(u.total_tokens)) continue;
    // token_count is cumulative within a rollout. Attribute only the new delta
    // to the model and date active at this point so model switches and long
    // sessions spanning multiple turns are not assigned to the final context.
    const delta = u.total_tokens >= previousTotal ? u.total_tokens - previousTotal : u.total_tokens;
    previousTotal = u.total_tokens;
    if (!delta) continue;
    const day = event.timestamp?.slice(0, 10);
    usage.set(model, (usage.get(model) || 0) + delta);
    if (day) days.set(day, (days.get(day) || 0) + delta);
  } catch {}
}
// Keep the public dashboard private by default: never publish a machine hostname.
const device = process.env.AI_WORKBENCH_DEVICE || (platform() === 'darwin' ? 'mac' : platform() === 'win32' ? 'windows' : 'linux');
const output = { device, platform: platform(), collectedAt: new Date().toISOString(), models:[...usage].map(([name,tokens])=>({name,tokens})), days:[...days].map(([date,tokens])=>({date,tokens})) };
mkdirSync('data/devices', { recursive:true }); writeFileSync(`data/devices/${device}.json`, `${JSON.stringify(output,null,2)}\n`);
console.log(`Collected ${output.models.length} model(s) from ${root}.`);
