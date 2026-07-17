import { mkdirSync, writeFileSync } from 'node:fs';

const themes = {
  dark: {
    ink: '#EAF2FF', muted: '#A1B2C9', faint: '#7488A3', panel: '#151C27', panel2: '#101722', stroke: '#3B4F6A', grid: '#2D4058', accent: '#58A6FF', accent2: '#7EE7F5'
  },
  light: {
    ink: '#17243A', muted: '#526A87', faint: '#7B90AA', panel: '#F4F8FE', panel2: '#FFFFFF', stroke: '#BDCCE1', grid: '#D8E3F1', accent: '#0969DA', accent2: '#087EA4'
  }
};

function railNode(x, label, theme, tone = 'accent') {
  const color = tone === 'accent2' ? theme.accent2 : theme.accent;
  return `<g><circle cx="${x}" cy="88" r="10" fill="none" stroke="${color}" stroke-width="1" class="breathRing"/><circle cx="${x}" cy="88" r="3" fill="${color}"/><text x="${x + 12}" y="91" class="railText">${label}</text></g>`;
}

function render(mode) {
  const theme = themes[mode];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="116" viewBox="0 0 840 116" role="img" aria-label="JinCheng Han's GitHub profile header, Peking University undergraduate in Intelligent Science and Technology">
  <style>
    text{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;text-rendering:geometricPrecision}
    .title{font-size:24px;font-weight:700;fill:${theme.ink}}
    .degree{font-size:9px;font-weight:700;fill:${theme.muted}}
    .panelLabel{font-size:8px;font-weight:700;fill:${theme.faint}}
    .panelValue{font-size:10px;font-weight:700;fill:${theme.ink}}
    .railText{font-size:8px;font-weight:700;fill:${theme.muted}}
    .panel{fill:${theme.panel};stroke:${theme.stroke};stroke-width:1}
    .panelHighlight{fill:none;stroke:${theme.accent};stroke-opacity:.25;stroke-width:1;animation:panelBreathe 4.8s ease-in-out 1.35s infinite}
    .grid{stroke:${theme.grid};stroke-width:1}
    .intro,.panelIn{animation:fadeUp 560ms cubic-bezier(.22,1,.36,1) both}
    .breathRing{transform-box:fill-box;transform-origin:center;animation:nodeBreathe 4s ease-in-out 1.35s infinite}
    @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
    @keyframes panelBreathe{0%,100%{stroke-opacity:.18}50%{stroke-opacity:.72}}
    @keyframes nodeBreathe{0%,100%{opacity:.12;transform:scale(.72)}50%{opacity:.7;transform:scale(1.2)}}
    @media(prefers-reduced-motion:reduce){*{animation:none!important}}
  </style>

  <g class="intro"><text x="24" y="37" class="title">JINCHENG HAN'S GITHUB</text><text x="24" y="58" class="degree">PEKING UNIVERSITY | B.S. CANDIDATE, INTELLIGENT SCIENCE &amp; TECHNOLOGY</text></g>
  <g class="panelIn" style="animation-delay:.38s"><rect x="576" y="17" width="240" height="47" rx="8" class="panel"/><rect x="577" y="18" width="238" height="45" rx="7" class="panelHighlight"/><text x="596" y="37" class="panelLabel">UNDERGRADUATE RESEARCH</text><text x="596" y="53" class="panelValue">GPU SYSTEMS + MLSYS</text></g>
  <g class="panelIn" style="animation-delay:.54s"><line x1="24" y1="88" x2="816" y2="88" class="grid"/>${railNode(42, 'GPU KERNELS', theme)}${railNode(222, 'CUDA ARCHITECTURE', theme, 'accent2')}${railNode(466, 'AI SYSTEMS', theme)}${railNode(638, 'VISUAL COMPUTING', theme, 'accent2')}</g>
  <text x="24" y="109" class="panelLabel">HARDWARE-AWARE SYSTEMS RESEARCH</text><text x="816" y="109" text-anchor="end" class="panelLabel">JINCHENG HAN</text>
</svg>`;
}

mkdirSync('assets', { recursive: true });
writeFileSync('assets/profile-header-dark.svg', render('dark'));
writeFileSync('assets/profile-header-light.svg', render('light'));
console.log('Rendered profile header SVG.');
