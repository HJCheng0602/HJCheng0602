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
    sourceNames: remainder.map((model) => model.name),
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

const visibleModels = displayModels();

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
    ink: '#EAF2FF', muted: '#A1B2C9', faint: '#7488A3', panel: '#151C27', panel2: '#101722', stroke: '#3B4F6A', grid: '#2D4058', track: '#2A3C54',
    accent: '#58A6FF', accent2: '#7EE7F5', dormantTop: '#33465E', dormantRight: '#24364D', dormantLeft: '#1B2B40',
    lowTop: '#3979D3', highTop: '#C2E3FF', lowRight: '#255EAE', highRight: '#4C9EFF', lowLeft: '#1C4B92', highLeft: '#357FD8'
  },
  light: {
    ink: '#17243A', muted: '#526A87', faint: '#7B90AA', panel: '#F4F8FE', panel2: '#FFFFFF', stroke: '#BDCCE1', grid: '#D8E3F1', track: '#D4E0EF',
    accent: '#0969DA', accent2: '#087EA4', dormantTop: '#DCE7F5', dormantRight: '#CDDCEE', dormantLeft: '#C1D3E8',
    lowTop: '#A8C9F5', highTop: '#3687E8', lowRight: '#7FAFE9', highRight: '#1769C8', lowLeft: '#6398D9', highLeft: '#0D58B7'
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
  const delay = Math.min(1.3, .1 + day.index * .007).toFixed(2);
  return `<g class="cube${day.tokens ? ' liveCube' : ''}" style="animation-delay:${delay}s">
    <polygon points="${x},${topY} ${x + width},${topY + depth} ${x},${topY + depth * 2} ${x - width},${topY + depth}" fill="${top}" stroke="${edge}" stroke-opacity="${day.tokens ? .28 : .38}" stroke-width=".42"/>
    <polygon points="${x + width},${topY + depth} ${x + width},${y + depth} ${x},${y + depth * 2} ${x},${topY + depth * 2}" fill="${right}"/>
    <polygon points="${x},${topY + depth * 2} ${x},${y + depth * 2} ${x - width},${y + depth} ${x - width},${topY + depth}" fill="${left}"/>
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
    callout = `<g class="beacon"><line x1="${x}" y1="${y - height - 2}" x2="${x}" y2="${labelY + 22}" class="pin"/>
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
    const result = `<g class="intro tag" style="animation-delay:${(.2 + index * .08).toFixed(2)}s"><rect x="${x}" y="68" width="${width}" height="23" rx="11.5" class="pill"/>
      ${modelMark(x + 16, 79.5, index ? theme.accent2 : theme.accent)}
      <text x="${x + 30}" y="83" class="pillText">${label}</text></g>`;
    x += width + 8;
    return result;
  }).join('');
}

function modelDeviceSplit(theme, model, y) {
  const names = new Set(model.sourceNames || [model.name]);
  const entries = data.devices.map((device) => ({
    name: device.name,
    tokens: (device.models || []).reduce((sum, item) => sum + (names.has(item.name) ? item.tokens || 0 : 0), 0)
  })).filter((entry) => entry.tokens > 0).sort((a, b) => b.tokens - a.tokens);
  const totalTokens = entries.reduce((sum, entry) => sum + entry.tokens, 0);
  const listed = entries.length > 2
    ? [entries[0], { name: `OTHER ${entries.length - 1}`, tokens: entries.slice(1).reduce((sum, entry) => sum + entry.tokens, 0) }]
    : entries;
  const x = 204;
  const width = 146;
  if (!listed.length || !totalTokens) return `<g class="deviceSplit"><rect x="${x}" y="${y - 17}" width="${width}" height="34" rx="6" class="splitPanel"/><text x="${x + 9}" y="${y + 5}" class="splitLabel">NO DEVICE DATA</text></g>`;
  let offset = 0;
  const segments = listed.map((entry, index) => {
    const segmentWidth = index === listed.length - 1 ? 128 - offset : Math.round(128 * entry.tokens / totalTokens);
    const result = `<rect x="${x + 9 + offset}" y="${y - 11}" width="${Math.max(1, segmentWidth)}" height="4" rx="2" fill="${index ? theme.accent2 : theme.accent}"/>`;
    offset += segmentWidth;
    return result;
  }).join('');
  const line = (entry, lineY) => `<text x="${x + 9}" y="${lineY}" class="splitLabel">${safe(entry.name)}</text><text x="${x + 137}" y="${lineY}" text-anchor="end" class="splitLabel">${Math.round(entry.tokens / totalTokens * 100)}%</text>`;
  return `<g class="deviceSplit"><rect x="${x}" y="${y - 17}" width="${width}" height="34" rx="6" class="splitPanel"/><rect x="${x + 9}" y="${y - 11}" width="128" height="4" rx="2" class="track"/>${segments}${line(listed[0], y + 3)}${listed[1] ? line(listed[1], y + 14) : ''}</g>`;
}

