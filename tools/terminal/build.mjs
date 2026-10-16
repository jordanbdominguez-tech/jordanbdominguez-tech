import fs from 'node:fs';
import { buildReadme } from './readme.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The visual is composed as named SVG groups. All portfolio copy, colors and
// timing come from profile-content.json; no production data is consumed.
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const c = JSON.parse(
  fs.readFileSync(path.join(root, 'profile-content.json'), 'utf8'),
);
const C = c.theme;
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const data = (p, mime) =>
  `data:${mime};base64,${fs.readFileSync(path.join(root, p)).toString('base64')}`;
const text = (x, y, s, size = 24, color = C.text, klass = 'mono', extra = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" class="${klass}" ${extra}>${esc(s)}</text>`;
const rect = (x, y, w, h, fill, stroke = 'none', r = 12, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const line = (x1, y1, x2, y2, color = C.line, width = 1, extra = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const circle = (x, y, r, fill, extra = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const wrap = (s, max) => {
  const lines = [];
  let row = '';
  for (const word of s.split(' ')) {
    if (row && (row + ' ' + word).length > max) {
      lines.push(row);
      row = word;
    } else row += (row ? ' ' : '') + word;
  }
  if (row) lines.push(row);
  return lines;
};
const lines = (
  x,
  y,
  a,
  size = 24,
  color = C.text,
  klass = 'mono',
  leading = 32,
  extra = '',
) =>
  a
    .map((s, i) => text(x, y + i * leading, s, size, color, klass, extra))
    .join('');
const group = (id, start, body) =>
  `<g id="${id}" data-start="${start}">${body}</g>`;
const section = (i, y, name, body) =>
  `<g id="section-${name}" data-typing-section="${i}">${text(52, y, `$ ${name}`, 29, C.cyan) + body}</g>`;
const icon = (name, x, y, size = 42) => {
  const paths = {
    chart: 'M4 36V25H10V36 M17 36V16H23V36 M30 36V5H36V36',
    bolt: 'M25 3L8 24H20L16 39L35 17H23Z',
    database:
      'M5 10C5 2 37 2 37 10C37 18 5 18 5 10 M5 10V30C5 39 37 39 37 30V10 M5 20C5 29 37 29 37 20',
    people:
      'M14 6A6 6 0 1 0 14 18A6 6 0 1 0 14 6 M29 8A5 5 0 0 1 29 18 M3 36V30C3 18 25 18 25 30V36Z M30 23C36 23 39 28 39 34V36',
    trust:
      'M21 2L36 8V21C35 31 28 36 21 40C14 36 7 31 6 21V8Z M13 21L19 27L30 15',
    risk: 'M3 22H10L15 8L24 34L30 18H39',
    delivery: 'M3 12L21 3L39 12L21 21Z M3 22L21 31L39 22 M3 32L21 41L39 32',
  };
  return `<g transform="translate(${x} ${y}) scale(${size / 42})" fill="none" stroke="${C.blue}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.chart}"/></g>`;
};
const tags = (x, y, tags, small = false) => {
  let cursor = x;
  const font = small ? 15 : 16,
    padding = small ? 9 : 13;
  return tags
    .map((tag) => {
      const width = tag.length * font * 0.54 + padding * 2;
      const out =
        rect(cursor, y - 19, width, 29, '#09243d', 'none', 13) +
        text(cursor + padding, y + 1, tag, font, '#a8d9ee', 'sans');
      cursor += width + 8;
      return out;
    })
    .join('');
};
const spark = (x, y, w, h, color, variant = 0) => {
  const values = [
    [0.68, 0.63, 0.72, 0.48, 0.52, 0.37, 0.42, 0.21, 0.27, 0.15, 0.22, 0.12],
    [0.65, 0.52, 0.56, 0.4, 0.5, 0.32, 0.35, 0.45, 0.23, 0.31, 0.2, 0.25],
    [0.3, 0.39, 0.32, 0.49, 0.28, 0.52, 0.34, 0.54, 0.36, 0.25, 0.47, 0.24],
  ][variant % 3];
  const pts = values
    .map((v, i) => `${x + (i * w) / (values.length - 1)},${y + v * h}`)
    .join(' ');
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
};

function miniature(p, x, y, w, h) {
  let s = rect(x, y, w, h, '#f4f8fd', '#9eb6ce', 7);
  s +=
    rect(x, y, w, 26, '#e7eef8', 'none', 7) +
    rect(x, y + 17, w, 9, '#e7eef8', 'none', 0);
  s += text(
    x + 10,
    y + 17,
    p.previewTitle,
    11,
    '#223957',
    'sans',
    'font-weight="700"',
  );
  s += circle(x + w - 12, y + 13, 3, '#36c8bb');
  const px = x + 10,
    py = y + 36,
    iw = w - 20;
  if (p.id === 'finance') {
    for (let i = 0; i < 3; i++) {
      s += rect(
        px + (i * (iw + 6)) / 3,
        py,
        (iw - 12) / 3,
        35,
        '#fff',
        '#dee7f3',
        4,
      );
      s += text(
        px + 6 + (i * (iw + 6)) / 3,
        py + 13,
        ['REVENUE', 'MARGIN', 'OUTLOOK'][i],
        7.5,
        '#607b99',
        'sans',
      );
      s += line(
        px + 6 + (i * (iw + 6)) / 3,
        py + 25,
        px + 27 + (i * (iw + 6)) / 3,
        py + 25,
        ['#3b8ce7', '#12b6b0', '#5065c9'][i],
        3,
      );
    }
    s +=
      rect(px, py + 44, iw * 0.6, 85, '#fff', '#e2eaf3', 4) +
      rect(px + iw * 0.64, py + 44, iw * 0.36, 85, '#fff', '#e2eaf3', 4);
    for (let j = 0; j < 3; j++)
      s += line(
        px + 8,
        py + 67 + j * 21,
        px + iw * 0.6 - 8,
        py + 67 + j * 21,
        '#e9eff6',
      );
    s += spark(px + 8, py + 59, iw * 0.6 - 16, 65, '#22b6bc');
    for (let i = 0; i < 7; i++)
      s += rect(
        px + iw * 0.67 + i * 10,
        py + 112 - (i % 3) * 9,
        5,
        10 + (i % 3) * 9,
        ['#8bc6ed', '#37a0d8', '#1b6db9'][i % 3],
        'none',
        1,
      );
    s += text(px + iw * 0.67, py + 58, 'SIGNALS', 7.5, '#607b99', 'sans');
  } else if (p.id === 'risk') {
    s +=
      rect(px, py, iw * 0.55, 60, '#fff', '#dee7f3', 4) +
      rect(px + iw * 0.59, py, iw * 0.41, 60, '#fff', '#dee7f3', 4);
    s +=
      text(px + 6, py + 13, 'SLA MONITOR', 8, '#607b99', 'sans') +
      spark(px + 6, py + 20, iw * 0.55 - 12, 34, '#22b6bc', 2);
    for (let j = 0; j < 3; j++)
      s +=
        circle(
          px + iw * 0.64,
          py + 15 + j * 15,
          3,
          ['#29b99e', '#e9b756', '#e98178'][j],
        ) +
        line(
          px + iw * 0.69,
          py + 15 + j * 15,
          px + iw - 7,
          py + 15 + j * 15,
          '#cbd7e6',
          2,
        );
    s += rect(px, py + 68, iw, 61, '#fff', '#dee7f3', 4);
    s += text(px + 7, py + 81, 'ESCALATION QUEUE', 8, '#607b99', 'sans');
    for (let j = 0; j < 3; j++) {
      s += line(
        px + 7,
        py + 94 + j * 11,
        px + iw - 8,
        py + 94 + j * 11,
        '#edf1f7',
      );
      s += circle(
        px + 12,
        py + 91 + j * 11,
        2.5,
        ['#2fbaac', '#e3b356', '#5a9bdc'][j],
      );
      s += line(
        px + 23,
        py + 91 + j * 11,
        px + iw * 0.65,
        py + 91 + j * 11,
        '#c9d5e5',
        2,
      );
    }
  } else if (p.id === 'delivery') {
    for (let i = 0; i < 3; i++) {
      const xx = px + (i * (iw + 6)) / 3,
        ww = (iw - 12) / 3;
      s += rect(
        xx,
        py,
        ww,
        24,
        ['#e1f7f2', '#e5efff', '#fff2da'][i],
        'none',
        4,
      );
      s += text(
        xx + 5,
        py + 15,
        ['INTAKE', 'PRIORITY', 'DELIVERY'][i],
        7.5,
        '#496782',
        'sans',
      );
      s += rect(xx, py + 31, ww, 98, '#edf2f9', 'none', 4);
      for (let j = 0; j < 3 - (i % 2); j++) {
        s += rect(xx + 4, py + 36 + j * 29, ww - 8, 24, '#fff', '#dbe6f1', 3);
        s += line(
          xx + 10,
          py + 44 + j * 29,
          xx + ww - 11,
          py + 44 + j * 29,
          '#bfcede',
          2,
        );
        s += rect(
          xx + 10,
          py + 50 + j * 29,
          ww * 0.38,
          4,
          ['#41c3ae', '#5e9ee9', '#e2b75b'][i],
          'none',
          2,
        );
      }
    }
  } else {
    s += line(px + 18, py + 13, px + iw - 18, py + 13, '#bdd8e8', 3);
    for (let i = 0; i < 5; i++)
      s += circle(
        px + 18 + (i * (iw - 36)) / 4,
        py + 13,
        7,
        ['#34bba7', '#34bba7', '#5597e7', '#acbdd2', '#d3deea'][i],
      );
    s +=
      rect(px, py + 33, iw * 0.58, 96, '#fff', '#dee7f3', 4) +
      rect(px + iw * 0.62, py + 33, iw * 0.38, 96, '#fff', '#dee7f3', 4);
    s += text(px + 7, py + 47, 'READINESS', 8, '#607b99', 'sans');
    for (let i = 0; i < 4; i++) {
      s += circle(
        px + 10,
        py + 61 + i * 17,
        3,
        ['#29b99e', '#29b99e', '#e9b756', '#5e9ee9'][i],
      );
      s += line(
        px + 20,
        py + 61 + i * 17,
        px + iw * 0.52,
        py + 61 + i * 17,
        '#cbd7e6',
        3,
      );
    }
    for (let i = 0; i < 4; i++)
      s += rect(
        px + iw * 0.66 + i * 3,
        py + 49 + i * 16,
        iw * 0.28 - i * 6,
        10,
        ['#6bb6e9', '#529cdc', '#3481c3', '#22629b'][i],
        'none',
        2,
      );
  }
  return s;
}

function trustPreview(x, y, w, h) {
  const p = c.projects[0];
  let s = rect(x, y, w, h, '#edf5ff', '#4987b8', 10);
  s +=
    rect(x, y, w, 112, 'url(#trustHero)', 'none', 10) +
    rect(x, y + 95, w, 17, 'url(#trustHero)', 'none', 0);
  s += text(
    x + 20,
    y + 22,
    'AI DECISION TRUST LAB · ' + p.previewTitle.toUpperCase(),
    8.2,
    '#9de2ed',
    'sans',
    'letter-spacing="1"',
  );
  // Editable signal curves echo the supplied screenshot without its UI chrome.
  for (let i = 0; i < 3; i++)
    s += `<path d="M${x + 325} ${y + 104 + i * 3} C${x + 405} ${y + 53 - i * 18},${x + 427} ${y + 110 + i * 6},${x + w - 18} ${y + 32 + i * 12}" fill="none" stroke="${['#5eabce', '#63c0b4', '#9a8abd'][i]}" stroke-width="1.2" opacity=".55"/>`;
  s += `<polyline points="${x + 360},${y + 78} ${x + 398},${y + 36} ${x + 446},${y + 66} ${x + 493},${y + 26} ${x + 548},${y + 45} ${x + 585},${y + 14}" fill="none" stroke="#a4d8e1" stroke-width=".8" opacity=".35"/>`;
  [
    [398, 36],
    [446, 66],
    [493, 26],
    [548, 45],
    [585, 14],
  ].forEach(([dx, dy]) => {
    s += circle(x + dx, y + dy, 2.2, '#a2d7e1', 'opacity=".65"');
  });
  s += lines(
    x + 20,
    y + 56,
    p.hero,
    25,
    '#fff',
    'sans',
    29,
    'font-weight="700"',
  );
  const cw = (w - 40) / 2;
  p.previewActions.forEach((step, i) => {
    const xx = x + 14 + i * (cw + 12);
    s += rect(xx, y + 123, cw, 68, '#fff', '#d5e4f3', 6);
    s += line(
      xx + 7,
      y + 124,
      xx + cw - 7,
      y + 124,
      i ? '#7d6ab6' : '#178b93',
      1.5,
    );
    s += text(
      xx + 12,
      y + 143,
      step,
      12,
      '#234766',
      'sans',
      'font-weight="700"',
    );
    s += line(xx + 12, y + 155, xx + cw - 28, y + 155, '#cfdfed', 2);
    s += rect(
      xx + 12,
      y + 165,
      cw - 24,
      17,
      i ? '#fff' : '#117580',
      i ? '#a9bfd4' : 'none',
      4,
    );
    s += text(
      xx + cw / 2,
      y + 177,
      step,
      7.5,
      i ? '#345e80' : '#fff',
      'sans',
      'text-anchor="middle"',
    );
  });
  return s;
}

const defs = `<defs>
  <style>
    @font-face{font-family:PortfolioMono;src:url('${data('tools/terminal/fonts/DejaVuSansMono.ttf', 'font/ttf')}')}
    @font-face{font-family:PortfolioSans;src:url('${data('tools/terminal/fonts/DejaVuSans.ttf', 'font/ttf')}')}
    @font-face{font-family:PortfolioSans;src:url('${data('tools/terminal/fonts/DejaVuSans-Bold.ttf', 'font/ttf')}');font-weight:700}
    .mono{font-family:PortfolioMono,monospace}.sans{font-family:PortfolioSans,sans-serif}
    text{font-kerning:normal} .card{stroke-width:1.5}
  </style>
  <linearGradient id="card" x2="0" y2="1"><stop stop-color="#07182a"/><stop offset="1" stop-color="#030e1c"/></linearGradient>
  <linearGradient id="flagship" x2="1" y2=".5"><stop stop-color="#08233c"/><stop offset=".48" stop-color="#061728"/><stop offset="1" stop-color="#082a46"/></linearGradient>
  <linearGradient id="trustHero" x2="1" y2=".7"><stop stop-color="#112340"/><stop offset=".55" stop-color="#1c3a5b"/><stop offset="1" stop-color="#0c6b78"/></linearGradient>
  <linearGradient id="landMask" x2="0" y2="1"><stop stop-color="black"/><stop offset=".25" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>
  <linearGradient id="landSides"><stop stop-color="black"/><stop offset=".15" stop-color="white"/><stop offset=".94" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>
  <linearGradient id="wordsShade"><stop stop-color="#020b16" stop-opacity="0"/><stop offset=".4" stop-color="#020b16" stop-opacity=".85"/><stop offset="1" stop-color="#020b16" stop-opacity=".95"/></linearGradient>
  <mask id="fadeLandscape"><rect x="400" y="750" width="1980" height="580" fill="url(#landMask)"/></mask>
  <mask id="fadeSides"><rect x="500" y="735" width="1870" height="623" fill="url(#landSides)"/></mask>
  <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  <clipPath id="frameClip"><rect x="12" y="12" width="2376" height="1336" rx="20"/></clipPath>
  <clipPath id="powerClip"><rect id="power-window" x="0" y="0" width="2400" height="1360" rx="0"/></clipPath>
</defs>`;

let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.render.width}" height="${c.render.height}" viewBox="0 0 2400 1360" role="img" aria-labelledby="visual-title visual-description">
<title id="visual-title">${esc(c.identity.name)} — analytics, automation and AI portfolio</title>
<desc id="visual-description">All six terminal sections, five featured project cards led by AI Decision Trust Lab, supplied impact metrics, and a global data landscape. Project interfaces are illustrative.</desc>${defs}`;
s += rect(0, 0, 2400, 1360, '#01060c', 'none', 0);
s +=
  '<g id="display-scene" clip-path="url(#powerClip)"><g id="portfolio-scene">';
s += rect(0, 0, 2400, 1360, C.background, 'none', 0);
s += `<g clip-path="url(#frameClip)"><g mask="url(#fadeSides)"><image id="landscape" href="${data('tools/terminal/data-landscape.png', 'image/png')}" x="500" y="735" width="1870" height="623" mask="url(#fadeLandscape)"/></g>`;
s += group(
  'terminal-frame',
  0,
  rect(13, 13, 2374, 1334, 'none', '#27629b', 20, 'stroke-width="2"') +
    rect(17, 17, 2366, 1326, 'none', '#183653', 18) +
    rect(14, 14, 2372, 82, '#061321', 'none', 18) +
    rect(14, 72, 2372, 24, '#061321', 'none', 0) +
    line(14, 96, 2386, 96, '#1c3855', 1.5),
);
s += `<rect id="frame-glow" x="13" y="13" width="2374" height="1334" rx="20" fill="none" stroke="#3289de" stroke-width="3" filter="url(#glow)" opacity=".35"/>`;
s +=
  circle(59, 54, 12, '#ff4566') +
  circle(100, 54, 12, '#ffbf3b') +
  circle(141, 54, 12, '#13d985');
s += text(203, 65, c.header, 32, '#9edaf3');
s += text(
  2346,
  63,
  c.headerMotto,
  23,
  '#5d9ed7',
  'mono',
  'text-anchor="end" letter-spacing="4"',
);
s +=
  '<g id="terminal-intro-copy">' +
  lines(52, 148, c.intro, 19, '#b8c9db', 'mono', 31) +
  '</g>';
s += line(52, 210, 92, 210, '#56b9db', 2);
s += section(
  0,
  253,
  'whoami',
  text(52, 304, c.identity.name, 43, C.text) +
    text(52, 345, c.identity.role, 25, C.ice) +
    text(52, 382, c.identity.statement, 24, C.text),
);
s += section(
  1,
  441,
  'impact',
  lines(
    52,
    482,
    c.impact.map((t) => '▸ ' + t),
    23,
    C.text,
    'mono',
    34,
  ),
);
s += section(
  2,
  607,
  'expertise',
  lines(52, 647, c.expertise, 23, C.ice, 'mono', 34),
);
s += section(
  3,
  740,
  'stack',
  lines(
    52,
    780,
    c.stack.map((row) => row.join(c.stackSeparator)),
    21.5,
    C.ice,
    'mono',
    34,
  ),
);
s += section(
  4,
  910,
  'featured_projects',
  lines(
    52,
    951,
    c.projects.map((p) => '▸ ' + p.title),
    23,
    C.text,
    'mono',
    35,
  ),
);
s += section(
  5,
  1170,
  'currently_building',
  text(52, 1212, c.currentlyBuilding, 24, C.text) +
    rect(661, 1189, 13, 27, C.cyan, 'none', 0, 'id="cursor"'),
);
s += rect(52, 126, 12, 24, C.cyan, 'none', 0, 'id="typing-cursor" opacity="0"');

// A wide flagship card preserves the original four-card companion row.
const startX = 970,
  rightW = 1378;
s += text(
  startX,
  145,
  'FEATURED PROJECTS',
  15,
  '#80a4c5',
  'mono',
  'letter-spacing="3"',
);
s += text(
  2348,
  145,
  c.previewLabel,
  12,
  '#6585a4',
  'mono',
  'text-anchor="end" letter-spacing="1.5"',
);
let flagship = rect(
  startX,
  166,
  rightW,
  252,
  'url(#flagship)',
  '#2d729d',
  13,
  'class="card"',
);
flagship +=
  rect(startX + 1, 187, 3, 80, C.cyan, 'none', 1) + icon('trust', 998, 199, 43);
flagship += text(
  1060,
  211,
  '01 / FEATURED',
  12,
  '#5fc9e7',
  'mono',
  'letter-spacing="2"',
);
flagship += text(
  1060,
  249,
  c.projects[0].title,
  31,
  C.text,
  'sans',
  'font-weight="700"',
);
flagship += lines(
  998,
  293,
  wrap(c.projects[0].description, 53),
  19,
  '#b6c9dc',
  'sans',
  28,
);
flagship += tags(998, 379, c.projects[0].tags);
flagship += trustPreview(1707, 190, 613, 204);
s += group('project-trust', c.render.projectStarts[0], flagship);

for (let i = 0; i < 4; i++) {
  const p = c.projects[i + 1],
    x = startX + i * 350,
    y = 440,
    w = 328,
    h = 352;
  let card = rect(x, y, w, h, 'url(#card)', C.line, 12, 'class="card"');
  card += icon(['chart', 'risk', 'delivery', 'people'][i], x + 18, y + 22, 34);
  card += lines(
    x + 64,
    y + 36,
    wrap(p.title, 23),
    18,
    C.text,
    'sans',
    25,
    'font-weight="700"',
  );
  card += lines(
    x + 18,
    y + 99,
    wrap(p.description, 34),
    15.5,
    '#adbed1',
    'sans',
    23,
  );
  card += miniature(p, x + 16, y + 140, w - 32, 174);
  card += tags(x + 16, y + 337, p.tags, true);
  s += group(`project-${p.id}`, c.render.projectStarts[i + 1], card);
}

let metrics = '';
c.metrics.forEach((m, i) => {
  const x = startX + i * 350,
    y = 818;
  metrics += rect(x, y, 328, 154, 'url(#card)', C.line, 11, 'class="card"');
  metrics += icon(m.icon, x + 23, y + 36, 46);
  metrics += text(x + 88, y + 57, m.value, i < 2 ? 37 : 26, C.cyan);
  metrics += lines(x + 88, y + 92, m.label, 17.5, '#c1d1df', 'mono', 26);
});
s += group('metrics', c.render.metricsStart, metrics);
let quote =
  rect(986, 1020, 4, 125, C.cyan, 'none', 1) +
  rect(
    986,
    1020,
    4,
    125,
    C.cyan,
    'none',
    1,
    'filter="url(#glow)" opacity=".65"',
  );
quote += lines(
  1020,
  1052,
  ['“' + c.quote[0], c.quote[1] + '”'],
  30,
  C.ice,
  'mono',
  43,
);
quote += text(1050, 1141, '— ' + c.quoteAttribution, 20, '#6baad5');
quote += rect(2140, 1006, 215, 205, 'url(#wordsShade)', 'none', 0);
quote +=
  lines(
    2192,
    1038,
    c.verticalWords,
    16,
    '#5eaae8',
    'mono',
    30,
    'letter-spacing="4"',
  ) + line(2192, 1192, 2230, 1192, '#55c2eb', 2);
s += group('quote', c.render.quoteStart, quote);
s +=
  rect(14, 1288, 2372, 60, '#020b16', 'none', 0) +
  line(14, 1288, 2386, 1288, '#133550');
s += text(52, 1325, c.footer, 17, '#5d9cd0', 'mono', 'letter-spacing="3"');
s += text(
  2348,
  1325,
  c.microText,
  16,
  '#5d9cd0',
  'mono',
  'text-anchor="end" letter-spacing="3"',
);
s +=
  '</g>' +
  rect(13, 13, 2374, 1334, 'none', '#27629b', 20, 'stroke-width="2"') +
  '</g></g></svg>';

fs.writeFileSync(path.join(root, 'assets/terminal-poster.svg'), s);
// Boot-only layers are omitted from the editable static poster.
let boot = '<g id="boot-layer" opacity="0" pointer-events="none">';
boot += rect(0, 0, 2400, 1360, '#020b16', 'none', 0, 'id="boot-shade"');
boot += '<g id="matrix-rain">';
for (let col = 0; col < c.render.boot.matrixColumns; col++) {
  boot += `<g class="matrix-column" data-column="${col}" transform="translate(${42 + col * 56} 0)">`;
  for (let row = 0; row < 18; row++)
    boot += text(
      0,
      row * 29,
      ((col * 31 + row * 17) % 16).toString(16).toUpperCase(),
      19,
      row === 17 ? '#c0f7ff' : '#28bfd0',
      'mono',
      `opacity="${(0.05 + 0.6 * Math.pow(row / 17, 2)).toFixed(3)}"`,
    );
  boot += '</g>';
}
boot += '</g>';
boot += rect(
  0,
  0,
  2400,
  3,
  '#50ccd9',
  'none',
  0,
  'id="scan-beam" opacity=".22"',
);
boot +=
  '<g id="boot-console">' + rect(794, 509, 812, 248, '#020e1c', '#1d5d77', 12);
boot += text(
  830,
  547,
  'PORTFOLIO / INITIALIZING',
  14,
  '#72a9c8',
  'mono',
  'letter-spacing="3"',
);
boot += text(
  1570,
  547,
  '00%',
  14,
  '#81e5df',
  'mono',
  'id="boot-percent" text-anchor="end" letter-spacing="2"',
);
boot += line(830, 567, 1570, 567, '#184056');
c.render.boot.debugLines.forEach((msg, i) => {
  boot += text(
    830,
    603 + i * 34,
    msg,
    22,
    i === 2 ? '#81e5df' : '#b0d0df',
    'mono',
    `data-debug="${i}"`,
  );
});
boot +=
  rect(830, 725, 740, 3, '#143349', 'none', 1) +
  rect(830, 725, 0, 3, '#4fe3e1', 'none', 1, 'id="boot-progress"');
boot += '</g>';
boot +=
  '<g id="glitch-band" opacity="0">' +
  rect(42, 450, 2316, 2, '#20bac7', 'none', 0) +
  rect(42, 463, 780, 10, '#448ff0', 'none', 0, 'opacity=".18"') +
  rect(1510, 810, 800, 7, '#20d2dc', 'none', 0, 'opacity=".25"') +
  '</g></g>';
const animatedSvg = s.replace(
  '</g></g></svg>',
  '</g>' +
    boot +
    '</g>' +
    rect(
      1200,
      678,
      0,
      4,
      '#b4fcff',
      'none',
      2,
      'id="power-flare" opacity="0"',
    ) +
    '</svg>',
);
const animationSource = fs.readFileSync(
  path.join(root, 'tools/terminal/animation.js'),
  'utf8',
);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jordan Dominguez · Terminal preview</title><style>
*{box-sizing:border-box}body{margin:0;background:#020811;color:#c4d8e9;font:14px system-ui,sans-serif}#stage{width:100%;line-height:0}#stage>svg{width:100%;height:auto;display:block}.toolbar{display:flex;gap:14px;align-items:center;padding:18px 22px;border-top:1px solid #173b5b;flex-wrap:wrap}button,a{background:#0b2840;color:#a1e6f3;border:1px solid #27516c;border-radius:6px;padding:9px 14px;text-decoration:none;font:inherit}button{cursor:pointer}.note{color:#809cb4;max-width:960px;margin:0;padding:0 22px 22px;line-height:1.6}.render .toolbar,.render .note{display:none}.render{overflow:hidden}
</style></head><body><main id="stage">${animatedSvg}</main><div class="toolbar"><strong>GitHub profile · Terminal preview</strong><button id="replay">Replay intro</button><button id="poster">Hold full composition</button><a href="../assets/terminal-intro.mp4">MP4</a><a href="../assets/terminal-intro.gif">GIF</a><a href="../assets/terminal-poster.png">PNG</a></div><p class="note">Portfolio animation preview. Project interfaces are illustrative; charts do not represent reported outcomes.</p><script>
const timing=${JSON.stringify(c.render)};
${animationSource}
</script></body></html>`;
fs.mkdirSync(path.join(root, 'preview'), { recursive: true });
fs.writeFileSync(path.join(root, 'preview/terminal.html'), html);
buildReadme(root, c);
console.log('Built self-contained SVG and local terminal preview.');
