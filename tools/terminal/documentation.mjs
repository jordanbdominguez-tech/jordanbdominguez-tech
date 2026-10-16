import fs from 'node:fs';
import path from 'node:path';

// Use the browser's validated typing schedule rather than a second estimate.
export function syncEditingGuide(root, render, typing) {
  const guidePath = path.join(root, 'docs/EDITING-GUIDE.md');
  let guide = fs.readFileSync(guidePath, 'utf8');
  const gifHeight =
    Math.round((render.height * render.gifWidth) / render.width / 2) * 2;
  const closeStart = render.durationSeconds - render.fadeOutSeconds;
  const range = (start, end) => `${start.toFixed(2)}–${end.toFixed(2)} seconds`;
  const replaceBlock = (name, content) => {
    const start = `<!-- ${name}:start -->`;
    const end = `<!-- ${name}:end -->`;
    const first = guide.indexOf(start);
    const last = guide.indexOf(end, first + start.length);
    if (first < 0 || last < 0)
      throw new Error(`Missing editing-guide markers: ${name}`);
    guide =
      guide.slice(0, first + start.length) +
      '\n\n' +
      content +
      '\n\n' +
      guide.slice(last);
  };
  replaceBlock(
    'file-map',
    `| Path | Purpose |
| --- | --- |
| \`README.md\` | Public profile; generated from the configuration |
| \`profile-content.json\` | Profile copy, links, colors, project details and animation timing |
| \`assets/terminal-intro.gif\` | ${render.durationSeconds}-second looping animation; ${render.gifWidth} × ${gifHeight}; ${render.gifFps} fps |
| \`assets/terminal-intro.mp4\` | ${render.durationSeconds}-second H.264 video; ${render.width} × ${render.height}; ${render.fps} fps |
| \`assets/terminal-poster.png\` | Full-resolution static alternative |
| \`assets/terminal-poster.svg\` | Self-contained editable vector composition |
| \`assets/links/\` | Small portfolio, LinkedIn and project-status graphics |
| \`tools/terminal/\` | Layout, animation, README generator, documentation sync, renderer and validation |
| \`tools/terminal/fonts/\` | Bundled DejaVu fonts and their license |
| \`tools/terminal/data-landscape.png\` | Globe and wireframe art layer |`,
  );
  replaceBlock(
    'animation-timing',
    `| Time | Sequence |
| --- | --- |
| ${range(0, Math.max(render.boot.zoomEnd, render.boot.rainEnd))} | Terminal power-on, hexadecimal rain, typed loading messages, staged progress and gentle zoom |
| ${range(render.introReveal.startSeconds, render.introReveal.startSeconds + render.introReveal.durationSeconds)} | Both introductory comments fade and slide in together |
| ${range(typing.start, typing.end)} | ${typing.typedLines} terminal lines type in, starting at \`$ whoami\`, with a moving cyan cursor |
| ${range(Math.min(...render.projectStarts), Math.max(...render.projectStarts) + render.revealSeconds)} | The five project cards reveal |
| ${range(Math.min(render.metricsStart, render.quoteStart), Math.max(render.metricsStart, render.quoteStart) + render.revealSeconds)} | Impact cards and quote reveal |
| ${range(typing.end, closeStart)} | Completed composition holds for reading (${typing.readingHoldSeconds.toFixed(2)} seconds) |
| ${range(closeStart, render.durationSeconds)} | Screen closes into the opening scanline for the loop |`,
  );
  fs.writeFileSync(guidePath, guide);
}
