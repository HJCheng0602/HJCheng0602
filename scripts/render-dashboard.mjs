import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const total = d.models.reduce((n, m) => n + (m.tokens || 0), 0);
const compact = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n || 0}`;
const safe = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const colors = [['#58A6FF','#388BFD','#1F6FEB'], ['#A5D6FF','#58A6FF','#388BFD'], ['#79C0FF','#1F6FEB','#0D419D']];

function cube(x, y, z, i, delay) {
  const [top, right, left] = colors[i % colors.length], s = 10, h = z * 11;
  return `<g class="cube c${delay % 8}" transform="translate(${x} ${y-h})"><polygon points="0,0 ${s},${s/2} 0,${s} -${s},${s/2}" fill="${top}"/><polygon points="${s},${s/2} ${s},${s/2+11} 0,${s+11} 0,${s}" fill="${right}"/><polygon points="0,${s} 0,${s+11} -${s},${s/2+11} -${s},${s/2}" fill="${left}"/></g>`;
}
function terrain() {
  const days = d.days.slice(-22), max = Math.max(1, ...days.map(x => x.tokens || 0));
  if (!days.length) return `<text x="250" y="292" class="empty">YOUR FIRST SYNC WILL BUILD THIS TERRAIN</text>`;
  return days.map((day, i) => {
    const h = Math.max(1, Math.round(10 * (day.tokens || 0) / max)); const x = 190 + i * 19, y = 158 + i * 11;
    return Array.from({length:h}, (_, z) => cube(x, y, z, i, i + z)).join('');
  }).join('');
}
function rows() {
  return d.models.slice(0, 5).map((m, i) => { const p = total ? Math.max(8, Math.round(170 * m.tokens / total)) : 0, y = 501 + i * 20; return `<g class="row r${i}"><text x="45" y="${y}" class="model">${safe(m.name)}</text><text x="385" y="${y}" class="num" text-anchor="end">${compact(m.tokens)}</text><rect x="420" y="${y-10}" width="170" height="7" rx="3.5" class="track"/><rect x="420" y="${y-10}" width="${p}" height="7" rx="3.5" class="bar b${i}"/><text x="796" y="${y}" class="num" text-anchor="end">${total ? `${Math.round(m.tokens / total * 100)}%` : '—'}</text></g>`; }).join('') || `<text x="45" y="506" class="empty">NO MODEL DATA YET — SYNC FROM MAC OR WINDOWS TO BEGIN</text>`;
}
function svg(dark) {
  const ink = dark ? '#F0F6FC' : '#24292F', muted = dark ? '#8B949E' : '#57606A', panel = dark ? '#161B22' : '#F6F8FA', stroke = dark ? '#30363D' : '#D0D7DE';
  const active = d.days.filter(x => x.tokens > 0).length, latest = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('en-CA') : 'SYNC PENDING';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="608" viewBox="0 0 840 608" role="img" aria-label="AI coding statistics"><style>
  .title{font:700 18px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:.2px;fill:${ink}}.subtitle,.label{font:600 10px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:.7px;fill:${muted}}.hero{font:750 31px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:-1.2px;fill:#58A6FF}.stat{font:700 19px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${ink}}.model,.num{font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${ink}}.empty{font:11px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:.15px;fill:${muted}}.panel{fill:${panel};stroke:${stroke}}.track{fill:${dark ? '#30363D' : '#D8DEE4'}}.bar{fill:#58A6FF;transform-origin:420px center;animation:grow .8s ease-out both}.cube{transform-box:fill-box;transform-origin:center bottom;animation:rise .62s ease-out both}.c1{animation-delay:.05s}.c2{animation-delay:.1s}.c3{animation-delay:.15s}.c4{animation-delay:.2s}.c5{animation-delay:.25s}.c6{animation-delay:.3s}.c7{animation-delay:.35s}.r0{animation:fade .4s .75s both}.r1{animation:fade .4s .83s both}.r2{animation:fade .4s .91s both}.r3{animation:fade .4s .99s both}.r4{animation:fade .4s 1.07s both}.b1{animation-delay:.08s}.b2{animation-delay:.16s}.b3{animation-delay:.24s}.b4{animation-delay:.32s}@keyframes rise{from{opacity:0;transform:scaleY(0)}to{opacity:1;transform:scaleY(1)}}@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes fade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style>
  <text x="24" y="45" class="title">AI WORKBENCH</text><text x="24" y="65" class="subtitle">CODEX CLI · MAC + WINDOWS · @HJCheng0602</text><text x="816" y="49" class="hero" text-anchor="end">${compact(total)} tokens</text><text x="816" y="69" class="label" text-anchor="end">ALL-TIME TOTAL · ${latest}</text>
  <g>${terrain()}</g><text x="128" y="421" class="label">OLDEST</text><text x="568" y="421" class="label">LATEST</text>
  <g class="panel"><rect x="502" y="94" width="314" height="88" rx="10"/></g><text x="522" y="130" class="stat">${active}d</text><text x="522" y="151" class="label">ACTIVE DAYS</text><text x="625" y="130" class="stat">${d.devices.length}</text><text x="625" y="151" class="label">DEVICES</text><text x="729" y="130" class="stat">${d.models.length}</text><text x="729" y="151" class="label">MODELS</text>
  <g class="panel"><rect x="24" y="439" width="792" height="142" rx="11"/></g><text x="45" y="470" class="title" style="font-size:13px">MODEL DISTRIBUTION</text><text x="385" y="470" class="label" text-anchor="end">TOKENS</text><text x="796" y="470" class="label" text-anchor="end">SHARE</text>${rows()}
  <text x="24" y="602" class="subtitle">TRANSPARENT SVG · LOCAL-ONLY AGGREGATES · LIVE MOTION</text></svg>`;
}
mkdirSync('assets', {recursive:true}); writeFileSync('assets/ai-workbench-dark.svg', svg(true)); writeFileSync('assets/ai-workbench-light.svg', svg(false)); console.log(`Rendered transparent workbench: ${compact(total)} tokens.`);
