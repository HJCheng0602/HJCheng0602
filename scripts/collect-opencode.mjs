import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const dataHome = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
const database = process.env.OPENCODE_DB || join(dataHome, 'opencode', 'opencode.db');
const sqlite = process.env.SQLITE3_BIN || 'sqlite3';
const windowDays = 183;
const windowEnd = new Date().toISOString().slice(0, 10);
const windowStartDate = new Date(`${windowEnd}T00:00:00Z`);
windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (windowDays - 1));
const windowStart = windowStartDate.toISOString().slice(0, 10);
const windowStartMs = windowStartDate.getTime();
const windowEndExclusiveMs = new Date(`${windowEnd}T00:00:00Z`).getTime() + 86_400_000;
const baseDevice = process.env.AI_WORKBENCH_DEVICE || (platform() === 'darwin' ? 'mac' : platform() === 'win32' ? 'windows' : 'linux');
const device = baseDevice.endsWith('-opencode') ? baseDevice : `${baseDevice}-opencode`;
const metricKeys = ['tokens', 'inputTokens', 'cachedInputTokens', 'cacheCreationInputTokens', 'cacheCreation5mInputTokens', 'cacheCreation1hInputTokens', 'outputTokens', 'reasoningOutputTokens'];
const emptyMetrics = () => Object.fromEntries(metricKeys.map((key) => [key, 0]));
const addMetrics = (target, source) => {
  for (const key of metricKeys) target[key] += source[key] || 0;
};
const modelAliases = new Map([
  ['deepseek/deepseek-v4-pro', 'DeepSeek-V4-Pro'],
  ['deepseek/deepseek-v4-fast', 'DeepSeek-V4-Fast'],
  ['anthropic/claude-sonnet-4-6', 'claude-sonnet-4-6'],
  ['anthropic/claude-haiku-4-5-20251001', 'claude-haiku-4-5-20251001']
]);
const normalizeModel = (provider, model) => modelAliases.get(`${provider}/${model}`.toLowerCase()) || model;

if (!existsSync(database)) {
  console.log(`OpenCode database not found; skipped OpenCode collection for ${device}.`);
  process.exit(0);
}

const query = `
SELECT
  time_created AS timeCreated,
  json_extract(data, '$.providerID') AS provider,
  json_extract(data, '$.modelID') AS model,
  coalesce(json_extract(data, '$.tokens.input'), 0) AS input,
  coalesce(json_extract(data, '$.tokens.cache.read'), 0) AS cacheRead,
  coalesce(json_extract(data, '$.tokens.cache.write'), 0) AS cacheWrite,
  coalesce(json_extract(data, '$.tokens.output'), 0) AS output,
  coalesce(json_extract(data, '$.tokens.reasoning'), 0) AS reasoning
FROM message
WHERE json_extract(data, '$.role') = 'assistant'
  AND time_created >= ${windowStartMs}
  AND time_created < ${windowEndExclusiveMs}
ORDER BY time_created, id;`;

let rows;
try {
  rows = JSON.parse(execFileSync(sqlite, ['-readonly', '-json', database, query], { encoding: 'utf8' }) || '[]');
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.warn(`OpenCode database found, but ${sqlite} is unavailable; skipped ${device}. Install sqlite3 or set SQLITE3_BIN.`);
    process.exit(0);
  }
  throw error;
}

const models = new Map();
const days = new Map();
const modelTurns = new Map();
for (const row of rows) {
  if (!row.model || !row.timeCreated) continue;
  const name = normalizeModel(row.provider || '', row.model);
  const cacheRead = Number(row.cacheRead) || 0;
  const cacheWrite = Number(row.cacheWrite) || 0;
  const reasoning = Number(row.reasoning) || 0;
  const outputTokens = (Number(row.output) || 0) + reasoning;
  const inputTokens = (Number(row.input) || 0) + cacheRead + cacheWrite;
  const metrics = {
    tokens: inputTokens + outputTokens,
    inputTokens,
    cachedInputTokens: cacheRead,
    cacheCreationInputTokens: cacheWrite,
    cacheCreation5mInputTokens: 0,
    cacheCreation1hInputTokens: 0,
    outputTokens,
    reasoningOutputTokens: reasoning
  };
  if (!metrics.tokens) continue;
  const date = new Date(Number(row.timeCreated)).toISOString().slice(0, 10);
  if (!models.has(name)) models.set(name, emptyMetrics());
  if (!days.has(date)) days.set(date, emptyMetrics());
  addMetrics(models.get(name), metrics);
  addMetrics(days.get(date), metrics);
  modelTurns.set(name, (modelTurns.get(name) || 0) + 1);
}

const snapshot = {
  schemaVersion: 3,
  windowDays,
  windowStart,
  windowEnd,
  device,
  platform: platform(),
  collectedAt: new Date().toISOString(),
  models: [...models].map(([name, metrics]) => ({ name, ...metrics, turnCount: modelTurns.get(name) || 0 })).sort((a, b) => b.tokens - a.tokens),
  days: [...days].map(([date, metrics]) => ({ date, ...metrics })).sort((a, b) => a.date.localeCompare(b.date))
};

mkdirSync('data/devices', { recursive: true });
writeFileSync(`data/devices/${device}.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Collected ${snapshot.models.length} OpenCode model(s) from ${rows.length} assistant message(s) for ${windowStart}..${windowEnd}.`);
