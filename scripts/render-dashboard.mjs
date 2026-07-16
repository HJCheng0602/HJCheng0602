import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const total = data.models.reduce((sum, model) => sum + (model.tokens || 0), 0);
const compact = (value) => value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : `${value || 0}`;
const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const isoDate = (value) => value.toISOString().slice(0, 10);

function observedDays() {
  if (!data.days.length) return [];
  const values = new Map(data.days.map((day) => [day.date, day.tokens || 0]));
  const start = new Date(`${data.days[0].date}T00:00:00Z`);
  const end = new Date(`${data.days[data.days.length - 1].date}T00:00:00Z`);
  const days = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = isoDate(cursor);
    days.push({ date, tokens: values.get(date) || 0 });
  }
  return days.slice(-18);
}

const days = observedDays();
const activeDays = days.filter((day) => day.tokens > 0).length;
const peak = days.reduce((best, day, index) => day.tokens > (best?.day.tokens || -1) ? { day, index } : best, null);
const peakShare = total && peak ? Math.round(peak.day.tokens / total * 100) : 0;
let longestStreak = 0;
let currentStreak = 0;
for (const day of days) {
  currentStreak = day.tokens > 0 ? currentStreak + 1 : 0;
  longestStreak = Math.max(longestStreak, currentStreak);
}

const themes = {
  dark: {
    ink: '#F0F3F6', muted: '#8B949E', faint: '#59636E', panel: '#161B22', panel2: '#11161D', stroke: '#30363D',
    track: '#2B333D', grid: '#202832', blue: '#69AEFF', cyan: '#9BD4FF', cubeTop: ['#A9D8FF', '#7CC0FF', '#589EFF'],
    cubeRight: ['#4D91D9', '#347AC8', '#2768B5'], cubeLeft: ['#3476BE', '#215A9E', '#19497F'], dormant: ['#27323E', '#1E2833', '#17212B']
  },
  light: {
    ink: '#1F2328', muted: '#59636E', faint: '#8C959F', panel: '#F6F8FA', panel2: '#FFFFFF', stroke: '#D0D7DE',
    track: '#D8DEE4', grid: '#E7ECF1', blue: '#0969DA', cyan: '#218BFF', cubeTop: ['#79C0FF', '#58A6FF', '#388BFD'],
    cubeRight: ['#388BFD', '#1F6FEB', '#0969DA'], cubeLeft: ['#1F6FEB', '#0B5CAD', '#084B8A'], dormant: ['#E9EEF3', '#DDE4EA', '#D3DCE5']
  }
};

function cube(theme, x, y, level, active, variant, delay) {
  const size = 10;
  const rise = 11;
  const yy = y - level * 10;
  const top = active ? theme.cubeTop[variant % 3] : theme.dormant[0];
  const right = active ? theme.cubeRight[variant % 3] : theme.dormant[1];
  const left = active ? theme.cubeLeft[variant % 3] : theme.dormant[2];
  const edge = active ? theme.cyan : theme.stroke;
  return `<g opacity="${active ? 1 : .82}">
    <polygon points="${x},${yy} ${x + size},${yy + 5} ${x},${yy + 10} ${x - size},${yy + 5}" fill="${top}" stroke="${edge}" stroke-opacity="${active ? .22 : .35}" stroke-width=".55"/>
    <polygon points="${x + size},${yy + 5} ${x + size},${yy + 5 + rise} ${x},${yy + 10 + rise} ${x},${yy + 10}" fill="${right}"/>
    <polygon points="${x},${yy + 10} ${x},${yy + 10 + rise} ${x - size},${yy + 5 + rise} ${x - size},${yy + 5}" fill="${left}"/>
    ${active ? `<animate attributeName="opacity" values=".72;1;.86" keyTimes="0;.45;1" dur="2.8s" begin="${delay.toFixed(2)}s" repeatCount="indefinite"/>` : ''}
  </g>`;
}