function modelRows(theme, startY) {
  if (!visibleModels.length) return `<text x="44" y="${startY}" class="empty">NO MODEL DATA — SYNC CODEX CLI TO BEGIN</text>`;
  return visibleModels.map((model, index) => {
    const y = startY + index * 42;
    const detailed = hasFullDetail(model);
    const rate = detailed && model.inputTokens ? `${Math.round(cacheRate(model) * 100)}%` : 'SYNC';
    const credits = compactCredits(model.aggregate ? model.estimatedCredits : estimateModelCredits(model));
    return `<g class="mrow" style="animation-delay:${(1.28 + index * .1).toFixed(2)}s">
      ${modelMark(50, y - 4, theme.accent)}
      <text x="68" y="${y}" class="model">${safe(model.name)}</text>
      <text x="68" y="${y + 14}" class="rowMeta">${Math.round(total ? model.tokens / total * 100 : 0)}% SHARE · ${model.aggregate ? 'OVERFLOW GROUP' : detailed ? `REASON ${compact(model.reasoningOutputTokens)}` : 'RESYNC FOR DETAILS'}</text>
      ${modelDeviceSplit(theme, model, y)}
      <text x="470" y="${y + 5}" text-anchor="end" class="numberStrong">${compact(model.tokens)}</text>
      <text x="610" y="${y + 5}" text-anchor="end" class="numberStrong">${rate}</text>
      <text x="796" y="${y}" text-anchor="end" class="numberStrong">${credits}</text>
    </g>`;
  }).join('');
}

