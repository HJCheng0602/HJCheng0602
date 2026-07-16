import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const total = d.models.reduce((n, m) => n + (m.tokens || 0), 0);
const compact = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${n || 0}`;
const safe = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const colors = [['#58A6FF','#388BFD','#1F6FEB'], ['#A5D6FF','#58A6FF','#388BFD'], ['#79C0FF','#1F6FEB','#0D419D']];

function cube(x, y, z, i, delay) {
  const [top, right, left] = colors[i % colors.length], s = 11, yy = y - z * 12;
  return `<g class="cube c${delay % 8}"><polygon points="${x},${yy} ${x+s},${yy+s/2} ${x},${yy+s} ${x-s},${yy+s/2}" fill="${top}" stroke="#b6d9ff" stroke-opacity=".18" stroke-width=".45"/><polygon points="${x+s},${yy+s/2} ${x+s},${yy+s/2+12} ${x},${yy+s+12} ${x},${yy+s}" fill="${right}"/><polygon points="${x},${yy+s} ${x},${yy+s+12} ${x-s},${yy+s/2+12} ${x-s},${yy+s/2}" fill="${left}"/></g>`;
}
function terrain() {
  const days = d.days.slice(-22), max = Math.max(1, ...days.map(x => x.tokens || 0));
  if (!days.length) return `<text x="250" y="292" class="empty">YOUR FIRST SYNC WILL BUILD THIS TERRAIN</text>`;
  const peak = Math.max(...days.map(x => x.tokens || 0)), peakIndex = days.findIndex(x => x.tokens === peak);
  const ridge = days.map((day, i) => {
    const h = Math.max(1, Math.round(10 * (day.tokens || 0) / max)), x = 185 + i * 108, y = 180 + i * 58;
    const tower = Array.from({length:h}, (_, z) => cube(x, y, z, i, i + z)).join('');
    const base = i % 2 ? cube(x - 11, y + 6, 0, 0, i + 3) : '';
    const label = i === peakIndex ? `<g class="peak"><line x1="${x}" y1="${y-h*12-7}" x2="${x}" y2="${y-h*12-34}" class="pin"/><rect x="${x-50}" y="${y-h*12-55}" width="100" height="20" rx="10" class="pill"/><text x="${x}" y="${y-h*12-41}" text-anchor="middle" class="peakText">${compact(day.tokens)} · ${day.date.slice(5)}</text></g>` : '';
    return tower + base + label;
  }).join('');
  const labels = days.map((day, i) => `<text x="${167 + i * 108}" y="421" class="axis">${day.date.slice(5)}</text>`).join('');
  return ridge + labels;
}
function rows() {
  return d.models.slice(0, 5).map((m, i) => { const p = total ? Math.max(8, Math.round(195 * m.tokens / total)) : 0, y = 511 + i * 23, hue = i ? '#79C0FF' : '#58A6FF'; return `<g class="row r${i}"><circle cx="47" cy="${y-5}" r="8" fill="${hue}" opacity=".22"/><path d="M43 ${y-5}h8M47 ${y-9}v8" stroke="${hue}" stroke-width="1.5" stroke-linecap="round"/><text x="63" y="${y}" class="model">${safe(m.name)}</text><text x="409" y="${y}" class="num" text-anchor="end">${compact(m.tokens)}</text><rect x="438" y="${y-10}" width="195" height="7" rx="3.5" class="track"/><rect x="438" y="${y-10}" width="${p}" height="7" rx="3.5" class="bar b${i}"/><text x="796" y="${y}" class="share" text-anchor="end">${total ? `${Math.round(m.tokens / total * 100)}%` : '—'}</text></g>`; }).join('') || `<text x="45" y="511" class="empty">NO MODEL DATA YET — SYNC FROM MAC OR WINDOWS TO BEGIN</text>`;
}
function svg(dark) {
  const ink = dark ? '#F0F6FC' : '#24292F', muted = dark ? '#8B949E' : '#57606A', panel = dark ? '#161B22' : '#F6F8FA', stroke = dark ? '#30363D' : '#D0D7DE';
  const active = d.days.filter(x => x.tokens > 0).length, latest = d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('en-CA') : 'SYNC PENDING';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="608" viewBox="0 0 840 608" role="img" aria-label="AI coding statistics"><style>
  .title{font:700 18px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:.2px;fill:${ink}}.subtitle,.label{font:600 10px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:.7px;fill:${muted}}.hero{font:750 31px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:-1.2px;fill:#58A6FF}.stat{font:700 19px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${ink}}.model{font:600 13px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${ink}}.num{font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${muted}}.share{font:700 12px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${ink}}.axis{font:10px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${muted}}.peakText{font:600 10px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;fill:${ink}}.empty{font:11px -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;letter-spacing:.15px;fill:${muted}}.panel{fill:${panel};stroke:${stroke}}.pill{fill:${panel};stroke:${stroke}}.pin{stroke:#79C0FF;stroke-width:1.2;stroke-opacity:.8}.track{fill:${dark ? '#30363D' : '#D8DEE4'}}.bar{fill:#58A6FF;transform-origin:420px center;animation:grow .8s ease-out both}.cube{animation:appear .55s ease-out both}.peak{animation:fade .45s 1.1s both}.c1{animation-delay:.05s}.c2{animation-delay:.1s}.c3{animation-delay:.15s}.c4{animation-delay:.2s}.c5{animation-delay:.25s}.c6{animation-delay:.3s}.c7{animation-delay:.35s}.r0{animation:fade .4s .75s both}.r1{animation:fade .4s .83s both}.r2{animation:fade .4s .91s both}.r3{animation:fade .4s .99s both}.r4{animation:fade .4s 1.07s both}.b1{animation-delay:.08s}.b2{animation-delay:.16s}.b3{animation-delay:.24s}.b4{animation-delay:.32s}@keyframes appear{from{opacity:0}to{opacity:1}}@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes fade{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style>
  <text x="24" y="45" class="title">AI WORKBENCH</text><text x="24" y="65" class="subtitle">CODEX CLI · MAC + WINDOWS · @HJCheng0602</text><text x="816" y="49" class="hero" text-anchor="end">${compact(total)} tokens</text><text x="816" y="69" class="label" text-anchor="end">ALL-TIME TOTAL · ${latest}</text>
  <g>${terrain()}</g>
  <g class="panel"><rect x="502" y="94" width="314" height="88" rx="10"/></g><text x="522" y="130" class="stat">${active}d</text><text x="522" y="151" class="label">ACTIVE DAYS</text><text x="625" y="130" class="stat">${d.devices.length}</text><text x="625" y="151" class="label">DEVICES</text><text x="729" y="130" class="stat">${d.models.length}</text><text x="729" y="151" class="label">MODELS</text>
  <g class="panel"><rect x="24" y="439" width="792" height="142" rx="11"/></g><text x="45" y="470" class="title" style="font-size:13px">MODEL DISTRIBUTION</text><text x="409" y="470" class="label" text-anchor="end">TOKENS</text><text x="796" y="470" class="label" text-anchor="end">SHARE</text>${rows()}
  <text x="24" y="602" class="subtitle">TRANSPARENT SVG · LOCAL-ONLY AGGREGATES · LIVE MOTION</text></svg>`;
}
mkdirSync('assets', {recursive:true}); writeFileSync('assets/ai-workbench-dark.svg', svg(true)); writeFileSync('assets/ai-workbench-light.svg', svg(false)); console.log(`Rendered transparent workbench: ${compact(total)} tokens.`);
