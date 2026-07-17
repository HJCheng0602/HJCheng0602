import { mkdirSync, writeFileSync } from 'node:fs';

const themes = {
  dark: {
    ink: '#EAF2FF', muted: '#A1B2C9', faint: '#7488A3', panel: '#151C27', panel2: '#101722', stroke: '#3B4F6A', grid: '#2D4058', track: '#2A3C54', accent: '#58A6FF', accent2: '#7EE7F5', low: '#3979D3', high: '#C2E3FF'
  },
  light: {
    ink: '#17243A', muted: '#526A87', faint: '#7B90AA', panel: '#F4F8FE', panel2: '#FFFFFF', stroke: '#BDCCE1', grid: '#D8E3F1', track: '#D4E0EF', accent: '#0969DA', accent2: '#087EA4', low: '#3687E8', high: '#A8C9F5'
  }
};

function stage(x, y, width, label, theme, tone) {
  const color = tone === 'accent2' ? theme.accent2 : theme.accent;
  return `<g class="stage"><rect x="${x}" y="${y}" width="${width}" height="20" rx="4" class="stagePanel"/><rect x="${x + 7}" y="${y + 8}" width="4" height="4" rx="2" fill="${color}"/><text x="${x + 17}" y="${y + 14}" class="stageText">${label}</text></g>`;
}

function workRow({ y, title, domain, description, note, stages }, theme, delay) {
  const flow = stages.map((item, index) => {
    const x = 316 + stages.slice(0, index).reduce((sum, stageItem) => sum + stageItem.width + 14, 0);
    const arrow = index ? `<path d="M${x - 10} ${y + 42}h5l-3-3m3 3l-3 3" fill="none" stroke="${theme.faint}" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `${arrow}${stage(x, y + 32, item.width, item.label, theme, index % 2 ? 'accent2' : 'accent')}`;
  }).join('');
  return `<g class="panelIn" style="animation-delay:${delay}s"><rect x="24" y="${y}" width="792" height="68" rx="8" class="panel"/><rect x="25" y="${y + 1}" width="790" height="66" rx="7" class="panelHighlight"/>
    <circle cx="52" cy="${y + 34}" r="13" fill="none" stroke="${theme.accent}" stroke-width="1" class="breathRing"/><circle cx="52" cy="${y + 34}" r="5" fill="${theme.accent}"/><circle cx="52" cy="${y + 34}" r="9" fill="none" stroke="${theme.accent2}" stroke-opacity=".55" stroke-width="1"/>
    <text x="72" y="${y + 29}" class="project">${title}</text><text x="72" y="${y + 45}" class="projectMeta">${domain}</text>
    <line x1="288" y1="${y + 14}" x2="288" y2="${y + 54}" class="grid"/>
    <text x="316" y="${y + 21}" class="flowLabel">${description}</text>${flow}
    <text x="588" y="${y + 29}" class="projectMeta">${note}</text><rect x="588" y="${y + 42}" width="188" height="4" rx="2" class="track"/><rect x="588" y="${y + 42}" width="${title === 'nanoPD' ? 148 : title === 'SLAM3R OnlineCam' ? 124 : 104}" height="4" rx="2" fill="${theme.accent2}" class="meter"/>
  </g>`;
}

function render(mode) {
  const theme = themes[mode];
  const rows = [
    { y: 77, title: 'nanoPD', domain: 'LLM INFRASTRUCTURE', description: 'PREFILL / DECODE DISAGGREGATION', note: 'FROM-SCRATCH INFERENCE ENGINE', stages: [{ label: 'PREFILL', width: 58 }, { label: 'TRANSFER', width: 66 }, { label: 'DECODE', width: 58 }] },
    { y: 161, title: 'SLAM3R OnlineCam', domain: 'VISUAL COMPUTING', description: 'ONLINE CAMERA TO DENSE 3D', note: 'REAL-TIME RECONSTRUCTION', stages: [{ label: 'STREAM', width: 58 }, { label: 'TRACK', width: 55 }, { label: 'RECON', width: 59 }] },
    { y: 245, title: 'paperwise', domain: 'RESEARCH WORKFLOW', description: 'DEEP READING, RETRIEVAL, CONNECTIONS', note: 'LLM REPORTS / VECTOR KB / KG', stages: [{ label: 'READ', width: 48 }, { label: 'RETRIEVE', width: 68 }, { label: 'CONNECT', width: 66 }] }
  ].map((row, index) => workRow(row, theme, (.38 + index * .16).toFixed(2))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="354" viewBox="0 0 840 354" role="img" aria-label="JinCheng Han selected work across LLM infrastructure, visual computing, and research workflows">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .title{font-size:20px;font-weight:700;fill:${theme.ink}}
    .eyebrow{font-size:10px;font-weight:700;fill:${theme.muted}}
    .project{font-size:13px;font-weight:700;fill:${theme.ink}}
    .projectMeta{font-size:8px;font-weight:700;fill:${theme.faint}}
    .flowLabel{font-size:8px;font-weight:700;fill:${theme.muted}}
    .stageText{font-size:7.5px;font-weight:700;fill:${theme.ink}}
    .footer{font-size:8px;font-weight:700;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .panelHighlight{fill:none;stroke:${theme.accent};stroke-opacity:.25;stroke-width:1;animation:panelBreathe 4.8s ease-in-out 1.35s infinite}
    .stagePanel{fill:${theme.panel2};stroke:${theme.stroke};stroke-width:1}
    .grid{stroke:${theme.grid};stroke-width:1}
    .track{fill:${theme.track}}
    .intro,.panelIn{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .breathRing{transform-box:fill-box;transform-origin:center;animation:nodeBreathe 4s ease-in-out 1.35s infinite}
    .meter{transform-box:fill-box;transform-origin:0% 50%;animation:growX 620ms cubic-bezier(.22,1,.36,1) .78s both,meterBreathe 3.8s ease-in-out 1.55s infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    @keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes panelBreathe{0%,100%{stroke-opacity:.18}50%{stroke-opacity:.72}}
    @keyframes nodeBreathe{0%,100%{opacity:.12;transform:scale(.72)}50%{opacity:.7;transform:scale(1.2)}}
    @keyframes meterBreathe{0%,100%{opacity:.58}50%{opacity:1}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <g class="intro"><text x="24" y="32" class="title">SELECTED WORK</text><text x="24" y="53" class="eyebrow">SYSTEMS | VISION | RESEARCH TOOLS</text><text x="816" y="32" text-anchor="end" class="eyebrow">DESIGN - MEASURE - ITERATE</text></g>
  ${rows}
  <line x1="24" y1="333" x2="816" y2="333" class="grid"/>
  <text x="24" y="350" class="footer">SYSTEMS DESIGN | REAL-TIME VISION | KNOWLEDGE WORKFLOWS</text><text x="816" y="350" text-anchor="end" class="footer">JINCHENG HAN</text>
</svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/selected-work-dark.svg', render('dark'));
writeFileSync('assets/selected-work-light.svg', render('light'));
console.log('Rendered selected work SVG.');
