import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const root = join(homedir(), '.codex', 'sessions');
const windowDays = 183;
const windowEnd = new Date().toISOString().slice(0, 10);
const windowStartDate = new Date(`${windowEnd}T00:00:00Z`);
windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (windowDays - 1));
const windowStart = windowStartDate.toISOString().slice(0, 10);
const usage = new Map(); const days = new Map(); const modelTurns = new Map();
const metricKeys = ['input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens'];
const emptyMetrics = () => Object.fromEntries(metricKeys.map((key) => [key, 0]));
const addMetrics = (target, delta) => {
  for (const key of metricKeys) target[key] = (target[key] || 0) + (delta[key] || 0);
};
function walk(dir) { if (!existsSync(dir)) return []; return readdirSync(dir, { withFileTypes:true }).flatMap((e) => e.isDirectory() ? walk(join(dir,e.name)) : [join(dir,e.name)]); }
for (const file of walk(root).filter((f) => f.endsWith('.jsonl'))) {
  let model = 'codex', previous = emptyMetrics();
  for (const line of readFileSync(file, 'utf8').split('\n')) try {
    const event = JSON.parse(line);
    if (event.type === 'turn_context' && event.payload?.model) model = event.payload.model;
    const day = event.timestamp?.slice(0, 10);
    if (event.payload?.type === 'user_message' && day && day >= windowStart && day <= windowEnd) {
      modelTurns.set(model, (modelTurns.get(model) || 0) + 1);
    }
    const u = event?.payload?.type === 'token_count' ? event.payload.info?.total_token_usage : null;
    if (!u || !Number.isFinite(u.total_tokens)) continue;
    // token_count is cumulative within a rollout. Attribute only the new delta
    // to the model and date active at this point so model switches and long
    // sessions spanning multiple turns are not assigned to the final context.
    const reset = u.total_tokens < previous.total_tokens;
    const delta = Object.fromEntries(metricKeys.map((key) => [key, reset ? (u[key] || 0) : Math.max(0, (u[key] || 0) - (previous[key] || 0))]));
    previous = Object.fromEntries(metricKeys.map((key) => [key, u[key] || 0]));
    if (!delta.total_tokens) continue;
    if (!day || day < windowStart || day > windowEnd) continue;
    if (!usage.has(model)) usage.set(model, emptyMetrics());
    addMetrics(usage.get(model), delta);
    if (day) {
      if (!days.has(day)) days.set(day, emptyMetrics());
      addMetrics(days.get(day), delta);
    }
  } catch {}
}
// Keep the public dashboard private by default: never publish a machine hostname.
const device = process.env.AI_WORKBENCH_DEVICE || (platform() === 'darwin' ? 'mac' : platform() === 'win32' ? 'windows' : 'linux');
const serializeMetrics = (metrics) => ({
  tokens: metrics.total_tokens,
  inputTokens: metrics.input_tokens,
  cachedInputTokens: metrics.cached_input_tokens,
  outputTokens: metrics.output_tokens,
  reasoningOutputTokens: metrics.reasoning_output_tokens
});
const output = {
  schemaVersion: 2,
  windowDays,
  windowStart,
  windowEnd,
  device,
  platform: platform(),
  collectedAt: new Date().toISOString(),
  models: [...usage].map(([name, metrics]) => ({ name, ...serializeMetrics(metrics), turnCount: modelTurns.get(name) || 0 })),
  days: [...days].map(([date, metrics]) => ({ date, ...serializeMetrics(metrics) }))
};
mkdirSync('data/devices', { recursive:true }); writeFileSync(`data/devices/${device}.json`, `${JSON.stringify(output,null,2)}\n`);
console.log(`Collected ${output.models.length} model(s) from ${root} for ${windowStart}..${windowEnd}.`);
