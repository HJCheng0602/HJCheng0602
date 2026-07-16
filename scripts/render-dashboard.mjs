import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const total = data.models.reduce((sum, model) => sum + (model.tokens || 0), 0);
const compact = (value) => value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : `${value || 0}`;
const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const isoDate = (value) => value.toISOString().slice(0, 10);

function rollingYear() {
  const values = new Map(data.days.map((day) => [day.date, day.tokens || 0]));
  const latestUsage = data.days.at(-1)?.date || '1970-01-01';
  const latestSync = data.updatedAt?.slice(0, 10) || latestUsage;
  const endKey = latestUsage > latestSync ? latestUsage : latestSync;
  const end = new Date(`${endKey}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  return Array.from({ length: 365 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    const key = isoDate(date);
    return { date: key, tokens: values.get(key) || 0, weekday: date.getUTCDay(), index };
  });
}

const days = rollingYear();
const activeDays = days.filter((day) => day.tokens > 0).length;
const peak = days.reduce((best, day) => day.tokens > (best?.tokens || -1) ? day : best, null);
const peakShare = total && peak ? Math.round(peak.tokens / total * 100) : 0;
let longestStreak = 0;
let currentStreak = 0;
for (const day of days) {
  currentStreak = day.tokens > 0 ? currentStreak + 1 : 0;
  longestStreak = Math.max(longestStreak, currentStreak);
}

const themes = {
  dark: {
    ink: '#F0F4F2', muted: '#8E9B95', faint: '#5E6B65', panel: '#151B18', panel2: '#101512', stroke: '#2D3832', grid: '#232D28', track: '#2B3530',
    accent: '#5FE58A', accent2: '#A6F4BC', dormantTop: '#243129', dormantRight: '#1A261F', dormantLeft: '#142019',
    lowTop: '#286442', highTop: '#B7F7C8', lowRight: '#1B4A31', highRight: '#45C974', lowLeft: '#153A28', highLeft: '#2B9B58'
  },
  light: {
    ink: '#202722', muted: '#5F6D65', faint: '#8B9891', panel: '#F4F8F5', panel2: '#FFFFFF', stroke: '#CDD9D1', grid: '#DDE7E0', track: '#D8E2DB',
    accent: '#1A9B4A', accent2: '#35B85F', dormantTop: '#E3ECE6', dormantRight: '#D5E2D9', dormantLeft: '#CBDACF',
    lowTop: '#BDE8C8', highTop: '#29A854', lowRight: '#8FD5A3', highRight: '#16833D', lowLeft: '#73BF8C', highLeft: '#106B34'
  }
};

const hex = (value) => value.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
function mix(from, to, amount) {
  const a = hex(from); const b = hex(to);
  return `#${a.map((value, index) => Math.round(value + (b[index] - value) * amount).toString(16).padStart(2, '0')).join('')}`;
}

function modelMark(x, y, color) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.35" stroke-linecap="round" opacity=".95">
    <path d="M0-6.4c3.4 0 6 2.2 6 5.2 0 1.5-.6 2.8-1.7 3.7"/>
    <path d="M5.6 3.2C3.9 6.1.7 7.2-2 5.8c-1.3-.7-2.1-1.9-2.3-3.3"/>
    <path d="M-5.6 3.2C-7.3.3-6.7-3.1-4-4.7c1.3-.7 2.7-.8 4.1-.3"/>
    <path d="M-3.7-1.7L0-3.9l3.7 2.2v4.3L0 4.7l-3.7-2.1z"/>
  </g>`;
}

function coords(day) {
  const firstWeekday = days[0].weekday;
  const week = Math.floor((firstWeekday + day.index) / 7);
  const x = 88 + week * 11.7 + day.weekday * 7.2;
  const y = 153 + week * 4.7 - day.weekday * 3.8;
  return { x, y, week };
}

function dayCube(theme, day, maxTokens) {
  const { x, y, week } = coords(day);
  const ratio = day.tokens ? day.tokens / maxTokens : 0;
  const intensity = Math.sqrt(ratio);
  const height = day.tokens ? 7 + Math.round(intensity * 20) : 3;
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
    labels.push(`<text x="${95 + week * 11.7}" y="${176 + week * 4.7}" class="month">${monthNames[month]}</text>`);
  }

  let callout = '';
  if (peak?.tokens) {
    const { x, y } = coords(peak);
    const intensity = Math.sqrt(peak.tokens / maxTokens);
    const height = 7 + Math.round(intensity * 20);
    const topY = y - height;
    const labelY = topY - 42;
    callout = `<g><line x1="${x}" y1="${topY - 2}" x2="${x}" y2="${labelY + 23}" class="pin"/>
      <rect x="${x - 57}" y="${labelY}" width="114" height="23" rx="11.5" class="pill"/>
      <text x="${x}" y="${labelY + 15}" text-anchor="middle" class="peakText">${compact(peak.tokens)} · ${peak.date.slice(5)}</text></g>`;
  }
  return cells + labels.join('') + callout;
}

function modelPills(theme) {
  let x = 26;
  return data.models.slice(0, 3).map((model, index) => {
    const label = safe(model.name);
    const width = Math.max(105, 42 + label.length * 7);
    const result = `<g><rect x="${x}" y="70" width="${width}" height="23" rx="11.5" class="pill"/>
      ${modelMark(x + 16, 81.5, index ? theme.accent2 : theme.accent)}
      <text x="${x + 30}" y="85" class="pillText">${label}</text></g>`;
    x += width + 8;
    return result;
  }).join('');
}

function modelRows(theme) {
  if (!data.models.length) return `<text x="45" y="541" class="empty">NO MODEL DATA — SYNC CODEX CLI TO BEGIN</text>`;
  return data.models.slice(0, 4).map((model, index) => {
    const share = total ? model.tokens / total : 0;
    const barWidth = Math.max(3, Math.round(176 * share));
    const average = activeDays ? model.tokens / activeDays : 0;
    const y = 535 + index * 36;
    const color = index ? theme.accent2 : theme.accent;
    const rank = String(index + 1).padStart(2, '0');
    return `<g>
      <rect x="44" y="${y - 18}" width="30" height="22" rx="6" fill="${theme.panel2}" stroke="${theme.stroke}"/>
      <text x="59" y="${y - 3}" text-anchor="middle" class="rank">${rank}</text>
      ${modelMark(92, y - 7, color)}
      <text x="109" y="${y - 5}" class="model">${safe(model.name)}</text>
      <text x="109" y="${y + 9}" class="rowMeta">OBSERVED · ${data.devices.length} DEVICE${data.devices.length === 1 ? '' : 'S'}</text>
      <text x="376" y="${y - 3}" text-anchor="end" class="number">${compact(model.tokens)}</text>
      <text x="475" y="${y - 3}" text-anchor="end" class="number">${compact(average)}</text>
      <rect x="509" y="${y - 10}" width="176" height="7" rx="3.5" class="track"/>
      <rect x="509" y="${y - 10}" width="${barWidth}" height="7" rx="3.5" fill="${color}"><animate attributeName="fill-opacity" values=".68;1;.76" dur="3.6s" begin="${(index * .45).toFixed(2)}s" repeatCount="indefinite"/></rect>
      <text x="790" y="${y - 3}" text-anchor="end" class="share">${Math.round(share * 100)}%</text>
      ${index < Math.min(data.models.length, 4) - 1 ? `<line x1="44" y1="${y + 18}" x2="796" y2="${y + 18}" class="grid"/>` : ''}
    </g>`;
  }).join('');
}

function render(mode) {
  const theme = themes[mode];
  const latest = data.updatedAt ? data.updatedAt.slice(0, 10) : 'SYNC PENDING';
  const topShare = total && data.models[0] ? Math.round(data.models[0].tokens / total * 100) : 0;
  const coverage = (activeDays / 365 * 100).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="680" viewBox="0 0 840 680" role="img" aria-label="HJ Cheng 365 day AI coding calendar">
  <style>
    text{font-family:'Cascadia Code','JetBrains Mono','SFMono-Regular',Consolas,monospace}
    .title{font-size:20px;font-weight:760;letter-spacing:2.2px;fill:${theme.ink}}
    .eyebrow{font-size:9px;font-weight:700;letter-spacing:1.7px;fill:${theme.muted}}
    .hero{font-size:36px;font-weight:780;letter-spacing:-2px;fill:${theme.accent}}
    .heroUnit{font-size:14px;font-weight:720;letter-spacing:-.25px;fill:${theme.accent}}
    .muted{font-size:9px;font-weight:600;letter-spacing:.6px;fill:${theme.muted}}
    .pillText{font-size:9.5px;font-weight:700;fill:${theme.ink}}
    .stat{font-size:20px;font-weight:770;fill:${theme.ink}}
    .statLabel{font-size:8px;font-weight:700;letter-spacing:.85px;fill:${theme.muted}}
    .month{font-size:8px;font-weight:650;letter-spacing:.5px;fill:${theme.muted}}
    .peakText{font-size:9px;font-weight:750;fill:${theme.ink}}
    .section{font-size:12px;font-weight:780;letter-spacing:1px;fill:${theme.ink}}
    .model{font-size:11px;font-weight:750;fill:${theme.ink}}
    .rowMeta{font-size:7.5px;font-weight:650;letter-spacing:.6px;fill:${theme.faint}}
    .number{font-size:10px;font-weight:650;fill:${theme.muted}}
    .share{font-size:11px;font-weight:780;fill:${theme.ink}}
    .rank{font-size:9px;font-weight:780;fill:${theme.accent}}
    .empty{font-size:10px;font-weight:650;letter-spacing:.5px;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .pill{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .track{fill:${theme.track}}
    .pin{stroke:${theme.accent2};stroke-width:1.2;stroke-opacity:.78}
    .grid{stroke:${theme.grid};stroke-width:1}
    @media(prefers-reduced-motion:reduce){animate{display:none}}
  </style>

  <text x="24" y="31" class="title">VIBE CODING STATS</text>
  <text x="24" y="51" class="eyebrow">CODEX CLI · LOCAL LEDGER · @HJCHENG0602</text>
  <text x="816" y="40" class="hero" text-anchor="end">${compact(total)}<tspan class="heroUnit"> TOKENS</tspan></text>
  <text x="816" y="58" class="muted" text-anchor="end">OBSERVED TOTAL · ${latest}</text>

  ${modelPills(theme)}
  <text x="24" y="113" class="eyebrow">365 DAY TOKEN CALENDAR · ONE CUBE PER DAY</text>
  <text x="24" y="129" class="muted">HEIGHT + GREEN INTENSITY = DAILY TOKEN SHARE</text>

  <rect x="598" y="82" width="218" height="80" rx="13" class="panel"/>
  <text x="617" y="114" class="stat">${activeDays}d</text><text x="617" y="136" class="statLabel">ACTIVE</text>
  <text x="685" y="114" class="stat">${longestStreak}d</text><text x="685" y="136" class="statLabel">STREAK</text>
  <text x="757" y="114" class="stat">${data.devices.length}</text><text x="757" y="136" class="statLabel">DEVICE</text>

  <g>${calendar(theme)}</g>

  <rect x="24" y="365" width="226" height="70" rx="12" class="panel"/>
  <text x="44" y="392" class="stat">${peak?.tokens ? compact(peak.tokens) : '—'}</text><text x="44" y="414" class="statLabel">PEAK DAY</text>
  <line x1="145" y1="381" x2="145" y2="416" class="grid"/>
  <text x="165" y="392" class="stat">${peakShare}%</text><text x="165" y="414" class="statLabel">OF TOTAL</text>

  <text x="686" y="438" class="month">NONE</text>
  <rect x="719" y="432" width="72" height="6" rx="3" fill="url(#greenLegend)"/>
  <text x="798" y="438" class="month">PEAK</text>
  <defs><linearGradient id="greenLegend"><stop stop-color="${theme.dormantTop}"/><stop offset=".28" stop-color="${theme.lowTop}"/><stop offset="1" stop-color="${theme.highTop}"/></linearGradient></defs>

  <rect x="24" y="456" width="792" height="190" rx="13" class="panel"/>
  <text x="44" y="483" class="section">MODEL LEDGER</text>
  <text x="796" y="483" text-anchor="end" class="eyebrow">${data.models.length} MODELS · TOP SHARE ${topShare}% · OTHER ${Math.max(0, 100 - data.models.slice(0, 4).reduce((sum, model) => sum + Math.round(total ? model.tokens / total * 100 : 0), 0))}%</text>
  <line x1="44" y1="493" x2="796" y2="493" class="grid"/>
  <text x="59" y="509" text-anchor="middle" class="statLabel">RANK</text>
  <text x="109" y="509" class="statLabel">MODEL / SOURCE</text>
  <text x="376" y="509" text-anchor="end" class="statLabel">TOKENS</text>
  <text x="475" y="509" text-anchor="end" class="statLabel">PER ACTIVE DAY</text>
  <text x="509" y="509" class="statLabel">RELATIVE VOLUME</text>
  <text x="790" y="509" text-anchor="end" class="statLabel">SHARE</text>
  ${modelRows(theme)}

  <line x1="44" y1="609" x2="796" y2="609" class="grid"/>
  <text x="44" y="629" class="statLabel">COVERAGE <tspan fill="${theme.ink}">${coverage}%</tspan></text>
  <text x="225" y="629" class="statLabel">PEAK <tspan fill="${theme.ink}">${peak?.date.slice(5) || '—'}</tspan></text>
  <text x="401" y="629" class="statLabel">SYNCED <tspan fill="${theme.ink}">${latest}</tspan></text>
  <text x="796" y="629" text-anchor="end" class="statLabel">SOURCE <tspan fill="${theme.ink}">LOCAL CODEX LEDGER</tspan></text>

  <text x="24" y="672" class="eyebrow">365 DAYS · LOCAL-ONLY AGGREGATES · TRANSPARENT SVG · LIVE MOTION</text>
  <text x="816" y="672" class="eyebrow" text-anchor="end">BUILD THE SYSTEM</text>
  </svg>`;
}

mkdirSync('assets', { recursive: true });
const darkSvg = render('dark').replace(/[ \t]+$/gm, '');
const lightSvg = render('light').replace(/[ \t]+$/gm, '');
writeFileSync('assets/token-terrain-dark.svg', darkSvg);
writeFileSync('assets/token-terrain-light.svg', lightSvg);
writeFileSync('assets/year-grid-dark.svg', darkSvg);
writeFileSync('assets/year-grid-light.svg', lightSvg);
console.log(`Rendered 365-day token calendar: ${compact(total)} tokens, ${activeDays} active days.`);
