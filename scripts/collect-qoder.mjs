import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const MODEL_MAP = {
  q35model_preview: 'Qwen3.7-Max',
  gm51model: 'GLM-5.2',
  qmodel_latest: 'Qwen Max',
  qmodel: 'Qwen Plus',
  dfmodel: 'DeepSeek-V4-Fast',
  dmodel: 'DeepSeek-V4-Pro',
  mmodel: 'MiniMax-M3',
  kmodel_latest: 'Kimi-K3',
  kmodel: 'Kimi-K2.7-Code'
};

const windowDays = 183;
const windowEnd = new Date().toISOString().slice(0, 10);
const windowStartDate = new Date(`${windowEnd}T00:00:00Z`);
windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (windowDays - 1));
const windowStart = windowStartDate.toISOString().slice(0, 10);
const database = process.env.QODER_DB_PATH || join(homedir(), 'Library', 'Application Support', 'Qoder', 'SharedClientCache', 'cache', 'db', 'local.db');
const baseDevice = process.env.AI_WORKBENCH_DEVICE || (platform() === 'darwin' ? 'mac' : platform() === 'win32' ? 'windows' : 'linux');
const device = baseDevice.endsWith('-qoder') ? baseDevice : `${baseDevice}-qoder`;
const metricKeys = ['tokens', 'inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens'];
const emptyMetrics = () => Object.fromEntries(metricKeys.map((key) => [key, 0]));
const addMetrics = (target, delta) => {
  for (const key of metricKeys) target[key] += delta[key] || 0;
};

if (!existsSync(database)) {
  console.log(`Qoder database not found; skipped Qoder collection for ${device}.`);
  process.exit(0);
}

const query = `
  SELECT token_info, model_info, gmt_create, session_id
  FROM chat_message
  WHERE token_info IS NOT NULL AND token_info <> ''
    AND model_info IS NOT NULL AND model_info <> '';
`;
const raw = execFileSync('sqlite3', ['-readonly', '-json', database, query], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const usage = new Map();
const days = new Map();
const modelSessions = new Map();
let messages = 0;

for (const row of JSON.parse(raw || '[]')) {
  try {
    const tokenInfo = JSON.parse(row.token_info);
    const modelInfo = JSON.parse(row.model_info);
    const inputTokens = Number(tokenInfo.prompt_tokens) || 0;
    const outputTokens = Number(tokenInfo.completion_tokens) || 0;
    const cachedInputTokens = Number(tokenInfo.cached_tokens) || 0;
    const timestamp = Number(row.gmt_create);
    const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : '';
    const tokens = inputTokens + outputTokens;
    if (!tokens || !date || date < windowStart || date > windowEnd) continue;
    const key = modelInfo.model_key || 'unknown';
    const model = MODEL_MAP[key] || `Qoder · ${key}`;
    const sessionId = typeof row.session_id === 'string' ? row.session_id : '';
    const metrics = { tokens, inputTokens, cachedInputTokens, outputTokens, reasoningOutputTokens: 0 };
    if (!usage.has(model)) usage.set(model, emptyMetrics());
    if (!modelSessions.has(model)) modelSessions.set(model, new Set());
    if (sessionId) modelSessions.get(model).add(sessionId);
    if (!days.has(date)) days.set(date, emptyMetrics());
    addMetrics(usage.get(model), metrics);
    addMetrics(days.get(date), metrics);
    messages += 1;
  } catch {}
}

const output = {
  schemaVersion: 2,
  windowDays,
  windowStart,
  windowEnd,
  device,
  platform: platform(),
  collectedAt: new Date().toISOString(),
  models: [...usage].map(([name, metrics]) => ({ name, ...metrics, sessionCount: modelSessions.get(name)?.size || 0 })).sort((a, b) => b.tokens - a.tokens),
  days: [...days].map(([date, metrics]) => ({ date, ...metrics })).sort((a, b) => a.date.localeCompare(b.date))
};

mkdirSync('data/devices', { recursive: true });
writeFileSync(`data/devices/${device}.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Collected ${output.models.length} Qoder model(s) from ${messages} message(s) for ${windowStart}..${windowEnd}.`);