function render(mode) {
  const theme = themes[mode];
  const latest = data.updatedAt ? data.updatedAt.slice(0, 10) : 'SYNC PENDING';
  const coverageLabel = `${Math.round(detailCoverage * 100)}%`;
  const cacheLabel = detailedInput ? `${Math.round(detailedCached / detailedInput * 100)}%` : '—';
  const tableTop = 348;
  const modelStartY = 438;
  const modelLastBottom = modelStartY + Math.max(visibleModels.length - 1, 0) * 42 + 17;
  const tableRuleY = modelLastBottom + 12;
  const tableNoteY = tableRuleY + 17;
  const tableBottom = tableNoteY + 17;
  const footerY = tableBottom + 38;
  const dashboardHeight = footerY + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="${dashboardHeight}" viewBox="0 0 840 ${dashboardHeight}" role="img" aria-label="HJ Cheng six month AI coding and token economy dashboard">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .title{font-size:22px;font-weight:700;fill:${theme.ink}}
    .eyebrow{font-size:10px;font-weight:700;fill:${theme.muted}}
    .hero{font-size:40px;font-weight:700;fill:${theme.accent}}
    .heroUnit{font-size:12px;font-weight:700;fill:${theme.accent}}
    .muted{font-size:10px;font-weight:600;fill:${theme.muted}}
    .pillText{font-size:10px;font-weight:700;fill:${theme.ink}}
    .stat{font-size:23px;font-weight:700;fill:${theme.ink}}
    .statLabel{font-size:9px;font-weight:700;fill:${theme.muted}}
    .month{font-size:9px;font-weight:700;fill:${theme.muted}}
    .peakText{font-size:10px;font-weight:700;fill:${theme.ink}}
    .section{font-size:13px;font-weight:700;fill:${theme.ink}}
    .model{font-size:13px;font-weight:700;fill:${theme.ink}}
    .rowMeta{font-size:8.5px;font-weight:600;fill:${theme.faint}}
    .splitLabel{font-size:8px;font-weight:700;fill:${theme.muted}}
    .numberStrong{font-size:14px;font-weight:700;fill:${theme.ink}}
    .empty{font-size:11px;font-weight:600;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .panelHighlight{fill:none;stroke:url(#panelGlow);stroke-width:1}
    .splitPanel{fill:${theme.panel2};stroke:${theme.stroke};stroke-width:1}
    .pill{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .track{fill:${theme.track}}
    .pin{stroke:${theme.accent2};stroke-width:1.4;stroke-opacity:.9}
    .grid{stroke:${theme.grid};stroke-width:1}
    .intro,.panelIn,.mrow{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .terrainIn{animation:fadeIn 600ms ease-out 240ms both}
    .cube{transform-box:fill-box;transform-origin:50% 100%;animation:rise 560ms cubic-bezier(.2,.9,.3,1) both}
    .meterFill{transform-box:fill-box;transform-origin:0% 50%;animation:growX 620ms cubic-bezier(.22,1,.36,1) 780ms both}
    .beacon{transform-box:fill-box;transform-origin:50% 50%;animation:fadeIn 500ms ease-out 1.35s both,pulse 4.2s ease-in-out 2s infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes rise{0%{opacity:0;transform:scaleY(0)}35%{opacity:1}100%{opacity:1;transform:scaleY(1)}}
    @keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes pulse{0%,100%{opacity:.82}50%{opacity:1}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <defs>
    <linearGradient id="panelGlow" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}" stop-opacity=".46"/><stop offset=".45" stop-color="${theme.accent2}" stop-opacity=".05"/><stop offset="1" stop-color="${theme.accent2}" stop-opacity=".28"/></linearGradient>
    <linearGradient id="greenLegend"><stop stop-color="${theme.dormantTop}"/><stop offset=".3" stop-color="${theme.lowTop}"/><stop offset="1" stop-color="${theme.highTop}"/></linearGradient>
  </defs>

  <g class="intro"><text x="24" y="32" class="title">VIBE CODING STATS</text><text x="24" y="54" class="eyebrow">CODEX CLI | MULTI-DEVICE LEDGER | @HJCHENG0602</text></g>
  <g class="intro" style="animation-delay:.08s"><text x="816" y="43" class="hero" text-anchor="end">${compact(total)}<tspan class="heroUnit"> TOKENS</tspan></text><text x="816" y="62" class="muted" text-anchor="end">ROLLING 6 MONTHS | ${latest}</text></g>

  ${modelPills(theme)}
  <g class="terrainIn"><text x="24" y="116" class="eyebrow">6-MONTH WINDOW | ONE CUBE PER DAY</text><text x="24" y="133" class="muted">HEIGHT AND COLOR SHOW DAILY TOKEN VOLUME</text><g>${calendar(theme)}</g></g>

  <g class="panelIn" style="animation-delay:.38s"><rect x="580" y="98" width="236" height="192" rx="12" class="panel"/><rect x="581" y="99" width="234" height="190" rx="11" class="panelHighlight"/>
    <text x="602" y="126" class="section">TOKEN ECONOMY</text><text x="797" y="126" text-anchor="end" class="statLabel">DETAIL ${coverageLabel}</text>
    <line x1="602" y1="141" x2="797" y2="141" class="grid"/>
    <text x="602" y="171" class="stat">${activeDays}d</text><text x="602" y="188" class="statLabel">ACTIVE DAYS</text>
    <text x="676" y="171" class="stat">${longestStreak}d</text><text x="676" y="188" class="statLabel">STREAK</text>
    <text x="752" y="171" class="stat">${data.devices.length}</text><text x="752" y="188" class="statLabel">DEVICES</text>
    <line x1="602" y1="201" x2="797" y2="201" class="grid"/>
    <text x="602" y="230" class="stat">${cacheLabel}</text><text x="602" y="247" class="statLabel">CACHE HIT</text>
    <text x="797" y="230" text-anchor="end" class="stat">${compactCredits(totalCredits)}</text><text x="797" y="247" text-anchor="end" class="statLabel">EST. COST</text>
    <rect x="602" y="261" width="195" height="8" rx="4" class="track"/><rect x="602" y="261" width="${Math.round(195 * detailCoverage)}" height="8" rx="4" fill="${theme.accent}" class="meterFill"/>
    <text x="602" y="281" class="statLabel">PRICED DETAIL COVERAGE</text><text x="797" y="281" text-anchor="end" class="statLabel">${coverageLabel}</text></g>

  <text x="494" y="326" class="month">LOW</text><rect x="528" y="320" width="76" height="7" rx="3.5" fill="url(#greenLegend)"/><text x="612" y="326" class="month">PEAK</text>

  <g class="panelIn" style="animation-delay:.8s"><rect x="24" y="${tableTop}" width="792" height="${tableBottom - tableTop}" rx="12" class="panel"/><rect x="25" y="${tableTop + 1}" width="790" height="${tableBottom - tableTop - 2}" rx="11" class="panelHighlight"/>
  <text x="44" y="376" class="section">MODEL ECONOMY</text>
  <text x="796" y="376" text-anchor="end" class="eyebrow">${visibleModels.length} MODELS | PER-MODEL DEVICE SPLIT</text>
  <line x1="44" y1="392" x2="796" y2="392" class="grid"/>
  <text x="68" y="409" class="statLabel">MODEL / SHARE</text>
  <text x="204" y="409" class="statLabel">DEVICE SPLIT</text>
  <text x="470" y="409" text-anchor="end" class="statLabel">TOKENS</text>
  <text x="610" y="409" text-anchor="end" class="statLabel">CACHE HIT</text>
  <text x="796" y="409" text-anchor="end" class="statLabel">EST. COST</text>
  ${modelRows(theme, modelStartY)}
  <line x1="44" y1="${tableRuleY}" x2="796" y2="${tableRuleY}" class="grid"/>
  <text x="44" y="${tableNoteY}" class="rowMeta">DEVICE SPLIT SHOWS EACH MODEL'S TOKEN SHARE BY DEVICE | EST. COST USES CODEX RATE CARD ${RATE_CARD_DATE}</text></g>

  <text x="24" y="${footerY}" class="eyebrow">6 MONTHS | LOCAL-ONLY AGGREGATES | LIVE SVG</text>
  <text x="816" y="${footerY}" class="eyebrow" text-anchor="end">BUILD THE SYSTEM</text>
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
