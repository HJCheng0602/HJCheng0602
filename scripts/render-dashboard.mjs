import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[c]));
const compact = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n || 0);
const total = data.models.reduce((n, x) => n + (x.tokens || 0), 0);
const active = data.days.filter((x) => x.tokens > 0).length;
const latest = data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('en-CA') : 'SYNC PENDING';
const palette = ['#758a64', '#c59563', '#71859b', '#aa766a'];

function block(x, y, h, i) {
  const w = 23, d = 12, top = `${x},${y-h} ${x+w},${y-h-8} ${x+w+d},${y-h} ${x+d},${y-h+8}`;
  const left = `${x},${y-h} ${x+d},${y-h+8} ${x+d},${y+8} ${x},${y}`;
  const right = `${x+d},${y-h+8} ${x+w+d},${y-h} ${x+w+d},${y} ${x+d},${y+8}`;
  const c = palette[i % palette.length];
  return `<g class="rise r${i % 5}"><polygon points="${left}" fill="#303731"/><polygon points="${right}" fill="#53624c"/><polygon points="${top}" fill="${c}"/><line x1="${x+3}" y1="${y-h+2}" x2="${x+20}" y2="${y-h-4}" stroke="#f1e9dd" stroke-opacity=".38"/></g>`;
}
function card(label, value, note, x, accent) {
  return `<g><text x="${x}" y="145" class="meta">${label}</text><text x="${x}" y="177" class="metric" fill="${accent}">${esc(value)}</text><text x="${x}" y="198" class="sub">${esc(note)}</text></g>`;
}
function render(dark) {
  const bg = dark ? '#161816' : '#eeeae2', paper = dark ? '#1e211e' : '#faf8f2', ink = dark ? '#ede9df' : '#20231f', faint = dark ? '#a8aa9d' : '#61665d', rule = dark ? '#3a4038' : '#c5c2b8';
  const days = data.days.slice(-18), max = Math.max(1, ...days.map((d) => d.tokens || 0));
  const terrain = days.map((d, i) => block(72 + i * 38, 414 + (i % 2) * 6, Math.max(8, Math.round(128 * (d.tokens || 0) / max)), i)).join('');
  const modelRows = data.models.slice(0, 5).map((m, i) => {
    const ratio = total ? Math.max(.025, m.tokens / total) : 0;
    return `<text x="607" y="${506 + i * 31}" class="model">${esc(m.name)}</text><rect x="750" y="${496 + i * 31}" width="126" height="5" rx="2.5" fill="${rule}"/><rect x="750" y="${496 + i * 31}" width="${126 * ratio}" height="5" rx="2.5" fill="${palette[i]}"><animate attributeName="opacity" values=".55;1;.55" dur="${2.8 + i * .35}s" repeatCount="indefinite"/></rect><text x="911" y="${506 + i * 31}" class="amount" text-anchor="end">${compact(m.tokens)}</text>`;
  }).join('') || `<text x="607" y="525" class="sub">Waiting for your first local snapshot.</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="690" viewBox="0 0 960 690"><defs><style>
    .display{font:500 29px Georgia,'Times New Roman',serif;letter-spacing:-.6px;fill:${ink}} .eyebrow{font:600 11px Arial,sans-serif;letter-spacing:2px;fill:${faint}} .meta{font:600 10px Arial,sans-serif;letter-spacing:1.45px;fill:${faint}} .metric{font:500 30px Georgia,'Times New Roman',serif;letter-spacing:-.7px}.sub{font:13px Arial,sans-serif;fill:${faint}} .model{font:13px Arial,sans-serif;fill:${ink}} .amount{font:600 12px Arial,sans-serif;fill:${ink}} .rise{transform-box:fill-box;transform-origin:center bottom;animation:rise 1.4s ease-out both}.r1{animation-delay:.12s}.r2{animation-delay:.24s}.r3{animation-delay:.36s}.r4{animation-delay:.48s}@keyframes rise{0%{opacity:0;transform:translateY(25px) scaleY(.15)}55%{opacity:1}100%{opacity:1;transform:translateY(0) scaleY(1)}}
  </style><linearGradient id="wash" x1="0" x2="1"><stop stop-color="#758a64" stop-opacity=".2"/><stop offset="1" stop-color="#c59563" stop-opacity="0"/></linearGradient></defs>
  <rect width="960" height="690" rx="18" fill="${bg}"/><rect x="18" y="18" width="924" height="654" rx="12" fill="none" stroke="${rule}"/>
  <text x="48" y="63" class="eyebrow">HJ CHENG / PERSONAL COMPUTE LEDGER</text><circle cx="883" cy="57" r="5" fill="#758a64"><animate attributeName="opacity" values=".35;1;.35" dur="2s" repeatCount="indefinite"/></circle><text x="900" y="62" class="eyebrow" text-anchor="end">${esc(latest)}</text>
  <text x="48" y="108" class="display">AI work, measured without the noise.</text><line x1="48" y1="221" x2="912" y2="221" stroke="${rule}"/>
  ${card('TOKENS OBSERVED', compact(total), 'all synced devices', 48, '#758a64')}${card('ACTIVE DAYS', `${active}d`, 'in the recorded window', 260, '#c59563')}${card('DEVICES', data.devices.length, 'Mac + Windows ready', 472, '#71859b')}${card('MODELS', data.models.length, 'distinct Codex models', 684, '#aa766a')}
  <rect x="48" y="252" width="522" height="362" rx="9" fill="${paper}"/><text x="72" y="286" class="eyebrow">TOKEN TERRAIN / LAST 18 DAYS</text><text x="72" y="309" class="sub">each block is a local day; height follows total token volume</text><path d="M62 414 H550" stroke="${rule}"/><path d="M72 430 H548" stroke="${rule}" stroke-dasharray="3 9" opacity=".55"/>${terrain}<rect x="63" y="330" width="485" height="72" fill="url(#wash)" opacity=".55"><animate attributeName="y" values="330;398;330" dur="6s" repeatCount="indefinite"/></rect><line x1="63" y1="402" x2="548" y2="402" stroke="#c59563" stroke-opacity=".65"><animate attributeName="x1" values="63;490;63" dur="5s" repeatCount="indefinite"/></line><text x="72" y="578" class="eyebrow">LOCAL-ONLY LEDGER</text><text x="72" y="599" class="sub">No prompts, code, paths, or hostnames leave your machines.</text>
  <rect x="590" y="252" width="322" height="362" rx="9" fill="${paper}"/><text x="607" y="286" class="eyebrow">MODEL MIX</text><text x="607" y="309" class="sub">share of observed Codex CLI tokens</text><line x1="607" y1="472" x2="894" y2="472" stroke="${rule}"/>${modelRows}
  <text x="48" y="648" class="eyebrow">MAC + WINDOWS / CODEX CLI / LIVE SVG MOTION</text><text x="912" y="648" class="eyebrow" text-anchor="end">BUILD THE SYSTEM</text></svg>`;
}
mkdirSync('assets', { recursive: true });
writeFileSync('assets/ai-workbench-dark.svg', render(true));
writeFileSync('assets/ai-workbench-light.svg', render(false));
console.log(`Rendered animated workbench: ${compact(total)} tokens across ${data.devices.length} device(s).`);