function modelMark(theme, x, y, color) {
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${color}" stroke-width="1.45" stroke-linecap="round" opacity=".95">
    <path d="M0-6.6c3.5 0 6.2 2.3 6.2 5.4 0 1.5-.7 2.8-1.8 3.8"/>
    <path d="M5.7 3.3C4 6.3.7 7.5-2 6c-1.3-.8-2.1-2-2.4-3.4"/>
    <path d="M-5.7 3.3C-7.4.3-6.8-3.2-4.1-4.8c1.3-.8 2.8-.8 4.2-.3"/>
    <path d="M-3.8-1.8L0-4l3.8 2.2v4.4L0 4.8l-3.8-2.2z"/>
  </g>`;
}

function modelPills(theme) {
  let x = 27;
  return data.models.slice(0, 3).map((model, index) => {
    const label = safe(model.name);
    const width = Math.max(106, 43 + label.length * 7.1);
    const result = `<g><rect x="${x}" y="78" width="${width}" height="24" rx="12" fill="${theme.panel}" stroke="${theme.stroke}"/>
      ${modelMark(theme, x + 16, 90, index ? theme.cyan : theme.blue)}
      <text x="${x + 30}" y="94" class="pillText">${label}</text></g>`;
    x += width + 8;
    return result;
  }).join('');
}

function terrain(theme) {
  if (!days.length) return `<text x="420" y="270" text-anchor="middle" class="empty">YOUR FIRST LOCAL SYNC WILL BUILD THIS TERRAIN</text>`;
  const max = Math.max(1, ...days.map((day) => day.tokens));
  const lanes = [.55, .82, 1, .72, .46];
  const step = days.length > 1 ? Math.min(43, 430 / (days.length - 1)) : 43;
  const startX = 195;
  const startY = 196;
  const fragments = [];

  // Dormant tiles form an honest, continuous calendar runway.
  for (let index = 0; index < days.length; index++) {
    for (let lane = 0; lane < lanes.length; lane++) {
      const x = startX + index * step + lane * 18;
      const y = startY + index * 18 - lane * 9;
      fragments.push(cube(theme, x, y, 0, false, 0, 0));
    }
  }

  // Active days grow into a five-lane isometric ridge using square-root scaling.
  for (let index = 0; index < days.length; index++) {
    const day = days[index];
    if (!day.tokens) continue;
    const height = Math.max(1, Math.round(Math.sqrt(day.tokens / max) * 9));
    for (let lane = 0; lane < lanes.length; lane++) {
      const laneHeight = Math.max(1, Math.round(height * lanes[lane]));
      const x = startX + index * step + lane * 18;
      const y = startY + index * 18 - lane * 9;
      for (let level = 1; level <= laneHeight; level++) {
        fragments.push(cube(theme, x, y, level, true, index + lane, .18 + index * .035 + level * .035 + lane * .018));
      }
    }
  }

  const axisIndexes = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];
  const labels = axisIndexes.map((index) => {
    const x = startX + index * step - 9;
    const y = startY + index * 18 + 42;
    return `<text x="${x}" y="${y}" class="axis">${days[index].date.slice(5)}</text>`;
  }).join('');

  let peakLabel = '';
  if (peak) {
    const height = Math.max(1, Math.round(Math.sqrt(peak.day.tokens / max) * 9));
    const x = startX + peak.index * step + 36;
    const y = startY + peak.index * 18 - 18 - height * 10;
    const labelY = Math.max(180, y - 52);
    peakLabel = `<g><line x1="${x}" y1="${y + 3}" x2="${x}" y2="${labelY + 25}" class="pin"/>
      <rect x="${x - 60}" y="${labelY}" width="120" height="25" rx="12.5" class="pill"/>
      <text x="${x}" y="${labelY + 16}" class="peakText" text-anchor="middle">${compact(peak.day.tokens)} · ${peak.day.date.slice(5)}</text></g>`;
  }

  return fragments.join('') + labels + peakLabel;
}

function modelRows(theme) {
  if (!data.models.length) return `<text x="46" y="514" class="empty">NO MODEL DATA YET — SYNC CODEX CLI TO BEGIN</text>`;
  return data.models.slice(0, 4).map((model, index) => {
    const share = total ? model.tokens / total : 0;
    const width = Math.max(3, Math.round(214 * share));
    const y = 506 + index * 27;
    const color = index ? theme.cyan : theme.blue;
    return `<g>
      ${modelMark(theme, 48, y - 4, color)}
      <text x="66" y="${y}" class="model">${safe(model.name)}</text>
      <text x="404" y="${y}" class="number" text-anchor="end">${compact(model.tokens)}</text>
      <rect x="435" y="${y - 9}" width="214" height="7" rx="3.5" class="track"/>
      <rect x="435" y="${y - 9}" width="${width}" height="7" rx="3.5" fill="${color}"><animate attributeName="fill-opacity" values=".72;1;.72" dur="3.2s" begin="${(index * .35).toFixed(2)}s" repeatCount="indefinite"/></rect>
      <text x="786" y="${y}" class="share" text-anchor="end">${Math.round(share * 100)}%</text>
    </g>`;
  }).join('');
}

function render(mode) {
  const theme = themes[mode];
  const latest = data.updatedAt ? data.updatedAt.slice(0, 10) : 'SYNC PENDING';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="608" viewBox="0 0 840 608" role="img" aria-label="HJ Cheng AI coding token terrain">
  <style>
    text{font-family:'Cascadia Code','JetBrains Mono','SFMono-Regular',Consolas,monospace}
    .eyebrow{font-size:10px;font-weight:700;letter-spacing:2.1px;fill:${theme.muted}}
    .title{font-size:19px;font-weight:750;letter-spacing:1.7px;fill:${theme.ink}}
    .hero{font-size:36px;font-weight:760;letter-spacing:-2px;fill:${theme.blue}}
    .heroUnit{font-size:15px;font-weight:700;letter-spacing:-.25px;fill:${theme.blue}}
    .muted{font-size:10px;font-weight:600;letter-spacing:.7px;fill:${theme.muted}}
    .pillText{font-size:10px;font-weight:650;fill:${theme.ink}}
    .stat{font-size:21px;font-weight:750;fill:${theme.ink}}
    .statLabel{font-size:9px;font-weight:650;letter-spacing:.8px;fill:${theme.muted}}
    .axis{font-size:9px;font-weight:550;fill:${theme.muted}}
    .peakText{font-size:10px;font-weight:700;fill:${theme.ink}}
    .section{font-size:12px;font-weight:750;letter-spacing:.8px;fill:${theme.ink}}
    .model{font-size:12px;font-weight:700;fill:${theme.ink}}
    .number{font-size:11px;font-weight:550;fill:${theme.muted}}
    .share{font-size:12px;font-weight:750;fill:${theme.ink}}
    .empty{font-size:10px;font-weight:600;letter-spacing:.5px;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .pill{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .track{fill:${theme.track}}
    .pin{stroke:${theme.cyan};stroke-width:1.2;stroke-opacity:.75}
    .grid{stroke:${theme.grid};stroke-width:1}
    @media(prefers-reduced-motion:reduce){animate{display:none}}
  </style>

  <text x="24" y="30" class="title">AI CODING TERRAIN</text>
  <text x="24" y="51" class="eyebrow">CODEX CLI · WSL · @HJCHENG0602</text>
  <text x="816" y="39" class="hero" text-anchor="end">${compact(total)}<tspan class="heroUnit"> TOKENS</tspan></text>
  <text x="816" y="59" class="muted" text-anchor="end">OBSERVED TOTAL · ${latest}</text>

  ${modelPills(theme)}
  <text x="24" y="125" class="eyebrow">DAILY TOKEN RIDGE / ${days.length || 0} DAYS</text>
  <text x="24" y="143" class="muted">HEIGHT = TOKEN VOLUME</text>

  <rect x="584" y="82" width="232" height="87" rx="13" class="panel"/>
  <text x="604" y="116" class="stat">${activeDays}d</text><text x="604" y="139" class="statLabel">ACTIVE</text>
  <text x="675" y="116" class="stat">${longestStreak}d</text><text x="675" y="139" class="statLabel">STREAK</text>
  <text x="752" y="116" class="stat">${data.devices.length}</text><text x="752" y="139" class="statLabel">DEVICE</text>

  <g>${terrain(theme)}</g>

  <rect x="24" y="338" width="222" height="72" rx="12" class="panel"/>
  <text x="44" y="365" class="stat">${peak ? compact(peak.day.tokens) : '—'}</text><text x="44" y="388" class="statLabel">PEAK DAY</text>
  <line x1="142" y1="356" x2="142" y2="391" class="grid"/>
  <text x="162" y="365" class="stat">${peakShare}%</text><text x="162" y="388" class="statLabel">OF TOTAL</text>

  <text x="690" y="400" class="axis">LOW</text>
  <rect x="718" y="394" width="74" height="6" rx="3" fill="url(#legend)"/>
  <text x="800" y="400" class="axis">HIGH</text>
  <defs><linearGradient id="legend"><stop stop-color="${theme.cubeLeft[2]}"/><stop offset="1" stop-color="${theme.cubeTop[0]}"/></linearGradient></defs>

  <rect x="24" y="431" width="792" height="150" rx="13" class="panel"/>
  <text x="45" y="461" class="section">MODEL LEDGER</text>
  <text x="404" y="461" class="statLabel" text-anchor="end">TOKENS</text>
  <text x="435" y="461" class="statLabel">OBSERVED SHARE</text>
  <text x="786" y="461" class="statLabel" text-anchor="end">SHARE</text>
  <line x1="45" y1="475" x2="795" y2="475" class="grid"/>
  ${modelRows(theme)}

  <text x="24" y="603" class="eyebrow">LOCAL-ONLY AGGREGATES · TRANSPARENT SVG · LIVE MOTION</text>
  <text x="816" y="603" class="eyebrow" text-anchor="end">BUILD THE SYSTEM</text>
  </svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/ai-workbench-dark.svg', render('dark').replace(/[ \t]+$/gm, ''));
writeFileSync('assets/ai-workbench-light.svg', render('light').replace(/[ \t]+$/gm, ''));
console.log(`Rendered token terrain: ${compact(total)} tokens across ${days.length} observed days.`);
