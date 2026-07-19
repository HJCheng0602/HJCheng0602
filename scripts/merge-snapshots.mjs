import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const directory = 'data/devices';
const files = existsSync(directory) ? readdirSync(directory).filter((file) => file.endsWith('.json')).sort() : [];
const snapshots = files.map((file) => JSON.parse(readFileSync(`${directory}/${file}`, 'utf8')));
const metricKeys = ['tokens', 'inputTokens', 'cachedInputTokens', 'cacheCreationInputTokens', 'cacheCreation5mInputTokens', 'cacheCreation1hInputTokens', 'outputTokens', 'reasoningOutputTokens'];
const emptyMetrics = () => Object.fromEntries(metricKeys.map((key) => [key, 0]));
const addMetrics = (target, source) => {
  for (const key of metricKeys) target[key] += source[key] || 0;
};

const models = new Map();
const days = new Map();
const devices = snapshots.map((snapshot) => {
  const totals = emptyMetrics();
  let detailedTokens = 0;
  for (const model of snapshot.models || []) {
    const detailed = Object.hasOwn(model, 'inputTokens');
    if (!models.has(model.name)) models.set(model.name, { name: model.name, ...emptyMetrics(), detailedTokens: 0, turnCount: 0, turnCountComplete: true });
    addMetrics(models.get(model.name), model);
    models.get(model.name).turnCount += model.turnCount || 0;
    models.get(model.name).turnCountComplete &&= Object.hasOwn(model, 'turnCount');
    addMetrics(totals, model);
    if (detailed) {
      models.get(model.name).detailedTokens += model.tokens || 0;
      detailedTokens += model.tokens || 0;
    }
  }
  for (const day of snapshot.days || []) {
    if (!days.has(day.date)) days.set(day.date, { date: day.date, ...emptyMetrics() });
    addMetrics(days.get(day.date), day);
  }
  return {
    name: snapshot.device,
    platform: snapshot.platform,
    collectedAt: snapshot.collectedAt,
    ...totals,
    detailedTokens,
    models: snapshot.models || []
  };
});

const windowDays = 183;
const windowEnd = snapshots.map((snapshot) => snapshot.windowEnd || snapshot.collectedAt?.slice(0, 10) || '').sort().at(-1) || new Date().toISOString().slice(0, 10);
const windowStartDate = new Date(`${windowEnd}T00:00:00Z`);
windowStartDate.setUTCDate(windowStartDate.getUTCDate() - (windowDays - 1));

const output = {
  schemaVersion: 2,
  windowDays,
  windowStart: windowStartDate.toISOString().slice(0, 10),
  windowEnd,
  updatedAt: new Date().toISOString(),
  devices: devices.sort((a, b) => b.tokens - a.tokens),
  models: [...models.values()].sort((a, b) => b.tokens - a.tokens),
  days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
};

writeFileSync('data/usage.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Merged ${devices.length} device snapshot(s) into data/usage.json.`);
