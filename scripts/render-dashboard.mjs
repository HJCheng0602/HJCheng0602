import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const WINDOW_DAYS = 183;
const RATE_CARD_DATE = '2026-07-17';
const creditRates = {
  'gpt-5.6-sol': { input: 125, cached: 12.5, output: 750 },
  'gpt-5.6-terra': { input: 62.5, cached: 6.25, output: 375 },
  'gpt-5.6-luna': { input: 25, cached: 2.5, output: 150 },
  'gpt-5.5': { input: 125, cached: 12.5, output: 750 },
  'gpt-5.4': { input: 62.5, cached: 6.25, output: 375 },
  'gpt-5.4-mini': { input: 18.75, cached: 1.875, output: 113 }
};

const total = data.models.reduce((sum, model) => sum + (model.tokens || 0), 0);
const compact = (value) => value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : `${Math.round(value || 0)}`;
const compactCredits = (value) => value == null ? '—' : value >= 1000 ? `${(value / 1000).toFixed(1)}K CR` : `${value.toFixed(value >= 100 ? 0 : 1)} CR`;
const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const isoDate = (value) => value.toISOString().slice(0, 10);
const cacheRate = (item) => item?.inputTokens ? item.cachedInputTokens / item.inputTokens : 0;
const hasFullDetail = (item) => Boolean(item?.tokens) && (item.detailedTokens || 0) >= item.tokens * .999;
const estimateModelCredits = (model) => {
  const rates = creditRates[model.name];
  if (!rates || !hasFullDetail(model)) return null;
  const cached = model.cachedInputTokens || 0;
  const uncached = Math.max(0, (model.inputTokens || 0) - cached);
  return (uncached * rates.input + cached * rates.cached + (model.outputTokens || 0) * rates.output) / 1e6;
};
const estimateDetailedCredits = (model) => {
  const rates = creditRates[model.name];
  if (!rates || !(model.detailedTokens || 0)) return 0;
  const cached = model.cachedInputTokens || 0;
  const uncached = Math.max(0, (model.inputTokens || 0) - cached);
  return (uncached * rates.input + cached * rates.cached + (model.outputTokens || 0) * rates.output) / 1e6;
};
const estimateDeviceCredits = (device) => {
  if (!hasFullDetail(device) || !device.models?.length) return null;
  let sum = 0;
  for (const model of device.models) {
    const value = estimateModelCredits({ ...model, detailedTokens: model.tokens });
    if (value == null) return null;
    sum += value;
  }
  return sum;
};

function displayModels() {
  if (data.models.length <= 4) return data.models;
  const visible = data.models.slice(0, 3);
  const remainder = data.models.slice(3);
  const aggregate = {
    name: `OTHER · ${remainder.length} MODELS`,
    tokens: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    detailedTokens: 0,
    aggregate: true
  };
  let credits = 0;
  let creditsKnown = true;
  for (const model of remainder) {
    for (const key of ['tokens', 'inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens', 'detailedTokens']) aggregate[key] += model[key] || 0;
    const value = estimateModelCredits(model);
    if (value == null) creditsKnown = false;
    else credits += value;
  }
  aggregate.estimatedCredits = creditsKnown ? credits : null;
  return [...visible, aggregate];
}

function displayDevices() {
  if (data.devices.length <= 3) return data.devices;
  const visible = data.devices.slice(0, 2);
  const remainder = data.devices.slice(2);
  const models = new Map();
  const aggregate = {
    name: `OTHER · ${remainder.length} DEVICES`,
    platform: 'mixed',
    collectedAt: remainder.map((device) => device.collectedAt || '').sort().at(-1),
    tokens: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    detailedTokens: 0,
    aggregate: true
  };
  for (const device of remainder) {
    for (const key of ['tokens', 'inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens', 'detailedTokens']) aggregate[key] += device[key] || 0;
    for (const model of device.models || []) {
      if (!models.has(model.name)) models.set(model.name, { name: model.name, tokens: 0, inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, reasoningOutputTokens: 0 });
      for (const key of ['tokens', 'inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningOutputTokens']) models.get(model.name)[key] += model[key] || 0;
    }
  }
  aggregate.models = [...models.values()];
  return [...visible, aggregate];
}

