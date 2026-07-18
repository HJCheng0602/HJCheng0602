import { mkdirSync, writeFileSync } from 'node:fs';

const themes = {
  dark: {
    ink: '#E6EDF3', muted: '#9198A1', faint: '#656D76',
    panel: '#161B22', panelOpacity: '.88', chip: '#0D1117', edge: '#2D333B', topEdge: '#3D444D', track: '#21262D',
    accent: '#58A6FF', accent2: '#7EE7F5', accent3: '#BC8CFF'
  },
  light: {
    ink: '#1F2328', muted: '#59636E', faint: '#818B98',
    panel: '#FFFFFF', panelOpacity: '.82', chip: '#F6F8FA', edge: '#D1D9E0', topEdge: '#B6C2CF', track: '#EAEFF2',
    accent: '#0969DA', accent2: '#087EA4', accent3: '#8250DF'
  }
};

function stage(x, y, width, label, theme, tone) {
  const color = tone === 'accent2' ? theme.accent2 : tone === 'accent3' ? theme.accent3 : theme.accent;
  return `<g><rect x="${x}" y="${y}" width="${width}" height="22" rx="6" class="chipPanel"/><polygon points="0,-3.2 3.2,0 0,3.2 -3.2,0" transform="translate(${x + 10} ${y + 11})" fill="${color}"/><text x="${x + 18}" y="${y + 15}" class="stageText">${label}</text></g>`;
}

function workRow({ y, index, title, domain, description, note, stages, meter }, theme, delay) {
  const tone = index === 0 ? 'accent' : index === 1 ? 'accent2' : 'accent3';
  const toneColor = tone === 'accent2' ? theme.accent2 : tone === 'accent3' ? theme.accent3 : theme.accent;
  const flow = stages.map((item, stageIndex) => {
    const x = 336 + stages.slice(0, stageIndex).reduce((sum, stageItem) => sum + stageItem.width + 14, 0);
    const arrow = stageIndex ? `<path d="M${x - 10} ${y + 43}h5l-2.6-2.6m2.6 2.6l-2.6 2.6" fill="none" stroke="${theme.faint}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>` : '';
    return `${arrow}${stage(x, y + 32, item.width, item.label, theme, stageIndex % 2 ? 'accent2' : tone)}`;
  }).join('');
  return `<g class="panelIn" style="animation-delay:${delay}s">
    <rect x="28" y="${y}" width="784" height="74" rx="14" class="panel"/>
    <rect x="29" y="${y + 1}" width="782" height="72" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="3" stroke-opacity=".14" pathLength="100" stroke-dasharray="10 90" stroke-dashoffset="100" class="edgeFlow" style="animation-delay:${index * 2.2}s"/>
    <rect x="29" y="${y + 1}" width="782" height="72" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="1.1" stroke-opacity=".8" pathLength="100" stroke-dasharray="10 90" stroke-dashoffset="100" class="edgeFlow" style="animation-delay:${index * 2.2}s"/>
    <line x1="42" y1="${y + 1}" x2="798" y2="${y + 1}" class="topEdge"/>
    <rect x="28" y="${y + 19}" width="3" height="36" rx="1.5" fill="${toneColor}"/>
    <circle cx="57" cy="${y + 37}" r="14" fill="none" stroke="${toneColor}" stroke-width="1" class="ripple" style="animation-delay:${index * .8}s"/>
    <circle cx="57" cy="${y + 37}" r="14" fill="none" stroke="${toneColor}" stroke-width="1" class="ripple" style="animation-delay:${(index * .8 + 1.8).toFixed(1)}s"/>
    <text x="48" y="${y + 43}" class="indexNum">0${index + 1}</text>
    <text x="92" y="${y + 32}" class="project sans">${title}</text>
    <circle cx="93" cy="${y + 47}" r="2" fill="${toneColor}"/><text x="100" y="${y + 50}" class="projectMeta">${domain}</text>
    <line x1="308" y1="${y + 15}" x2="308" y2="${y + 59}" class="grid"/>
    <text x="336" y="${y + 25}" class="flowLabel">${description}</text>${flow}
    <text x="796" y="${y + 25}" text-anchor="end" class="projectMeta">${note}</text>
    <rect x="640" y="${y + 34}" width="156" height="5" rx="2.5" class="track"/><rect x="640" y="${y + 34}" width="${meter}" height="5" rx="2.5" fill="url(#meterGrad)" class="meter"/>
  </g>`;
}

