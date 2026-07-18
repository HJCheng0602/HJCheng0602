import { mkdirSync, writeFileSync } from 'node:fs';

const themes = {
  dark: {
    ink: '#E6EDF3', muted: '#9198A1', faint: '#656D76',
    panel: '#161B22', panelOpacity: '.88', chip: '#0D1117', edge: '#2D333B', topEdge: '#3D444D',
    accent: '#58A6FF', accent2: '#7EE7F5', accent3: '#BC8CFF'
  },
  light: {
    ink: '#1F2328', muted: '#59636E', faint: '#818B98',
    panel: '#FFFFFF', panelOpacity: '.82', chip: '#F6F8FA', edge: '#D1D9E0', topEdge: '#B6C2CF',
    accent: '#0969DA', accent2: '#087EA4', accent3: '#8250DF'
  }
};

function chip(x, y, width, label, theme, tone = 'accent') {
  const color = tone === 'accent2' ? theme.accent2 : tone === 'accent3' ? theme.accent3 : theme.accent;
  return `<g><rect x="${x}" y="${y}" width="${width}" height="22" rx="6" class="chipPanel"/><polygon points="0,-3.4 3.4,0 0,3.4 -3.4,0" transform="translate(${x + 11} ${y + 11})" fill="${color}"/><text x="${x + 20}" y="${y + 15}" class="chipText">${label}</text></g>`;
}

function node(x, y, label, detail, theme, tone = 'accent', phase = 0) {
  const color = tone === 'accent2' ? theme.accent2 : tone === 'accent3' ? theme.accent3 : theme.accent;
  return `<g><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${color}" stroke-width="1" class="ripple" style="animation-delay:${phase}s"/><circle cx="${x}" cy="${y}" r="8" fill="none" stroke="${color}" stroke-width="1" class="ripple" style="animation-delay:${(phase + 1.8).toFixed(1)}s"/><circle cx="${x}" cy="${y}" r="3.2" fill="${color}"/><text x="${x + 14}" y="${y - 1}" class="nodeLabel">${label}</text><text x="${x + 14}" y="${y + 11}" class="nodeDetail">${detail}</text></g>`;
}

function panelFrame(x, width, title, meta, theme, tone, delay) {
  const color = tone === 'accent2' ? theme.accent2 : tone === 'accent3' ? theme.accent3 : theme.accent;
  return `<rect x="${x}" y="74" width="${width}" height="220" rx="14" class="panel"/><rect x="${x + 1}" y="75" width="${width - 2}" height="218" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="3" stroke-opacity=".15" pathLength="100" stroke-dasharray="14 86" stroke-dashoffset="100" class="edgeFlow" style="animation-delay:${delay}s"/><rect x="${x + 1}" y="75" width="${width - 2}" height="218" rx="13" fill="none" stroke="${theme.accent2}" stroke-width="1.1" stroke-opacity=".8" pathLength="100" stroke-dasharray="14 86" stroke-dashoffset="100" class="edgeFlow" style="animation-delay:${delay}s"/><line x1="${x + 14}" y1="75" x2="${x + width - 14}" y2="75" class="topEdge"/><rect x="${x + 18}" y="91" width="6" height="6" rx="1.5" fill="${color}"/><text x="${x + 32}" y="98" class="section sans">${title}</text><text x="${x + 18}" y="116" class="sectionMeta">${meta}</text><line x1="${x + 18}" y1="130" x2="${x + width - 18}" y2="130" class="grid"/>`;
}

