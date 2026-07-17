import { mkdirSync, writeFileSync } from 'node:fs';

const themes = {
  dark: {
    ink: '#EAF2FF', muted: '#A1B2C9', faint: '#7488A3', panel: '#151C27', panel2: '#101722', stroke: '#3B4F6A', grid: '#2D4058', track: '#2A3C54', accent: '#58A6FF', accent2: '#7EE7F5', low: '#3979D3', high: '#C2E3FF'
  },
  light: {
    ink: '#17243A', muted: '#526A87', faint: '#7B90AA', panel: '#F4F8FE', panel2: '#FFFFFF', stroke: '#BDCCE1', grid: '#D8E3F1', track: '#D4E0EF', accent: '#0969DA', accent2: '#087EA4', low: '#3687E8', high: '#A8C9F5'
  }
};

function chip(x, y, width, label, theme, tone = 'accent') {
  const color = tone === 'accent2' ? theme.accent2 : theme.accent;
  return `<g class="chip"><rect x="${x}" y="${y}" width="${width}" height="21" rx="5" class="chipPanel"/><rect x="${x + 8}" y="${y + 8}" width="4" height="4" rx="2" fill="${color}"/><text x="${x + 18}" y="${y + 14}" class="chipText">${label}</text></g>`;
}

function node(x, y, label, detail, theme, tone = 'accent') {
  const color = tone === 'accent2' ? theme.accent2 : theme.accent;
  return `<g class="focusNode"><circle cx="${x}" cy="${y}" r="12" fill="none" stroke="${color}" stroke-width="1" class="breathRing"/><circle cx="${x}" cy="${y}" r="4" fill="${color}"/><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${color}" stroke-opacity=".35" stroke-width="1"/><text x="${x + 15}" y="${y - 1}" class="nodeLabel">${label}</text><text x="${x + 15}" y="${y + 11}" class="nodeDetail">${detail}</text></g>`;
}