function render(mode) {
  const theme = themes[mode];
  const rows = [
    { y: 74, title: 'nanoPD', domain: 'LLM INFRASTRUCTURE', description: 'PREFILL / DECODE DISAGGREGATION', note: 'FROM-SCRATCH INFERENCE ENGINE', meter: 123, stages: [{ label: 'PREFILL', width: 58 }, { label: 'TRANSFER', width: 66 }, { label: 'DECODE', width: 58 }] },
    { y: 162, title: 'SLAM3R OnlineCam', domain: 'VISUAL COMPUTING', description: 'ONLINE CAMERA TO DENSE 3D', note: 'REAL-TIME RECONSTRUCTION', meter: 103, stages: [{ label: 'STREAM', width: 58 }, { label: 'TRACK', width: 55 }, { label: 'RECON', width: 59 }] },
    { y: 250, title: 'paperwise', domain: 'RESEARCH WORKFLOW', description: 'DEEP READING, RETRIEVAL, CONNECTIONS', note: 'LLM REPORTS / VECTOR KB / KG', meter: 86, stages: [{ label: 'READ', width: 48 }, { label: 'RETRIEVE', width: 68 }, { label: 'CONNECT', width: 66 }] }
  ].map((row, index) => workRow({ ...row, index }, theme, (.24 + index * .14).toFixed(2))).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="364" viewBox="0 0 840 364" role="img" aria-label="JinCheng Han selected work across LLM infrastructure, visual computing, and research workflows">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .sans{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
    .title{font-size:20px;font-weight:800;letter-spacing:.6px;fill:${theme.ink}}
    .eyebrow{font-size:8.5px;font-weight:600;letter-spacing:2.2px;fill:${theme.faint}}
    .indexNum{font-size:17px;font-weight:700;fill:url(#numGrad)}
    .project{font-size:15px;font-weight:700;letter-spacing:.3px;fill:${theme.ink}}
    .projectMeta{font-size:7.5px;font-weight:600;letter-spacing:1.5px;fill:${theme.faint}}
    .flowLabel{font-size:7.5px;font-weight:600;letter-spacing:1.2px;fill:${theme.muted}}
    .stageText{font-size:7.5px;font-weight:600;letter-spacing:1px;fill:${theme.ink}}
    .footText{font-size:8px;font-weight:600;letter-spacing:2px;fill:${theme.faint}}
    .panel{fill:${theme.panel};fill-opacity:${theme.panelOpacity};stroke:${theme.edge};stroke-width:1}
    .chipPanel{fill:${theme.chip};stroke:${theme.edge};stroke-width:1}
    .topEdge{stroke:${theme.topEdge};stroke-width:1;stroke-opacity:.55}
    .edgeFlow{animation:edgeRun 8s linear infinite}
    .ripple{transform-box:fill-box;transform-origin:center;opacity:0;animation:ripple 3.6s cubic-bezier(.25,.6,.35,1) infinite}
    .grid{stroke:${theme.edge};stroke-width:1}
    .track{fill:${theme.track}}
    .intro,.panelIn{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .meter{transform-box:fill-box;transform-origin:0% 50%;animation:growX 620ms cubic-bezier(.22,1,.36,1) .78s both,meterBreathe 3.8s ease-in-out 1.55s infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    @keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    @keyframes meterBreathe{0%,100%{opacity:.62}50%{opacity:1}}
    @keyframes ripple{0%{opacity:0;transform:scale(.5)}18%{opacity:.55}72%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}
    @keyframes edgeRun{to{stroke-dashoffset:0}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <defs>
    <linearGradient id="numGrad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent3}"/></linearGradient>
    <linearGradient id="meterGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset="1" stop-color="${theme.accent2}"/></linearGradient>
    <linearGradient id="footGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset=".55" stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent3}"/></linearGradient>
  </defs>

  <g class="intro">
    <text x="28" y="28" class="eyebrow">SYSTEMS · VISION · RESEARCH TOOLS</text>
    <text x="28" y="52" class="title sans">SELECTED WORK</text>
    <text x="812" y="28" text-anchor="end" class="eyebrow">DESIGN · MEASURE · ITERATE</text>
    <rect x="29" y="60" width="58" height="3" rx="1.5" fill="url(#footGrad)"/>
  </g>

  ${rows}

  <g class="panelIn" style="animation-delay:.66s">
    <line x1="28" y1="338" x2="812" y2="338" stroke="url(#footGrad)" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".55"/>
    <text x="28" y="354" class="footText">SYSTEMS DESIGN · REAL-TIME VISION · KNOWLEDGE WORKFLOWS</text>
    <text x="812" y="354" text-anchor="end" class="footText">JINCHENG HAN</text>
  </g>
</svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/selected-work-dark.svg', render('dark'));
writeFileSync('assets/selected-work-light.svg', render('light'));
console.log('Rendered selected work SVG.');
