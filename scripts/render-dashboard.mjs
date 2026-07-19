import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const pricing = JSON.parse(readFileSync('data/api-pricing.json', 'utf8'));
const WINDOW_DAYS = 183;
const RATE_CARD_DATE = pricing.asOf;
const apiRates = pricing.models;

const total = data.models.reduce((sum, model) => sum + (model.tokens || 0), 0);
const compact = (value) => value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : `${Math.round(value || 0)}`;
const compactUsd = (value) => value == null ? 'N/A' : value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : value >= 100 ? `$${Math.round(value)}` : value >= 10 ? `$${value.toFixed(1)}` : `$${value.toFixed(2)}`;
const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const isoDate = (value) => value.toISOString().slice(0, 10);
const cacheRate = (item) => item?.inputTokens ? item.cachedInputTokens / item.inputTokens : 0;
const hasFullDetail = (item) => Boolean(item?.tokens) && (item.detailedTokens || 0) >= item.tokens * .999;
const costFromMetrics = (model, rates) => {
  const cacheRead = model.cachedInputTokens || 0;
  const cacheWrite5m = model.cacheCreation5mInputTokens || 0;
  const cacheWrite1h = model.cacheCreation1hInputTokens || 0;
  const cacheCreation = model.cacheCreationInputTokens || cacheWrite5m + cacheWrite1h;
  const unclassifiedWrite = Math.max(0, cacheCreation - cacheWrite5m - cacheWrite1h);
  const baseInput = Math.max(0, (model.inputTokens || 0) - cacheRead - cacheCreation);
  return (
    baseInput * rates.input
    + cacheRead * rates.cachedInput
    + cacheWrite5m * (rates.cacheWrite5m ?? rates.input)
    + cacheWrite1h * (rates.cacheWrite1h ?? rates.input)
    + unclassifiedWrite * (rates.cacheWrite5m ?? rates.input)
    + (model.outputTokens || 0) * rates.output
  ) / 1e6;
};
const estimateModelCostUsd = (model) => {
  const rates = apiRates[model.name];
  if (!rates || !hasFullDetail(model)) return null;
  return costFromMetrics(model, rates);
};
const estimateDetailedCostUsd = (model) => {
  const rates = apiRates[model.name];
  if (!rates || !(model.detailedTokens || 0)) return 0;
  return costFromMetrics(model, rates);
};
function displayModels() {
  if (data.models.length <= 8) return data.models;
  const overflow = data.models.slice(7);
  const metricKeys = ['tokens', 'inputTokens', 'cachedInputTokens', 'cacheCreationInputTokens', 'cacheCreation5mInputTokens', 'cacheCreation1hInputTokens', 'outputTokens', 'reasoningOutputTokens', 'detailedTokens', 'turnCount'];
  const aggregate = Object.fromEntries(metricKeys.map((key) => [key, overflow.reduce((sum, model) => sum + (model[key] || 0), 0)]));
  const allPriced = overflow.every((model) => apiRates[model.name] && hasFullDetail(model));
  return [...data.models.slice(0, 7), {
    name: `OTHER · ${overflow.length} MODELS`,
    ...aggregate,
    aggregate: true,
    estimatedCostUsd: allPriced ? overflow.reduce((sum, model) => sum + estimateModelCostUsd(model), 0) : null,
    turnCountComplete: overflow.every((model) => model.turnCountComplete),
    sourceNames: overflow.map((model) => model.name)
  }];
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

const detailedInput = data.models.reduce((sum, model) => sum + (model.inputTokens || 0), 0);
const detailedCached = data.models.reduce((sum, model) => sum + (model.cachedInputTokens || 0), 0);
const pricedDetailedTokens = data.models.reduce((sum, model) => sum + (apiRates[model.name] ? model.detailedTokens || 0 : 0), 0);
const totalCostUsd = data.models.reduce((sum, model) => sum + estimateDetailedCostUsd(model), 0);
const pricingCoverage = total ? pricedDetailedTokens / total : 0;

const themes = {
  dark: {
    ink: '#E6EDF3', muted: '#9198A1', faint: '#656D76',
    panel: '#161B22', panelOpacity: '.88', panel2: '#0D1117', edge: '#2D333B', topEdge: '#3D444D', track: '#21262D',
    accent: '#58A6FF', accent2: '#7EE7F5', accent3: '#BC8CFF',
    dormantTop: '#33465E', dormantRight: '#24364D', dormantLeft: '#1B2B40',
    lowTop: '#3979D3', highTop: '#C2E3FF', lowRight: '#255EAE', highRight: '#4C9EFF', lowLeft: '#1C4B92', highLeft: '#357FD8'
  },
  light: {
    ink: '#1F2328', muted: '#59636E', faint: '#818B98',
    panel: '#FFFFFF', panelOpacity: '.82', panel2: '#F6F8FA', edge: '#D1D9E0', topEdge: '#B6C2CF', track: '#EAEFF2',
    accent: '#0969DA', accent2: '#087EA4', accent3: '#8250DF',
    dormantTop: '#DCE7F5', dormantRight: '#CDDCEE', dormantLeft: '#C1D3E8',
    lowTop: '#A8C9F5', highTop: '#3687E8', lowRight: '#7FAFE9', highRight: '#1769C8', lowLeft: '#6398D9', highLeft: '#0D58B7'
  }
};

const hex = (value) => value.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
function mix(from, to, amount) {
  const a = hex(from); const b = hex(to);
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

const providerIcons = {
  openai: 'openai.svg',
  qwen: 'qwen.svg',
  glm: 'zhipu.svg',
  deepseek: 'deepseek.svg',
  minimax: 'minimax.svg',
  kimi: 'kimi.svg',
  anthropic: 'anthropic.svg'
};

function providerForModel(modelName) {
  const name = modelName.toLowerCase();
  return name.startsWith('gpt') ? 'openai'
    : name.startsWith('claude') ? 'anthropic'
      : name.startsWith('qwen') ? 'qwen'
      : name.startsWith('glm') ? 'glm'
        : name.startsWith('deepseek') ? 'deepseek'
          : name.startsWith('minimax') ? 'minimax'
            : name.startsWith('kimi') ? 'kimi' : 'other';
}

function providerIconData(provider, theme) {
  const filename = providerIcons[provider];
  if (!filename) return null;
  const source = readFileSync(`assets/providers/${filename}`, 'utf8')
    .replaceAll('currentColor', theme.accent)
    .replace(/fill="url\([^)]*\)"/g, `fill="${theme.accent}"`)
    .replace(/(?:fill|stop-color)="(?:#[0-9a-f]{3,8}|white|black)"/gi, (match) => `${match.slice(0, match.indexOf('='))}="${theme.accent}"`);
  return `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`;
}

function modelMark(x, y, modelName, theme) {
  const provider = providerForModel(modelName);
  const icon = providerIconData(provider, theme);
  if (!icon) {
    return `<g transform="translate(${x} ${y})"><rect x="-8" y="-8" width="16" height="16" rx="4" fill="${theme.panel2}" stroke="${theme.edge}"/><g fill="none" stroke="${theme.accent}" stroke-width="1.25" stroke-linecap="round"><circle r="4"/><path d="M-2 0h4M0-2v4"/></g></g>`;
  }
  return `<g transform="translate(${x} ${y})"><rect x="-8" y="-8" width="16" height="16" rx="4" fill="${theme.panel2}" stroke="${theme.edge}"/><image x="-5.5" y="-5.5" width="11" height="11" href="${icon}"/></g>`;
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
  const edge = day.tokens ? theme.accent2 : theme.edge;
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
  let x = 28;
  return data.models.slice(0, 3).map((model, index) => {
    const label = safe(model.name);
    const width = Math.max(105, 42 + label.length * 7);
    const result = `<g class="intro" style="animation-delay:${(.2 + index * .08).toFixed(2)}s"><rect x="${x}" y="74" width="${width}" height="24" rx="12" class="pill"/>
      ${modelMark(x + 17, 86, model.name, theme)}
      <text x="${x + 30}" y="90" class="pillText">${label}</text></g>`;
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
  if (!listed.length || !totalTokens) return `<g><rect x="${x}" y="${y - 14}" width="${width}" height="28" rx="6" class="splitPanel"/><text x="${x + 9}" y="${y + 4}" class="splitLabel">NO DEVICE DATA</text></g>`;
  let offset = 0;
  const segments = listed.map((entry, index) => {
    const segmentWidth = index === listed.length - 1 ? 128 - offset : Math.round(128 * entry.tokens / totalTokens);
    const result = `<rect x="${x + 9 + offset}" y="${y - 9}" width="${Math.max(1, segmentWidth)}" height="3.5" rx="1.75" fill="${index ? theme.accent2 : theme.accent}"/>`;
    offset += segmentWidth;
    return result;
  }).join('');
  const line = (entry, lineY) => {
    const share = entry.tokens / totalTokens * 100;
    const label = share > 0 && share < 1 ? '&lt;1%' : `${Math.round(share)}%`;
    return `<text x="${x + 9}" y="${lineY}" class="splitLabel">${safe(entry.name)}</text><text x="${x + 137}" y="${lineY}" text-anchor="end" class="splitLabel">${label}</text>`;
  };
  const labels = listed.length === 1 ? line(listed[0], y + 4) : `${line(listed[0], y + 1)}${line(listed[1], y + 10)}`;
  return `<g><rect x="${x}" y="${y - 14}" width="${width}" height="28" rx="6" class="splitPanel"/><rect x="${x + 9}" y="${y - 9}" width="128" height="3.5" rx="1.75" class="track"/>${segments}${labels}</g>`;
}

function modelRows(theme, startY) {
  if (!visibleModels.length) return `<text x="44" y="${startY}" class="empty">NO MODEL DATA — SYNC CODEX CLI TO BEGIN</text>`;
  return visibleModels.map((model, index) => {
    const y = startY + index * 34;
    const detailed = hasFullDetail(model);
    const rate = detailed && model.inputTokens ? `${Math.round(cacheRate(model) * 100)}%` : 'SYNC';
    const cost = compactUsd(model.aggregate ? model.estimatedCostUsd : estimateModelCostUsd(model));
    const turnLabel = model.turnCountComplete || model.turnCount
      ? `${compact(model.turnCount)}${model.turnCountComplete ? '' : '+'} TURNS`
      : 'TURN SYNC PENDING';
    const highlight = index === 0 ? `<rect x="42" y="${y - 17}" width="756" height="31" rx="7" fill="${theme.accent}" fill-opacity=".055"/><rect x="42" y="${y - 12}" width="2.5" height="21" rx="1.25" fill="${theme.accent}"/>` : '';
    const rule = index < visibleModels.length - 1 ? `<line x1="68" y1="${y + 17}" x2="796" y2="${y + 17}" class="rowRule"/>` : '';
    return `<g class="mrow" style="animation-delay:${(1.28 + index * .1).toFixed(2)}s">
      ${highlight}
      ${modelMark(56, y - 4, model.name, theme)}
      <text x="72" y="${y}" class="model">${safe(model.name)}</text>
      <text x="72" y="${y + 11}" class="rowMeta">${Math.round(total ? model.tokens / total * 100 : 0)}% SHARE · ${turnLabel}</text>
      ${modelDeviceSplit(theme, model, y)}
      <text x="470" y="${y + 5}" text-anchor="end" class="numberStrong">${compact(model.tokens)}</text>
      <text x="610" y="${y + 5}" text-anchor="end" class="numberStrong">${rate}</text>
      <text x="796" y="${y}" text-anchor="end" class="numberStrong">${cost}</text>
      ${rule}
    </g>`;
  }).join('');
}

function render(mode) {
  const theme = themes[mode];
  const latest = data.updatedAt ? data.updatedAt.slice(0, 10) : 'SYNC PENDING';
  const coverageLabel = `${Math.round(pricingCoverage * 100)}%`;
  const cacheLabel = detailedInput ? `${Math.round(detailedCached / detailedInput * 100)}%` : '—';
  const tableTop = 348;
  const modelStartY = 435;
  const modelLastBottom = modelStartY + Math.max(visibleModels.length - 1, 0) * 34 + 15;
  const tableRuleY = modelLastBottom + 12;
  const tableNoteY = tableRuleY + 17;
  const tableBottom = tableNoteY + 17;
  const footerY = tableBottom + 38;
  const dashboardHeight = footerY + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="${dashboardHeight}" viewBox="0 0 840 ${dashboardHeight}" role="img" aria-label="HJ Cheng six month AI coding and token economy dashboard">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .sans{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
    .title{font-size:20px;font-weight:800;letter-spacing:.6px;fill:${theme.ink}}
    .eyebrow{font-size:8.5px;font-weight:600;letter-spacing:2.2px;fill:${theme.faint}}
    .hero{font-size:34px;font-weight:700;fill:url(#heroGrad)}
    .heroUnit{font-size:13px;font-weight:700;fill:${theme.accent2}}
    .muted{font-size:8.5px;font-weight:600;letter-spacing:1.2px;fill:${theme.muted}}
    .pillText{font-size:9px;font-weight:600;letter-spacing:.5px;fill:${theme.ink}}
    .stat{font-size:20px;font-weight:700;fill:${theme.ink}}
    .statCost{fill:url(#heroGrad)}
    .statLabel{font-size:7px;font-weight:600;letter-spacing:1.5px;fill:${theme.faint}}
    .month{font-size:8.5px;font-weight:600;letter-spacing:1px;fill:${theme.muted}}
    .peakText{font-size:9.5px;font-weight:600;fill:${theme.ink}}
    .section{font-size:13px;font-weight:700;letter-spacing:.4px;fill:${theme.ink}}
    .model{font-size:12px;font-weight:700;fill:${theme.ink}}
    .rowMeta{font-size:7.5px;font-weight:600;letter-spacing:.8px;fill:${theme.faint}}
    .splitLabel{font-size:7px;font-weight:600;letter-spacing:.5px;fill:${theme.muted}}
    .numberStrong{font-size:12.5px;font-weight:700;fill:${theme.ink}}
    .empty{font-size:11px;font-weight:600;fill:${theme.muted}}
    .footText{font-size:8px;font-weight:600;letter-spacing:2px;fill:${theme.faint}}
    .panel{fill:${theme.panel};fill-opacity:${theme.panelOpacity};stroke:${theme.edge};stroke-width:1}
    .splitPanel{fill:${theme.panel2};stroke:${theme.edge};stroke-width:1}
    .pill{fill:${theme.panel2};stroke:${theme.edge};stroke-width:1}
    .track{fill:${theme.track}}
    .pin{stroke:${theme.accent2};stroke-width:1.4;stroke-opacity:.9}
    .grid{stroke:${theme.edge};stroke-width:1}
    .topEdge{stroke:${theme.topEdge};stroke-width:1;stroke-opacity:.55}
    .edgeFlow{animation:edgeRun 8s linear infinite}
    .rowRule{stroke:${theme.edge};stroke-width:1;stroke-dasharray:2 4;stroke-opacity:.7}
    .intro,.panelIn,.mrow{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .terrainIn{animation:fadeIn 600ms ease-out 240ms both}
    .cube{transform-box:fill-box;transform-origin:50% 100%;animation:rise 560ms cubic-bezier(.2,.9,.3,1) both}
    .meterFill{transform-box:fill-box;transform-origin:0% 50%;animation:growX 620ms cubic-bezier(.22,1,.36,1) 780ms both}
    .beacon{transform-box:fill-box;transform-origin:50% 50%;animation:fadeIn 500ms ease-out 1.35s both,pulse 4.2s ease-in-out 2s infinite}
    .liveDot{transform-box:fill-box;transform-origin:center;animation:livePulse 2.6s ease-in-out infinite}
    .ripple{transform-box:fill-box;transform-origin:center;opacity:0;animation:ripple 3.6s cubic-bezier(.25,.6,.35,1) infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes rise{0%{opacity:0;transform:scaleY(0)}35%{opacity:1}100%{opacity:1;transform:scaleY(1)}}
    @keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes pulse{0%,100%{opacity:.82}50%{opacity:1}}
    @keyframes livePulse{0%,100%{opacity:.45}50%{opacity:1}}
    @keyframes ripple{0%{opacity:0;transform:scale(.5)}18%{opacity:.55}72%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}
    @keyframes edgeRun{to{stroke-dashoffset:0}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <defs>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent2}"/></linearGradient>
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent}"/></linearGradient>
    <linearGradient id="footGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset=".55" stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent3}"/></linearGradient>
    <linearGradient id="meterGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent2}"/></linearGradient>
    <linearGradient id="greenLegend"><stop stop-color="${theme.dormantTop}"/><stop offset=".3" stop-color="${theme.lowTop}"/><stop offset="1" stop-color="${theme.highTop}"/></linearGradient>
    <radialGradient id="heroGlow" cx=".5" cy=".5" r=".5"><stop stop-color="${theme.accent}" stop-opacity=".12"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></radialGradient>
  </defs>

  <g class="intro">
    <text x="28" y="28" class="eyebrow">AI WORKBENCH · CODEX + QODER + CLAUDE + OPENCODE · @HJCHENG0602</text>
    <text x="28" y="52" class="title sans">VIBE CODING STATS</text>
    <rect x="29" y="60" width="58" height="3" rx="1.5" fill="url(#footGrad)"/>
    <circle cx="700" cy="40" r="80" fill="url(#heroGlow)"/>
    <text x="812" y="44" class="hero" text-anchor="end">${compact(total)}<tspan class="heroUnit"> TOKENS</tspan></text>
    <text x="812" y="63" class="muted" text-anchor="end">ROLLING 183 DAYS · SYNCED ${latest}</text>
    <circle cx="352" cy="25" r="6.5" fill="none" stroke="${theme.accent2}" stroke-width="1" class="ripple" style="animation-delay:.4s"/><circle cx="352" cy="25" r="6.5" fill="none" stroke="${theme.accent2}" stroke-width="1" class="ripple" style="animation-delay:2.2s"/>
    <circle cx="352" cy="25" r="2.4" fill="${theme.accent2}" class="liveDot"/>
  </g>

  ${modelPills(theme)}

  <g class="terrainIn">
    <text x="28" y="120" class="eyebrow">6-MONTH WINDOW · ONE CUBE PER DAY</text>
    <text x="28" y="135" class="muted">HEIGHT AND COLOR SHOW DAILY TOKEN VOLUME</text>
    <g>${calendar(theme)}</g>
    <text x="452" y="326" text-anchor="end" class="month">LOW</text><rect x="460" y="319" width="76" height="7" rx="3.5" fill="url(#greenLegend)"/><text x="544" y="326" class="month">PEAK</text>
  </g>

  <g class="panelIn" style="animation-delay:.38s">
    <rect x="580" y="98" width="236" height="192" rx="14" class="panel"/>
    <rect x="581" y="99" width="234" height="190" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="3" stroke-opacity=".15" pathLength="100" stroke-dasharray="14 86" stroke-dashoffset="100" class="edgeFlow"/>
        <rect x="581" y="99" width="234" height="190" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="1.1" stroke-opacity=".8" pathLength="100" stroke-dasharray="14 86" stroke-dashoffset="100" class="edgeFlow"/>
    <line x1="594" y1="99" x2="802" y2="99" class="topEdge"/>
    <rect x="580" y="112" width="3" height="34" rx="1.5" fill="url(#barGrad)"/>
    <text x="598" y="124" class="section sans">TOKEN ECONOMY</text>
    <text x="598" y="139" class="statLabel">PRICED ${coverageLabel} OF VOLUME</text>
    <line x1="598" y1="154" x2="798" y2="154" class="grid"/>
    <text x="598" y="183" class="stat">${activeDays}<tspan class="muted">d</tspan></text><text x="598" y="198" class="statLabel">ACTIVE DAYS</text>
    <text x="666" y="183" class="stat">${longestStreak}<tspan class="muted">d</tspan></text><text x="666" y="198" class="statLabel">STREAK</text>
    <text x="734" y="183" class="stat">${data.devices.length}</text><text x="734" y="198" class="statLabel">DEVICES</text>
    <line x1="598" y1="212" x2="798" y2="212" class="grid"/>
    <text x="598" y="240" class="stat">${cacheLabel}</text><text x="598" y="255" class="statLabel">CACHE HIT RATE</text>
    <text x="798" y="240" text-anchor="end" class="stat statCost">${compactUsd(totalCostUsd)}</text><text x="798" y="255" text-anchor="end" class="statLabel">EST. API COST</text>
    <rect x="598" y="262" width="200" height="6" rx="3" class="track"/><rect x="598" y="262" width="${Math.round(200 * pricingCoverage)}" height="6" rx="3" fill="url(#meterGrad)" class="meterFill"/>
    <text x="598" y="281" class="statLabel">API PRICE COVERAGE</text><text x="798" y="281" text-anchor="end" class="statLabel">${coverageLabel}</text>
  </g>

  <g class="panelIn" style="animation-delay:.8s">
    <rect x="28" y="${tableTop}" width="784" height="${tableBottom - tableTop}" rx="14" class="panel"/>
    <rect x="29" y="${tableTop + 1}" width="782" height="${tableBottom - tableTop - 2}" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="3" stroke-opacity=".13" pathLength="100" stroke-dasharray="9 91" stroke-dashoffset="100" class="edgeFlow" style="animation-delay:3.6s;animation-duration:10s"/>
        <rect x="29" y="${tableTop + 1}" width="782" height="${tableBottom - tableTop - 2}" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="1.1" stroke-opacity=".75" pathLength="100" stroke-dasharray="9 91" stroke-dashoffset="100" class="edgeFlow" style="animation-delay:3.6s;animation-duration:10s"/>
    <line x1="42" y1="${tableTop + 1}" x2="798" y2="${tableTop + 1}" class="topEdge"/>
    <rect x="44" y="368" width="6" height="6" rx="1.5" fill="${theme.accent}"/>
    <text x="58" y="375" class="section sans">MODEL ECONOMY</text>
    <text x="796" y="375" text-anchor="end" class="eyebrow">${visibleModels.length} MODELS · PER-MODEL DEVICE SPLIT</text>
    <line x1="44" y1="390" x2="796" y2="390" class="grid"/>
    <text x="72" y="407" class="statLabel">MODEL / SHARE</text>
    <text x="204" y="407" class="statLabel">DEVICE SPLIT</text>
    <text x="470" y="407" text-anchor="end" class="statLabel">TOKENS</text>
    <text x="610" y="407" text-anchor="end" class="statLabel">CACHE HIT</text>
    <text x="796" y="407" text-anchor="end" class="statLabel">EST. USD</text>
    ${modelRows(theme, modelStartY)}
    <line x1="44" y1="${tableRuleY}" x2="796" y2="${tableRuleY}" class="grid"/>
    <text x="44" y="${tableNoteY}" class="rowMeta">TEXT TOKEN API ESTIMATE · EXCLUDES TOOLS, REGIONAL, AND LONG-CONTEXT SURCHARGES · PUBLIC API RATES ${RATE_CARD_DATE}</text>
  </g>

  <g class="panelIn" style="animation-delay:1s">
    <line x1="28" y1="${footerY - 14}" x2="812" y2="${footerY - 14}" stroke="url(#footGrad)" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".55"/>
    <text x="28" y="${footerY}" class="footText">183 DAYS · LOCAL-ONLY AGGREGATES · LIVE SVG</text>
    <text x="812" y="${footerY}" text-anchor="end" class="footText">BUILD THE SYSTEM</text>
  </g>
</svg>`;
}

mkdirSync('assets', { recursive: true });
const darkSvg = render('dark').replace(/[ \t]+$/gm, '');
const lightSvg = render('light').replace(/[ \t]+$/gm, '');
writeFileSync('assets/token-terrain-dark.svg', darkSvg);
writeFileSync('assets/token-terrain-light.svg', lightSvg);
writeFileSync('assets/year-grid-dark.svg', darkSvg);
writeFileSync('assets/year-grid-light.svg', lightSvg);
console.log(`Rendered 6-month token dashboard: ${compact(total)} tokens, ${activeDays} active days, ${Math.round(pricingCoverage * 100)}% API-priced.`);