function render(mode) {
  const theme = themes[mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="340" viewBox="0 0 840 340" role="img" aria-label="JinCheng Han technical focus across GPU kernels, AI systems, and MLSys research">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .sans{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
    .title{font-size:20px;font-weight:800;letter-spacing:.6px;fill:${theme.ink}}
    .eyebrow{font-size:8.5px;font-weight:600;letter-spacing:2.2px;fill:${theme.faint}}
    .section{font-size:12.5px;font-weight:700;letter-spacing:.4px;fill:${theme.ink}}
    .sectionMeta{font-size:7.5px;font-weight:600;letter-spacing:1.5px;fill:${theme.faint}}
    .chipText{font-size:7.5px;font-weight:600;letter-spacing:1px;fill:${theme.ink}}
    .nodeLabel{font-size:9px;font-weight:700;letter-spacing:.5px;fill:${theme.ink}}
    .nodeDetail{font-size:7.5px;font-weight:600;letter-spacing:.8px;fill:${theme.muted}}
    .footText{font-size:8px;font-weight:600;letter-spacing:2px;fill:${theme.faint}}
    .panel{fill:${theme.panel};fill-opacity:${theme.panelOpacity};stroke:${theme.edge};stroke-width:1}
    .chipPanel{fill:${theme.chip};stroke:${theme.edge};stroke-width:1}
    .topEdge{stroke:${theme.topEdge};stroke-width:1;stroke-opacity:.55}
    .edgeFlow{animation:edgeRun 7.5s linear infinite}
    .grid{stroke:${theme.edge};stroke-width:1}
    .intro,.panelIn{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .ripple{transform-box:fill-box;transform-origin:center;opacity:0;animation:ripple 3.6s cubic-bezier(.25,.6,.35,1) infinite}
    .drawLine{stroke-dasharray:420;animation:drawIn 1.1s cubic-bezier(.4,0,.2,1) .5s both}
    .areaFade{animation:fadeIn 700ms ease-out 1.1s both}
    .glowDot{transform-box:fill-box;transform-origin:center;animation:livePulse 2.6s ease-in-out infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes drawIn{from{stroke-dashoffset:420}to{stroke-dashoffset:0}}
    @keyframes ripple{0%{opacity:0;transform:scale(.5)}18%{opacity:.55}72%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}
    @keyframes livePulse{0%,100%{opacity:.5}50%{opacity:1}}
    @keyframes edgeRun{to{stroke-dashoffset:0}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <defs>
    <linearGradient id="stepFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.accent}" stop-opacity=".32"/><stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/></linearGradient>
    <linearGradient id="tlGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent3}"/></linearGradient>
    <linearGradient id="footGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset=".55" stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent3}"/></linearGradient>
    <radialGradient id="dotGlow" cx=".5" cy=".5" r=".5"><stop stop-color="${theme.accent2}" stop-opacity=".5"/><stop offset="1" stop-color="${theme.accent2}" stop-opacity="0"/></radialGradient>
  </defs>

  <g class="intro">
    <text x="28" y="28" class="eyebrow">GPU KERNELS · AI SYSTEMS · MLSYS RESEARCH</text>
    <text x="28" y="52" class="title sans">TECHNICAL FOCUS</text>
    <text x="812" y="28" text-anchor="end" class="eyebrow">BUILD · PROFILE · VALIDATE</text>
    <rect x="29" y="60" width="58" height="3" rx="1.5" fill="url(#footGrad)"/>
  </g>

  <g class="panelIn" style="animation-delay:.24s">
    ${panelFrame(28, 250, 'KERNEL ENGINEERING', 'CUDA C++ TO PTX / SASS', theme, 'accent', 0)}
    <g class="areaFade"><path d="M46 226V206H99V188H152V170H205V152H258V226Z" fill="url(#stepFill)"/></g>
    <path d="M46 226V206H99V188H152V170H205V152H258" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linejoin="round" class="drawLine"/>
    <circle cx="258" cy="152" r="7" fill="url(#dotGlow)" class="glowDot"/><circle cx="258" cy="152" r="2.6" fill="${theme.accent2}" class="glowDot"/>
    <text x="46" y="242" class="sectionMeta">TILE · LOAD · SCHEDULE · EXECUTE</text>
    ${chip(46, 252, 56, 'GEMM', theme)}${chip(110, 252, 92, 'FLASHATTN', theme, 'accent2')}${chip(210, 252, 50, 'TOPK', theme, 'accent3')}
  </g>

  <g class="panelIn" style="animation-delay:.38s">
    ${panelFrame(295, 250, 'GPU ARCHITECTURE', 'HOPPER / BLACKWELL', theme, 'accent2', 2.4)}
    <line x1="327" y1="152" x2="327" y2="238" stroke="url(#tlGrad)" stroke-width="2" stroke-linecap="round" stroke-opacity=".65"/>
    ${node(327, 154, 'MEMORY PATH', 'TMA · DSM · TMEM', theme, 'accent', .4)}
    ${node(327, 196, 'EXECUTION', 'WARPS · CLUSTERS · UMMA', theme, 'accent2', 1.1)}
    ${node(327, 238, 'PERFORMANCE', 'OCCUPANCY · CARVEOUT', theme, 'accent3', 1.8)}
    ${chip(313, 256, 92, 'CUTLASS', theme)}${chip(413, 256, 62, 'CUTE', theme, 'accent2')}
  </g>

  <g class="panelIn" style="animation-delay:.52s">
    ${panelFrame(562, 250, 'SYSTEMS RESEARCH', 'MEASURED, END-TO-END WORK', theme, 'accent3', 4.8)}
    ${chip(580, 146, 104, 'LLM INFERENCE', theme)}${chip(692, 146, 62, 'MLSYS', theme, 'accent2')}
    <line x1="594" y1="190" x2="594" y2="232" stroke="url(#tlGrad)" stroke-width="2" stroke-linecap="round" stroke-opacity=".65"/>
    ${node(594, 192, 'PROFILE', 'NSIGHT COMPUTE + NSYS', theme, 'accent', .7)}
    ${node(594, 234, 'RESEARCH', 'SYSTEMS + VISUAL COMPUTING', theme, 'accent2', 1.5)}
    <rect x="580" y="254" width="3" height="14" rx="1.5" fill="${theme.accent3}"/>
    <text x="591" y="264" class="sectionMeta">SLAM3R — DENSE RECONSTRUCTION</text>
  </g>

  <g class="panelIn" style="animation-delay:.66s">
    <line x1="28" y1="314" x2="812" y2="314" stroke="url(#footGrad)" stroke-width="1.5" stroke-linecap="round" stroke-opacity=".55"/>
    <text x="28" y="330" class="footText">SOURCE-DRIVEN STUDY · HARDWARE-AWARE DESIGN · REPRODUCIBLE MEASUREMENT</text>
    <text x="812" y="330" text-anchor="end" class="footText">JINCHENG HAN</text>
  </g>
</svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/focus-dark.svg', render('dark'));
writeFileSync('assets/focus-light.svg', render('light'));
console.log('Rendered technical focus SVG.');
