import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const data = JSON.parse(readFileSync('data/usage.json', 'utf8'));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[c]));
const compact = (n) => n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n || 0);
const total = data.models.reduce((n, x) => n + (x.tokens || 0), 0);
const active = data.days.filter((x) => x.tokens > 0).length;
const latest = data.updatedAt ? new Date(data.updatedAt).toLocaleDateString('en-CA') : 'Waiting for first sync';
const colors = ['#7dd3fc', '#a78bfa', '#60a5fa', '#38bdf8', '#c084fc'];

function card(label, value, x, y, accent) {
  return `<rect x="${x}" y="${y}" width="172" height="74" rx="12" fill="#111925" stroke="#23334a"/><text x="${x+16}" y="${y+25}" class="label">${label}</text><text x="${x+16}" y="${y+55}" class="value" fill="${accent}">${esc(value)}</text>`;
}
function render(dark) {
  const bg = dark ? '#090d14' : '#f7fafc'; const panel = dark ? '#0d1521' : '#ffffff'; const text = dark ? '#e6edf7' : '#142033'; const muted = dark ? '#8291a7' : '#637289';
  const days = data.days.slice(-14); const max = Math.max(1, ...days.map((x) => x.tokens || 0));
  const bars = days.map((x, i) => { const h = Math.max(6, Math.round(116 * (x.tokens || 0) / max)); const x0 = 44 + i * 51; return `<rect x="${x0}" y="${319-h}" width="29" height="${h}" rx="5" fill="url(#bar)"/><rect x="${x0+4}" y="${319-h-6}" width="21" height="7" rx="3" fill="#c4b5fd" opacity=".8"/>`; }).join('');
  const rows = data.models.slice(0, 4).map((m, i) => { const pct = total ? Math.max(3, Math.round(100 * m.tokens / total)) : 0; return `<text x="54" y="${397+i*28}" class="model">${esc(m.name)}</text><rect x="278" y="${384+i*28}" width="255" height="8" rx="4" fill="#202c3d"/><rect x="278" y="${384+i*28}" width="${255*pct/100}" height="8" rx="4" fill="${colors[i]}"><title>${esc(m.name)}: ${compact(m.tokens)} tokens</title></rect><text x="720" y="${397+i*28}" text-anchor="end" class="amount">${compact(m.tokens)}</text>`; }).join('') || `<text x="54" y="412" class="muted">Your first Codex CLI sync will populate this breakdown.</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="520" viewBox="0 0 840 520"><defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c4b5fd"/><stop offset=".5" stop-color="#60a5fa"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient><style>.title{font:700 21px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.5px;fill:${text}}.label{font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:1.1px;fill:${muted}}.value{font:700 27px ui-monospace,SFMono-Regular,Menlo,monospace}.muted{font:13px ui-monospace,SFMono-Regular,Menlo,monospace;fill:${muted}}.model,.amount{font:600 13px ui-monospace,SFMono-Regular,Menlo,monospace;fill:${text}}</style></defs><rect width="840" height="520" rx="16" fill="${bg}"/><rect x="1" y="1" width="838" height="518" rx="15" fill="none" stroke="${dark ? '#20304a' : '#d8e1ec'}"/><text x="34" y="45" class="title">AI WORKBENCH</text><circle cx="260" cy="39" r="5" fill="#22c55e"/><text x="276" y="44" class="muted">CODEX CLI · MULTI-DEVICE</text><text x="806" y="44" text-anchor="end" class="muted">${esc(latest)}</text>${card('TOTAL TOKENS', compact(total), 34, 72, '#7dd3fc')}${card('ACTIVE DAYS', `${active}d`, 232, 72, '#a78bfa')}${card('DEVICES', data.devices.length, 430, 72, '#60a5fa')}${card('MODELS', data.models.length, 628, 72, '#c4b5fd')}<rect x="34" y="174" width="772" height="174" rx="12" fill="${panel}" stroke="${dark ? '#23334a' : '#d8e1ec'}"/><text x="54" y="205" class="label">14-DAY TOKEN TIMELINE</text><text x="786" y="205" text-anchor="end" class="muted">${total ? 'local data, synced privately by you' : 'READY TO CONNECT'}</text><line x1="54" y1="319" x2="786" y2="319" stroke="${dark ? '#25344a' : '#dbe4ef'}"/>${bars}<rect x="34" y="366" width="772" height="134" rx="12" fill="${panel}" stroke="${dark ? '#23334a' : '#d8e1ec'}"/><text x="54" y="393" class="label">MODEL DISTRIBUTION</text>${rows}</svg>`;
}
mkdirSync('assets', { recursive: true });
writeFileSync('assets/ai-workbench-dark.svg', render(true));
writeFileSync('assets/ai-workbench-light.svg', render(false));
console.log(`Rendered dashboard: ${compact(total)} tokens across ${data.devices.length} device(s).`);
