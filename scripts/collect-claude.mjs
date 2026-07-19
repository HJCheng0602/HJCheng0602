import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const claudeHome = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const root = join(claudeHome, 'projects');
const windowDays = 183;
const windowEnd = new Date().toISOString().slice(0, 10);
const windowStartDate = new Date(`${windowEnd}T00:00:00Z`);
windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (windowDays - 1));
const windowStart = windowStartDate.toISOString().slice(0, 10);
const baseDevice = process.env.AI_WORKBENCH_DEVICE || (platform() === 'darwin' ? 'mac' : platform() === 'win32' ? 'windows' : 'linux');
const device = baseDevice.endsWith('-claude') ? baseDevice : `${baseDevice}-claude`;
const metricKeys = ['tokens', 'inputTokens', 'cachedInputTokens', 'cacheCreationInputTokens', 'cacheCreation5mInputTokens', 'cacheCreation1hInputTokens', 'outputTokens', 'reasoningOutputTokens'];
const emptyMetrics = () => Object.fromEntries(metricKeys.map((key) => [key, 0]));
const addMetrics = (target, source) => {
  for (const key of metricKeys) target[key] += source[key] || 0;
};
function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
}

if (!existsSync(root)) {
  console.log(`Claude projects directory not found; skipped Claude collection for ${device}.`);
  process.exit(0);
}

const usage = new Map();
const days = new Map();
const modelTurns = new Map();
const seenRequests = new Set();
let duplicateRecords = 0;

for (const file of walk(root).filter((path) => path.endsWith('.jsonl'))) {
  let lineNumber = 0;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    lineNumber += 1;
    if (!line) continue;
    try {
      const event = JSON.parse(line);
      const apiUsage = event.message?.usage;
      const model = event.message?.model;
      const date = event.timestamp?.slice(0, 10);
      if (!apiUsage || !model || model === '<synthetic>' || !date || date < windowStart || date > windowEnd) continue;
      const requestKey = event.requestId || (event.message?.id ? `${event.sessionId || ''}:${event.message.id}` : event.uuid || `${file}:${lineNumber}`);
      if (seenRequests.has(requestKey)) {
        duplicateRecords += 1;
        continue;
      }
      seenRequests.add(requestKey);

      const baseInput = Number(apiUsage.input_tokens) || 0;
      const cacheRead = Number(apiUsage.cache_read_input_tokens) || 0;
      const declaredCreation = Number(apiUsage.cache_creation_input_tokens) || 0;
      let cacheCreation5m = Number(apiUsage.cache_creation?.ephemeral_5m_input_tokens) || 0;
      const cacheCreation1h = Number(apiUsage.cache_creation?.ephemeral_1h_input_tokens) || 0;
      cacheCreation5m += Math.max(0, declaredCreation - cacheCreation5m - cacheCreation1h);
      const outputTokens = Number(apiUsage.output_tokens) || 0;
      const inputTokens = baseInput + cacheCreation5m + cacheCreation1h + cacheRead;
      const metrics = {
        tokens: inputTokens + outputTokens,
        inputTokens,
        cachedInputTokens: cacheRead,
        cacheCreationInputTokens: cacheCreation5m + cacheCreation1h,
        cacheCreation5mInputTokens: cacheCreation5m,
        cacheCreation1hInputTokens: cacheCreation1h,
        outputTokens,
        reasoningOutputTokens: 0
      };
      if (!metrics.tokens) continue;
      if (!usage.has(model)) usage.set(model, emptyMetrics());
      if (!days.has(date)) days.set(date, emptyMetrics());
      addMetrics(usage.get(model), metrics);
      addMetrics(days.get(date), metrics);
      modelTurns.set(model, (modelTurns.get(model) || 0) + 1);
    } catch {}
  }
}

const output = {
  schemaVersion: 3,
  windowDays,
  windowStart,
  windowEnd,
  device,
  platform: platform(),
  collectedAt: new Date().toISOString(),
  models: [...usage].map(([name, metrics]) => ({ name, ...metrics, turnCount: modelTurns.get(name) || 0 })).sort((a, b) => b.tokens - a.tokens),
  days: [...days].map(([date, metrics]) => ({ date, ...metrics })).sort((a, b) => a.date.localeCompare(b.date))
};

mkdirSync('data/devices', { recursive: true });
writeFileSync(`data/devices/${device}.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Collected ${output.models.length} Claude model(s) from ${seenRequests.size} unique request(s); ignored ${duplicateRecords} duplicate transcript record(s) for ${windowStart}..${windowEnd}.`);