function rollingWindow() {
  const values = new Map(data.days.map((day) => [day.date, day.tokens || 0]));
  const latestUsage = data.days.at(-1)?.date || '1970-01-01';
  const latestSync = data.updatedAt?.slice(0, 10) || latestUsage;
  const endKey = data.windowEnd || (latestUsage > latestSync ? latestUsage : latestSync);
  const end = new Date(`${endKey}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (WINDOW_DAYS - 1));
  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const key = isoDate(date);
    return { date: key, tokens: values.get(key) || 0, weekday: date.getUTCDay(), index };
  });
}

const days = rollingWindow();
const activeDays = days.filter((day) => day.tokens > 0).length;
const peak = days.reduce((best, day) => day.tokens > (best?.tokens || -1) ? day : best, null);
let longestStreak = 0;
let currentStreak = 0;
for (const day of days) {
  currentStreak = day.tokens > 0 ? currentStreak + 1 : 0;
  longestStreak = Math.max(longestStreak, currentStreak);
}

const detailedTokens = data.models.reduce((sum, model) => sum + (model.detailedTokens || 0), 0);
const detailedInput = data.models.reduce((sum, model) => sum + (model.inputTokens || 0), 0);
const detailedCached = data.models.reduce((sum, model) => sum + (model.cachedInputTokens || 0), 0);
const totalCredits = data.models.reduce((sum, model) => sum + estimateDetailedCredits(model), 0);
const detailCoverage = total ? detailedTokens / total : 0;

const themes = {
  dark: {
    ink: '#F0F5F1', muted: '#8B9A91', faint: '#5D6D63', panel: '#141B17', panel2: '#0F1512', stroke: '#2C3931', grid: '#223028', track: '#2A3730',
    accent: '#5FE58A', accent2: '#A9F5BD', dormantTop: '#243229', dormantRight: '#19251E', dormantLeft: '#132019',
    lowTop: '#286442', highTop: '#B8F7C9', lowRight: '#1B4A31', highRight: '#45C974', lowLeft: '#153A28', highLeft: '#2B9B58'
  },
  light: {
    ink: '#202822', muted: '#5D6D63', faint: '#89978F', panel: '#F3F8F4', panel2: '#FFFFFF', stroke: '#CCDAD0', grid: '#DCE7DF', track: '#D7E2DA',
    accent: '#169847', accent2: '#36B961', dormantTop: '#E3ECE6', dormantRight: '#D5E2D9', dormantLeft: '#CBDACF',
    lowTop: '#BDE8C8', highTop: '#29A854', lowRight: '#8FD5A3', highRight: '#16833D', lowLeft: '#73BF8C', highLeft: '#106B34'
  }
};

const hex = (value) => value.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
function mix(from, to, amount) {
  const a = hex(from); const b = hex(to);
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

function modelMark(x, y, color) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.25" stroke-linecap="round" opacity=".95">
    <path d="M0-6.4c3.4 0 6 2.2 6 5.2 0 1.5-.6 2.8-1.7 3.7"/>
    <path d="M5.6 3.2C3.9 6.1.7 7.2-2 5.8c-1.3-.7-2.1-1.9-2.3-3.3"/>
    <path d="M-5.6 3.2C-7.3.3-6.7-3.1-4-4.7c1.3-.7 2.7-.8 4.1-.3"/>
    <path d="M-3.7-1.7L0-3.9l3.7 2.2v4.3L0 4.7l-3.7-2.1z"/>
  </g>`;
}

function coords(day) {
  const firstWeekday = days[0].weekday;
  const week = Math.floor((firstWeekday + day.index) / 7);
  const x = 67 + week * 15.8 + day.weekday * 7.4;
  const y = 166 + week * 4.55 - day.weekday * 3.75;
  return { x, y, week };
}

function dayCube(theme, day, maxTokens) {
  const { x, y, week } = coords(day);
  const ratio = day.tokens ? day.tokens / maxTokens : 0;
  const intensity = Math.sqrt(ratio);
  const height = day.tokens ? 7 + Math.round(intensity * 21) : 3;
  const width = 7;
  const depth = 3.7;
  const topY = y - height;
  const top = day.tokens ? mix(theme.lowTop, theme.highTop, intensity) : theme.dormantTop;
  const right = day.tokens ? mix(theme.lowRight, theme.highRight, intensity) : theme.dormantRight;
  const left = day.tokens ? mix(theme.lowLeft, theme.highLeft, intensity) : theme.dormantLeft;
  const edge = day.tokens ? theme.accent2 : theme.stroke;
  const shimmer = day.tokens ? `<animate attributeName="opacity" values=".78;1;.86" keyTimes="0;.48;1" dur="3.4s" begin="${((week % 9) * .11).toFixed(2)}s" repeatCount="indefinite"/>` : '';
  return `<g opacity="${day.tokens ? 1 : .9}">
    <polygon points="${x},${topY} ${x + width},${topY + depth} ${x},${topY + depth * 2} ${x - width},${topY + depth}" fill="${top}" stroke="${edge}" stroke-opacity="${day.tokens ? .28 : .38}" stroke-width=".42"/>
    <polygon points="${x + width},${topY + depth} ${x + width},${y + depth} ${x},${y + depth * 2} ${x},${topY + depth * 2}" fill="${right}"/>
    <polygon points="${x},${topY + depth * 2} ${x},${y + depth * 2} ${x - width},${y + depth} ${x - width},${topY + depth}" fill="${left}"/>
    ${shimmer}
  </g>`;
}

function calendar(theme) {
  const maxTokens = Math.max(1, ...days.map((day) => day.tokens));
  const cells = [...days].sort((a, b) => coords(a).y - coords(b).y || coords(a).x - coords(b).x).map((day) => dayCube(theme, day, maxTokens)).join('');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const labels = [];
  let previousMonth = -1;
  for (const day of days) {
    const date = new Date(`${day.date}T00:00:00Z`);
    const month = date.getUTCMonth();
    if (month === previousMonth) continue;
    previousMonth = month;
    const { week } = coords(day);
    labels.push(`<text x="${72 + week * 15.8}" y="${190 + week * 4.55}" class="month">${monthNames[month]}</text>`);
  }
  let callout = '';
  if (peak?.tokens) {
    const { x, y } = coords(peak);
    const height = 7 + Math.round(Math.sqrt(peak.tokens / maxTokens) * 21);
    const labelY = y - height - 38;
    callout = `<g><line x1="${x}" y1="${y - height - 2}" x2="${x}" y2="${labelY + 22}" class="pin"/>
      <rect x="${x - 53}" y="${labelY}" width="106" height="22" rx="11" class="pill"/>
      <text x="${x}" y="${labelY + 15}" text-anchor="middle" class="peakText">${compact(peak.tokens)} · ${peak.date.slice(5)}</text></g>`;
  }
  return cells + labels.join('') + callout;
}

function modelPills(theme) {
  let x = 24;
  return data.models.slice(0, 3).map((model, index) => {
    const label = safe(model.name);
    const width = Math.max(105, 42 + label.length * 7);
    const result = `<g><rect x="${x}" y="68" width="${width}" height="23" rx="11.5" class="pill"/>
      ${modelMark(x + 16, 79.5, index ? theme.accent2 : theme.accent)}
      <text x="${x + 30}" y="83" class="pillText">${label}</text></g>`;
    x += width + 8;
    return result;
  }).join('');
}

function deviceRows(theme) {
  return displayDevices().map((device, index) => {
    const y = 423 + index * 29;
    const detailed = hasFullDetail(device);
    const rate = detailed && device.inputTokens ? `${Math.round(cacheRate(device) * 100)}%` : 'SYNC';
    const credits = compactCredits(estimateDeviceCredits(device));
    const share = total ? device.tokens / total : 0;
    const platform = device.platform === 'darwin' ? 'MAC' : device.platform === 'win32' ? 'WIN' : device.platform === 'mixed' ? 'MIXED' : 'LINUX';
    return `<g>
      <circle cx="48" cy="${y - 4}" r="4" fill="${index ? theme.accent2 : theme.accent}"/>
      <text x="60" y="${y}" class="device">${safe(device.name)}</text>
      <text x="60" y="${y + 11}" class="rowMeta">${platform} · ${device.aggregate ? 'OVERFLOW GROUP' : detailed ? 'DETAIL READY' : 'RESYNC FOR DETAILS'}</text>
      <text x="326" y="${y}" text-anchor="end" class="numberStrong">${compact(device.tokens)}</text>
      <rect x="350" y="${y - 8}" width="102" height="6" rx="3" class="track"/>
      <rect x="350" y="${y - 8}" width="${Math.max(3, Math.round(102 * share))}" height="6" rx="3" fill="${index ? theme.accent2 : theme.accent}"/>
      <text x="480" y="${y}" text-anchor="end" class="numberStrong">${Math.round(share * 100)}%</text>
      <text x="590" y="${y}" text-anchor="end" class="numberStrong">${rate}</text>
      <text x="704" y="${y}" text-anchor="end" class="numberStrong">${credits}</text>
      <text x="796" y="${y}" text-anchor="end" class="number">${device.collectedAt?.slice(5, 10) || '—'}</text>
    </g>`;
  }).join('');
}

function modelRows(theme) {
  if (!data.models.length) return `<text x="44" y="596" class="empty">NO MODEL DATA — SYNC CODEX CLI TO BEGIN</text>`;
  return displayModels().map((model, index) => {
    const y = 580 + index * 31;
    const detailed = hasFullDetail(model);
    const rate = detailed && model.inputTokens ? `${Math.round(cacheRate(model) * 100)}%` : 'SYNC';
    const credits = compactCredits(model.aggregate ? model.estimatedCredits : estimateModelCredits(model));
    const color = index ? theme.accent2 : theme.accent;
    return `<g>
      ${modelMark(50, y - 4, color)}
      <text x="66" y="${y}" class="model">${safe(model.name)}</text>
      <text x="66" y="${y + 11}" class="rowMeta">${Math.round(total ? model.tokens / total * 100 : 0)}% SHARE · ${model.aggregate ? 'OVERFLOW GROUP' : `REASON ${detailed ? compact(model.reasoningOutputTokens) : '—'}`}</text>
      <text x="316" y="${y}" text-anchor="end" class="numberStrong">${compact(model.tokens)}</text>
      <text x="414" y="${y}" text-anchor="end" class="number">${detailed ? compact(model.inputTokens) : '—'}</text>
      <text x="508" y="${y}" text-anchor="end" class="number">${detailed ? compact(model.cachedInputTokens) : '—'}</text>
      <text x="596" y="${y}" text-anchor="end" class="number">${detailed ? compact(model.outputTokens) : '—'}</text>
      <text x="682" y="${y}" text-anchor="end" class="numberStrong">${rate}</text>
      <text x="796" y="${y}" text-anchor="end" class="numberStrong">${credits}</text>
    </g>`;
  }).join('');
}

function render(mode) {
  const theme = themes[mode];
  const latest = data.updatedAt ? data.updatedAt.slice(0, 10) : 'SYNC PENDING';
  const coverageLabel = `${Math.round(detailCoverage * 100)}%`;
  const cacheLabel = detailedInput ? `${Math.round(detailedCached / detailedInput * 100)}%` : '—';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="750" viewBox="0 0 840 750" role="img" aria-label="HJ Cheng six month AI coding and token economy dashboard">
  <style>
    text{font-family:'Cascadia Code','JetBrains Mono','SFMono-Regular',Consolas,monospace}
    .title{font-size:20px;font-weight:760;letter-spacing:2.2px;fill:${theme.ink}}
    .eyebrow{font-size:9px;font-weight:700;letter-spacing:1.55px;fill:${theme.muted}}
    .hero{font-size:36px;font-weight:780;letter-spacing:-2px;fill:${theme.accent}}
    .heroUnit{font-size:14px;font-weight:720;letter-spacing:-.25px;fill:${theme.accent}}
    .muted{font-size:9px;font-weight:600;letter-spacing:.55px;fill:${theme.muted}}
    .pillText{font-size:9.5px;font-weight:700;fill:${theme.ink}}
    .stat{font-size:19px;font-weight:770;fill:${theme.ink}}
    .statLabel{font-size:7.5px;font-weight:700;letter-spacing:.8px;fill:${theme.muted}}
    .month{font-size:8px;font-weight:650;letter-spacing:.5px;fill:${theme.muted}}
    .peakText{font-size:9px;font-weight:750;fill:${theme.ink}}
    .section{font-size:12px;font-weight:780;letter-spacing:1px;fill:${theme.ink}}
    .device,.model{font-size:10.5px;font-weight:750;fill:${theme.ink}}
    .rowMeta{font-size:7px;font-weight:650;letter-spacing:.45px;fill:${theme.faint}}
    .number{font-size:9.5px;font-weight:650;fill:${theme.muted}}
    .numberStrong{font-size:10px;font-weight:760;fill:${theme.ink}}
    .empty{font-size:10px;font-weight:650;letter-spacing:.5px;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .panel2{fill:${theme.panel2};stroke:${theme.stroke};stroke-width:1}
    .pill{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .track{fill:${theme.track}}
    .pin{stroke:${theme.accent2};stroke-width:1.2;stroke-opacity:.78}
    .grid{stroke:${theme.grid};stroke-width:1}
    @media(prefers-reduced-motion:reduce){animate{display:none}}
  </style>

  <text x="24" y="31" class="title">VIBE CODING STATS</text>
  <text x="24" y="51" class="eyebrow">CODEX CLI · MULTI-DEVICE LEDGER · @HJCHENG0602</text>
  <text x="816" y="40" class="hero" text-anchor="end">${compact(total)}<tspan class="heroUnit"> TOKENS</tspan></text>
  <text x="816" y="58" class="muted" text-anchor="end">ROLLING 6 MONTHS · ${latest}</text>

  ${modelPills(theme)}
  <text x="24" y="116" class="eyebrow">ROLLING 6 MONTHS · ONE CUBE PER DAY</text>
  <text x="24" y="132" class="muted">HEIGHT + GREEN INTENSITY = DAILY TOKEN VOLUME</text>
  <g>${calendar(theme)}</g>

  <rect x="602" y="83" width="214" height="207" rx="13" class="panel"/>
  <text x="621" y="108" class="section">TOKEN ECONOMY</text>
  <text x="797" y="108" text-anchor="end" class="statLabel">DETAIL ${coverageLabel}</text>
  <line x1="621" y1="120" x2="797" y2="120" class="grid"/>
  <text x="621" y="150" class="stat">${activeDays}d</text><text x="621" y="168" class="statLabel">ACTIVE / 6MO</text>
  <text x="692" y="150" class="stat">${longestStreak}d</text><text x="692" y="168" class="statLabel">STREAK</text>
  <text x="768" y="150" class="stat">${data.devices.length}</text><text x="768" y="168" class="statLabel">DEVICES</text>
  <line x1="621" y1="183" x2="797" y2="183" class="grid"/>
  <text x="621" y="209" class="stat">${cacheLabel}</text><text x="621" y="227" class="statLabel">CACHE HIT</text>
  <text x="797" y="209" text-anchor="end" class="stat">${compactCredits(totalCredits)}</text><text x="797" y="227" text-anchor="end" class="statLabel">EST. COST</text>
  <rect x="621" y="246" width="176" height="6" rx="3" class="track"/>
  <rect x="621" y="246" width="${Math.round(176 * detailCoverage)}" height="6" rx="3" fill="${theme.accent}"/>
  <text x="621" y="272" class="statLabel">PRICED DETAIL COVERAGE</text><text x="797" y="272" text-anchor="end" class="statLabel">${coverageLabel}</text>

  <text x="501" y="326" class="month">NONE</text>
  <rect x="534" y="320" width="72" height="6" rx="3" fill="url(#greenLegend)"/>
  <text x="613" y="326" class="month">PEAK</text>
  <defs><linearGradient id="greenLegend"><stop stop-color="${theme.dormantTop}"/><stop offset=".28" stop-color="${theme.lowTop}"/><stop offset="1" stop-color="${theme.highTop}"/></linearGradient></defs>

  <rect x="24" y="350" width="792" height="145" rx="13" class="panel"/>
  <text x="44" y="377" class="section">DEVICE LEDGER</text>
  <text x="796" y="377" text-anchor="end" class="eyebrow">${data.devices.length > 3 ? `TOP 2 + ${data.devices.length - 2} IN OTHER` : `${data.devices.length} DEVICES`} · CACHE · COST</text>
  <line x1="44" y1="389" x2="796" y2="389" class="grid"/>
  <text x="60" y="405" class="statLabel">DEVICE / SOURCE</text>
  <text x="326" y="405" text-anchor="end" class="statLabel">TOKENS</text>
  <text x="480" y="405" text-anchor="end" class="statLabel">SHARE</text>
  <text x="590" y="405" text-anchor="end" class="statLabel">CACHE HIT</text>
  <text x="704" y="405" text-anchor="end" class="statLabel">EST. CREDITS</text>
  <text x="796" y="405" text-anchor="end" class="statLabel">SYNC</text>
  ${deviceRows(theme)}

  <rect x="24" y="509" width="792" height="202" rx="13" class="panel"/>
  <text x="44" y="536" class="section">MODEL ECONOMY</text>
  <text x="796" y="536" text-anchor="end" class="eyebrow">${data.models.length > 4 ? `TOP 3 + ${data.models.length - 3} IN OTHER` : `${data.models.length} MODELS`} · INPUT · CACHE · OUTPUT</text>
  <line x1="44" y1="548" x2="796" y2="548" class="grid"/>
  <text x="66" y="564" class="statLabel">MODEL / SHARE</text>
  <text x="316" y="564" text-anchor="end" class="statLabel">TOKENS</text>
  <text x="414" y="564" text-anchor="end" class="statLabel">INPUT*</text>
  <text x="508" y="564" text-anchor="end" class="statLabel">CACHED</text>
  <text x="596" y="564" text-anchor="end" class="statLabel">OUTPUT</text>
  <text x="682" y="564" text-anchor="end" class="statLabel">CACHE</text>
  <text x="796" y="564" text-anchor="end" class="statLabel">EST. CREDITS</text>
  ${modelRows(theme)}
  <line x1="44" y1="688" x2="796" y2="688" class="grid"/>
  <text x="44" y="703" class="rowMeta">* CACHED IS A SUBSET OF INPUT · REASONING IS INCLUDED IN OUTPUT · CREDITS USE CODEX RATE CARD ${RATE_CARD_DATE}</text>

  <text x="24" y="739" class="eyebrow">6 MONTHS · LOCAL-ONLY AGGREGATES · TRANSPARENT SVG · LIVE MOTION</text>
  <text x="816" y="739" class="eyebrow" text-anchor="end">BUILD THE SYSTEM</text>
  </svg>`;
}

mkdirSync('assets', { recursive: true });
const darkSvg = render('dark').replace(/[ \t]+$/gm, '');
const lightSvg = render('light').replace(/[ \t]+$/gm, '');
writeFileSync('assets/token-terrain-dark.svg', darkSvg);
writeFileSync('assets/token-terrain-light.svg', lightSvg);
writeFileSync('assets/year-grid-dark.svg', darkSvg);
writeFileSync('assets/year-grid-light.svg', lightSvg);
console.log(`Rendered 6-month token dashboard: ${compact(total)} tokens, ${activeDays} active days, ${Math.round(detailCoverage * 100)}% detailed.`);