function render(mode) {
  const theme = themes[mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="326" viewBox="0 0 840 326" role="img" aria-label="JinCheng Han technical focus across GPU kernels, AI systems, and MLSys research">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .title{font-size:20px;font-weight:700;fill:${theme.ink}}
    .eyebrow{font-size:10px;font-weight:700;fill:${theme.muted}}
    .section{font-size:11px;font-weight:700;fill:${theme.ink}}
    .sectionMeta{font-size:8px;font-weight:700;fill:${theme.faint}}
    .chipText{font-size:8px;font-weight:700;fill:${theme.ink}}
    .nodeLabel{font-size:9px;font-weight:700;fill:${theme.ink}}
    .nodeDetail{font-size:7.5px;font-weight:700;fill:${theme.muted}}
    .footer{font-size:8px;font-weight:700;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .panelHighlight{fill:none;stroke:${theme.accent};stroke-opacity:.25;stroke-width:1;animation:panelBreathe 4.8s ease-in-out 1.35s infinite}
    .chipPanel{fill:${theme.panel2};stroke:${theme.stroke};stroke-width:1}
    .grid{stroke:${theme.grid};stroke-width:1}
    .track{fill:${theme.track}}
    .intro,.panelIn{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .breathRing{transform-box:fill-box;transform-origin:center;animation:nodeBreathe 4s ease-in-out 1.35s infinite}
    .signal{transform-box:fill-box;transform-origin:0% 50%;animation:signalFlow 3.8s ease-in-out 1.35s infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes panelBreathe{0%,100%{stroke-opacity:.18}50%{stroke-opacity:.72}}
    @keyframes nodeBreathe{0%,100%{opacity:.12;transform:scale(.72)}50%{opacity:.7;transform:scale(1.2)}}
    @keyframes signalFlow{0%,100%{opacity:.5;transform:scaleX(.78)}50%{opacity:1;transform:scaleX(1)}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <g class="intro"><text x="24" y="32" class="title">TECHNICAL FOCUS</text><text x="24" y="53" class="eyebrow">GPU KERNELS | AI SYSTEMS | MLSYS RESEARCH</text><text x="816" y="32" text-anchor="end" class="eyebrow">BUILD - PROFILE - VALIDATE</text></g>

  <g class="panelIn" style="animation-delay:.38s"><rect x="24" y="76" width="248" height="202" rx="8" class="panel"/><rect x="25" y="77" width="246" height="200" rx="7" class="panelHighlight"/>
    <text x="44" y="105" class="section">KERNEL ENGINEERING</text><text x="44" y="120" class="sectionMeta">CUDA C++ TO PTX / SASS</text>
    <line x1="44" y1="135" x2="252" y2="135" class="grid"/>
    <path d="M49 181h48v-12h48v-12h48v-12h42" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linejoin="round"/>
    <rect x="49" y="182" width="48" height="8" rx="2" fill="${theme.low}" class="signal"/><rect x="97" y="170" width="48" height="8" rx="2" fill="${theme.accent}" class="signal"/><rect x="145" y="158" width="48" height="8" rx="2" fill="${theme.accent2}" class="signal"/><rect x="193" y="146" width="42" height="8" rx="2" fill="${theme.high}" class="signal"/>
    <text x="49" y="207" class="sectionMeta">TILE - LOAD - SCHEDULE - EXECUTE</text>
    ${chip(44, 229, 58, 'GEMM', theme)}${chip(108, 229, 89, 'FLASHATTN', theme, 'accent2')}${chip(203, 229, 49, 'TOPK', theme)}
  </g>

  <g class="panelIn" style="animation-delay:.54s"><rect x="296" y="76" width="248" height="202" rx="8" class="panel"/><rect x="297" y="77" width="246" height="200" rx="7" class="panelHighlight"/>
    <text x="316" y="105" class="section">GPU ARCHITECTURE</text><text x="316" y="120" class="sectionMeta">HOPPER / BLACKWELL</text>
    <line x1="316" y1="135" x2="524" y2="135" class="grid"/>
    <line x1="332" y1="157" x2="332" y2="239" class="grid"/>
    ${node(332, 161, 'MEMORY PATH', 'TMA  |  DSM  |  TMEM', theme)}
    ${node(332, 195, 'EXECUTION', 'WARPS  |  CLUSTERS  |  UMMA', theme, 'accent2')}
    ${node(332, 229, 'PERFORMANCE', 'OCCUPANCY  |  CARVEOUT', theme)}
    ${chip(316, 247, 94, 'CUTLASS', theme)}${chip(416, 247, 69, 'CUTE', theme, 'accent2')}
  </g>

  <g class="panelIn" style="animation-delay:.70s"><rect x="568" y="76" width="248" height="202" rx="8" class="panel"/><rect x="569" y="77" width="246" height="200" rx="7" class="panelHighlight"/>
    <text x="588" y="105" class="section">SYSTEMS RESEARCH</text><text x="588" y="120" class="sectionMeta">MEASURED, END-TO-END WORK</text>
    <line x1="588" y1="135" x2="796" y2="135" class="grid"/>
    ${chip(588, 151, 105, 'LLM INFERENCE', theme)}${chip(699, 151, 83, 'MLSYS', theme, 'accent2')}
    ${node(604, 195, 'PROFILE', 'NSIGHT COMPUTE  +  NSYS', theme)}
    ${node(604, 228, 'RESEARCH', 'SYSTEMS  +  VISUAL COMPUTING', theme, 'accent2')}
    <text x="588" y="260" class="sectionMeta">SLAM3R - DENSE RECONSTRUCTION</text>
  </g>

  <line x1="24" y1="300" x2="816" y2="300" class="grid"/>
  <text x="24" y="317" class="footer">SOURCE-DRIVEN STUDY | HARDWARE-AWARE DESIGN | REPRODUCIBLE MEASUREMENT</text><text x="816" y="317" text-anchor="end" class="footer">JINCHENG HAN</text>
</svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/focus-dark.svg', render('dark'));
writeFileSync('assets/focus-light.svg', render('light'));
console.log('Rendered technical focus SVG.');
