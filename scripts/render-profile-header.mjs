import { mkdirSync, writeFileSync } from 'node:fs';

const themes = {
  dark: {
    ink: '#E6EDF3', muted: '#9198A1', faint: '#656D76',
    panel: '#161B22', panelOpacity: '.88', edge: '#2D333B', topEdge: '#3D444D',
    accent: '#58A6FF', accent2: '#7EE7F5', accent3: '#BC8CFF', dot: '#2D333B'
  },
  light: {
    ink: '#1F2328', muted: '#59636E', faint: '#818B98',
    panel: '#FFFFFF', panelOpacity: '.82', edge: '#D1D9E0', topEdge: '#B6C2CF',
    accent: '#0969DA', accent2: '#087EA4', accent3: '#8250DF', dot: '#D8DEE4'
  }
};

function railNode(x, label, theme, tone = 'accent', phase = 0) {
  const color = tone === 'accent2' ? theme.accent2 : tone === 'accent3' ? theme.accent3 : theme.accent;
  return `<g><circle cx="${x}" cy="92" r="9" fill="none" stroke="${color}" stroke-width="1" class="ripple" style="animation-delay:${phase}s"/><circle cx="${x}" cy="92" r="9" fill="none" stroke="${color}" stroke-width="1" class="ripple" style="animation-delay:${(phase + 1.8).toFixed(1)}s"/><polygon points="0,-4.5 4.5,0 0,4.5 -4.5,0" transform="translate(${x} 92)" fill="${color}"/><text x="${x + 14}" y="96" class="railText">${label}</text></g>`;
}

function render(mode) {
  const theme = themes[mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="126" viewBox="0 0 840 126" role="img" aria-label="JinCheng Han's GitHub profile header, Peking University undergraduate in Intelligent Science and Technology">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .sans{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif}
    .title{font-size:27px;font-weight:800;letter-spacing:.8px;fill:${theme.ink}}
    .eyebrow{font-size:8.5px;font-weight:600;letter-spacing:2.2px;fill:${theme.faint}}
    .panelLabel{font-size:7.5px;font-weight:600;letter-spacing:1.8px;fill:${theme.faint}}
    .panelValue{font-size:11px;font-weight:700;fill:${theme.ink}}
    .railText{font-size:8px;font-weight:600;letter-spacing:1.4px;fill:${theme.muted}}
    .footText{font-size:8px;font-weight:600;letter-spacing:2px;fill:${theme.faint}}
    .panel{fill:${theme.panel};fill-opacity:${theme.panelOpacity};stroke:${theme.edge};stroke-width:1}
    .topEdge{stroke:${theme.topEdge};stroke-width:1;stroke-opacity:.55}
    .edgeFlow{animation:edgeRun 7s linear infinite}
    .intro,.panelIn{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .ripple{transform-box:fill-box;transform-origin:center;opacity:0;animation:ripple 3.6s cubic-bezier(.25,.6,.35,1) infinite}
    .liveDot{transform-box:fill-box;transform-origin:center;animation:livePulse 2.6s ease-in-out infinite}
    .railPulse{animation:railRun 5.5s cubic-bezier(.45,0,.55,1) 1.8s infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ripple{0%{opacity:0;transform:scale(.5)}18%{opacity:.55}72%{opacity:0;transform:scale(1.5)}100%{opacity:0;transform:scale(1.5)}}
    @keyframes livePulse{0%,100%{opacity:.5}50%{opacity:1}}
    @keyframes edgeRun{to{stroke-dashoffset:0}}
    @keyframes railRun{0%{transform:translateX(0);opacity:0}10%{opacity:.95}88%{opacity:.95}100%{transform:translateX(768px);opacity:0}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <defs>
    <linearGradient id="railGrad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${theme.accent}"/><stop offset=".55" stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent3}"/></linearGradient>
    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${theme.accent2}"/><stop offset="1" stop-color="${theme.accent}"/></linearGradient>
    <radialGradient id="panelGlow" cx=".5" cy=".5" r=".5"><stop stop-color="${theme.accent2}" stop-opacity=".14"/><stop offset="1" stop-color="${theme.accent2}" stop-opacity="0"/></radialGradient>
    <pattern id="dots" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="1.4" cy="1.4" r="1.1" fill="${theme.dot}"/></pattern>
  </defs>

  <rect x="618" y="4" width="198" height="46" fill="url(#dots)" opacity=".75"/>
  <circle cx="704" cy="44" r="86" fill="url(#panelGlow)"/>

  <g class="intro">
    <text x="28" y="27" class="eyebrow">PEKING UNIVERSITY — B.S. CANDIDATE · INTELLIGENT SCIENCE &amp; TECHNOLOGY</text>
    <text x="28" y="56" class="title sans">JINCHENG HAN</text>
    <rect x="29" y="64" width="74" height="3.5" rx="1.75" fill="url(#railGrad)"/>
  </g>

  <g class="panelIn" style="animation-delay:.28s">
    <rect x="592" y="16" width="224" height="58" rx="12" class="panel"/>
    <rect x="593" y="17" width="222" height="56" rx="11" fill="none" stroke="${theme.accent2}" stroke-width="3" stroke-opacity=".16" pathLength="100" stroke-dasharray="16 84" stroke-dashoffset="100" class="edgeFlow"/>
    <rect x="593" y="17" width="222" height="56" rx="11" fill="none" stroke="${theme.accent2}" stroke-width="1.1" stroke-opacity=".85" pathLength="100" stroke-dasharray="16 84" stroke-dashoffset="100" class="edgeFlow"/>
    <line x1="604" y1="17" x2="804" y2="17" class="topEdge"/>
    <rect x="592" y="30" width="3" height="32" rx="1.5" fill="url(#barGrad)"/>
    <text x="610" y="37" class="panelLabel">UNDERGRADUATE RESEARCH</text>
    <text x="610" y="57" class="panelValue">GPU SYSTEMS + MLSYS</text>
    <circle cx="799" cy="30" r="6.5" fill="none" stroke="${theme.accent2}" stroke-width="1" class="ripple" style="animation-delay:.6s"/><circle cx="799" cy="30" r="6.5" fill="none" stroke="${theme.accent2}" stroke-width="1" class="ripple" style="animation-delay:2.4s"/>
    <circle cx="799" cy="30" r="2.6" fill="${theme.accent2}" class="liveDot"/>
  </g>

  <g class="panelIn" style="animation-delay:.48s">
    <line x1="28" y1="92" x2="812" y2="92" stroke="url(#railGrad)" stroke-width="2" stroke-linecap="round" stroke-opacity=".7"/>
    <g class="railPulse"><circle cx="44" cy="92" r="4" fill="${theme.accent2}" opacity=".28"/><circle cx="44" cy="92" r="1.8" fill="${theme.accent2}"/></g>
    ${railNode(36, 'GPU KERNELS', theme)}${railNode(250, 'CUDA ARCHITECTURE', theme, 'accent2', .9)}${railNode(506, 'AI SYSTEMS', theme, 'accent', 1.8)}${railNode(676, 'VISUAL COMPUTING', theme, 'accent3', 2.7)}
  </g>

  <g class="panelIn" style="animation-delay:.62s">
    <text x="28" y="117" class="footText">HARDWARE-AWARE SYSTEMS RESEARCH</text>
    <text x="812" y="117" text-anchor="end" class="footText">JINCHENG HAN</text>
  </g>
</svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/profile-header-dark.svg', render('dark'));
writeFileSync('assets/profile-header-light.svg', render('light'));
console.log('Rendered profile header SVG.');
