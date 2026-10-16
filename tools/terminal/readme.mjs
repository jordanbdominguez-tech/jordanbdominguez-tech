import fs from 'node:fs';
import path from 'node:path';

const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ],
  );
const icons = {
  portfolio:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6.5h14M5 17.5h14"/>',
  linkedin:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7.5 10v7M11.5 17v-7m0 3a3 3 0 0 1 6 0v4"/><circle cx="7.5" cy="7" r=".6" fill="currentColor"/>',
  caseStudy:
    '<path d="M3 8V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v1M3 9h18l-2 10H5L3 9Z"/>',
  liveDemo: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
};

export function buildReadme(root, config) {
  const content = config.readme,
    theme = config.theme;
  const project = config.projects.find(
    (project) => project.id === content.featuredProjectId,
  );
  if (!project) throw new Error('README featured project does not exist');
  for (const [name, url] of Object.entries(content.links)) {
    if (url !== null && new URL(url).protocol !== 'https:')
      throw new Error(`Use an HTTPS URL for ${name}`);
  }
  const directory = path.join(root, 'assets/links');
  fs.mkdirSync(directory, { recursive: true });
  function badge(key, label, width) {
    const ready = Boolean(content.links[key]);
    const optional = ['caseStudy', 'liveDemo'].includes(key);
    const pending = optional && !ready;
    const subtitle = pending ? 'COMING SOON' : null;
    const alt = label + (pending ? ' — Coming soon' : '');
    const color = pending ? theme.muted : theme.ice;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="48" viewBox="0 0 ${width} 48" role="img" aria-label="${escape(alt)}">
  <title>${escape(alt)}</title>
  <defs><linearGradient id="surface" x2="1" y2="1"><stop stop-color="${pending ? '#091725' : '#0b263c'}"/><stop offset="1" stop-color="${theme.panel}"/></linearGradient></defs>
  <rect x=".5" y=".5" width="${width - 1}" height="43" rx="8" fill="url(#surface)" stroke="${pending ? theme.line : '#286483'}"/>
  <g transform="translate(12 10)" fill="none" stroke="${pending ? '#7893aa' : theme.cyan}" color="${theme.cyan}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[key]}</g>
  <text x="46" y="${pending ? 19 : 27}" fill="${color}" font-family="Segoe UI,Arial,sans-serif" font-size="14" font-weight="600">${escape(label)}</text>
  ${subtitle ? `<text x="46" y="34" fill="#829bb1" font-family="Segoe UI,Arial,sans-serif" font-size="8" letter-spacing="1.2">${subtitle}</text>` : ''}
  ${pending ? '' : `<path d="m${width - 23} 18 4 4-4 4" fill="none" stroke="${theme.cyan}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`}
</svg>\n`;
    fs.writeFileSync(
      path.join(directory, `${key}.svg`),
      svg.replace(/[ \t]+$/gm, ''),
    );
    const image = `<img src="./assets/links/${key}.svg" width="${width}" height="48" alt="${escape(alt)}">`;
    return ready
      ? `<a href="${escape(content.links[key])}">${image}</a>`
      : image;
  }
  const caseStudy = badge('caseStudy', 'Project README', 208);
  const demo = badge('liveDemo', 'Live Demo', 160);
  const portfolio = badge('portfolio', 'Full Portfolio', 174);
  const linkedin = badge('linkedin', 'LinkedIn', 140);
  const markdown = `<!-- Generated from profile-content.json by npm run build. -->
<p align="center">
  <a href="./assets/terminal-poster.png">
    <img src="./assets/terminal-intro.gif" width="100%" alt="Jordan Dominguez — Enterprise Data, Analytics and AI Transformation. Animated terminal portfolio featuring AI Decision Trust Lab, Financial Performance Signal Model, AI and Risk Engineering, Analytics Delivery Operating App, and Lead Intelligence Hub.">
  </a>
</p>

<p align="center">
  <sub><a href="./assets/terminal-poster.png">Full-size poster</a> &nbsp;·&nbsp; <a href="./assets/terminal-intro.mp4">Watch MP4</a></sub>
</p>

## Beyond the Code

${content.bio}

### Featured Project — ${project.title}

${content.featuredDescription}

<p>
  ${caseStudy}
  ${demo}
</p>

### Explore & Connect

<p>
  ${portfolio}
  ${linkedin}
</p>

<details>
<summary>Behind the terminal</summary>

This repository contains the current profile animation and its editable source. See the [editing guide](./docs/EDITING-GUIDE.md) for the file map and rebuild instructions.

The small project interfaces are illustrative previews.

</details>
`;
  fs.writeFileSync(path.join(root, 'README.md'), markdown);
}
