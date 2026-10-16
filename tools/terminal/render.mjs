import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { syncEditingGuide } from './documentation.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
fs.mkdirSync(path.join(root, 'verification'), { recursive: true });
const c = JSON.parse(
  fs.readFileSync(path.join(root, 'profile-content.json'), 'utf8'),
);
const r = c.render;
const stillOnly = process.argv.includes('--poster-only');
const samplesOnly = process.argv.includes('--samples-only');
const previewHtml = fs.readFileSync(
  path.join(root, 'preview/terminal.html'),
  'utf8',
);
const executablePath = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: r.width, height: r.height },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.setContent(previewHtml, { waitUntil: 'load' });
await page.evaluate(() => document.body.classList.add('render'));
await page.evaluate(() => window.previewReady);
await page.evaluate((t) => window.setScene(t, true), r.posterTime);
await page.screenshot({ path: path.join(root, 'assets/terminal-poster.png') });

// Check rendered geometry, font readiness and content rather than snapshotting
// our implementation. The upper/lower bounds also catch future content overflow.
const geometry = await page.evaluate(() => {
  const svg = document.querySelector('#portfolio-scene'),
    outside = [];
  for (const el of svg.querySelectorAll('text')) {
    const b = el.getBBox();
    if (b.x < 12 || b.y < 12 || b.x + b.width > 2388 || b.y + b.height > 1348)
      outside.push({
        text: el.textContent,
        bounds: { x: b.x, y: b.y, width: b.width, height: b.height },
      });
  }
  const groups = [...svg.querySelectorAll('[id^="project-"]')].map((el) => ({
    id: el.id,
    text: el.textContent,
  }));
  const sections = [...svg.querySelectorAll('[id^="section-"]')].map(
    (el) => el.id,
  );
  return {
    outside,
    groups,
    sections,
    fontsLoaded: document.fonts.status === 'loaded',
    text: [...svg.querySelectorAll('text')]
      .map((el) => el.textContent)
      .join('\n'),
  };
});
const report = {
  browserErrors: errors,
  fontsLoaded: geometry.fontsLoaded,
  outsideCanvas: geometry.outside,
  projectCount: geometry.groups.length,
  sections: geometry.sections,
  projects: geometry.groups.map((g) => g.id),
  verifiedContent: {
    identity: geometry.text.includes(c.identity.role),
    projects: c.projects.every((p) => geometry.text.includes(p.title)),
    stack: c.stack.every((row) =>
      geometry.text.includes(row.join(c.stackSeparator)),
    ),
    claims: c.impact.every((t) => geometry.text.includes(t)),
    noUnsupportedTools: !/\b(AWS|Docker)\b/.test(geometry.text),
    noUnverifiedProductCount: !geometry.text.includes('5+'),
  },
  canvas: { width: r.width, height: r.height },
  durationSeconds: r.durationSeconds,
};
fs.writeFileSync(
  path.join(root, 'verification/layout-report.json'),
  JSON.stringify(report, null, 2),
);
if (
  errors.length ||
  geometry.outside.length ||
  geometry.groups.length !== 5 ||
  geometry.sections.length !== 6 ||
  !Object.values(report.verifiedContent).every(Boolean)
) {
  await browser.close();
  throw new Error(
    'Layout/content validation failed; inspect verification/layout-report.json',
  );
}
console.log(
  'Poster rendered; all five cards, six sections, fonts and content checks pass.',
);
const typingReport = await page.evaluate(
  ({ intro, reveal }) => {
    const timeline = window.typingTimeline,
      problems = [];
    const nodes = [...document.querySelectorAll('[data-typing-section] text')];
    const introGroup = document.getElementById('terminal-intro-copy');
    const introNodes = [...introGroup.querySelectorAll('text')];
    const introTimes = [
      reveal.startSeconds,
      reveal.startSeconds + reveal.durationSeconds / 2,
      reveal.startSeconds + reveal.durationSeconds,
    ];
    const introOpacities = introTimes.map((time) => {
      window.setScene(time);
      if (introNodes.some((el, i) => el.textContent !== intro[i]))
        problems.push(
          'Intro comments must remain complete during their reveal',
        );
      return Number(introGroup.style.opacity);
    });
    if (
      introOpacities[0] !== 0 ||
      introOpacities[1] <= 0 ||
      introOpacities[1] >= 1 ||
      introOpacities[2] !== 1
    )
      problems.push('Intro comments did not fade in together');
    if (timeline.lines[0].text !== '$ whoami')
      problems.push('Typing must start at $ whoami');
    window.setScene(timeline.start + 0.1);
    if (!nodes[0].textContent || Number(introGroup.style.opacity) <= 0)
      problems.push('The first prompt must type as the intro comments arrive');
    for (const [i, line] of timeline.lines.entries()) {
      window.setScene((line.start + line.end) / 2);
      const visible = nodes[i].textContent;
      if (
        !visible ||
        visible.length >= line.text.length ||
        !line.text.startsWith(visible)
      )
        problems.push(`Line ${i} did not type a partial prefix`);
      if (nodes.slice(i + 1).some((el) => el.textContent))
        problems.push(`Line ${i} leaked future text`);
      const cursor = document.getElementById('typing-cursor');
      const expectedX =
        Number(nodes[i].getAttribute('x')) +
        nodes[i].getComputedTextLength() +
        3;
      if (Math.abs(Number(cursor.getAttribute('x')) - expectedX) > 1)
        problems.push(`Line ${i} cursor misaligned`);
    }
    window.setScene(timeline.end + 0.1);
    if (nodes.some((el, i) => el.textContent !== timeline.lines[i].text))
      problems.push('Completed text differs from source');
    window.setScene(0);
    if (
      nodes.some((el) => el.textContent) ||
      Number(introGroup.style.opacity) !== 0
    )
      problems.push('Replay did not reset text and the intro reveal');
    return {
      problems,
      firstTypedLine: timeline.lines[0].text,
      introOpacities,
      start: timeline.start,
      end: timeline.end,
      typedLines: timeline.lines.length,
    };
  },
  { intro: c.intro, reveal: r.introReveal },
);
typingReport.readingHoldSeconds =
  r.durationSeconds - r.fadeOutSeconds - typingReport.end;
fs.writeFileSync(
  path.join(root, 'verification/typing-report.json'),
  JSON.stringify(typingReport, null, 2),
);
if (
  typingReport.problems.length ||
  typingReport.readingHoldSeconds < r.typing.minimumReadingHoldSeconds
) {
  await browser.close();
  throw new Error(
    'Typing validation failed; inspect verification/typing-report.json',
  );
}
console.log(
  `Typing verified: ${typingReport.typedLines} lines; ${typingReport.readingHoldSeconds.toFixed(1)} seconds of reading hold.`,
);
const bootReport = await page.evaluate((boot) => {
  const snapshots = boot.progressKeyframes.map(([time]) => {
    window.setScene(time);
    return {
      time,
      progress:
        Number(document.getElementById('boot-progress').getAttribute('width')) /
        740,
      text: [...document.querySelectorAll('[data-debug]')].map(
        (el) => el.textContent,
      ),
      terminalText: [...document.querySelectorAll('[data-typing-section] text')]
        .map((el) => el.textContent)
        .join(''),
    };
  });
  return { snapshots, completeText: snapshots.at(-1).text, problems: [] };
}, r.boot);
if (
  bootReport.snapshots.some(
    (s, i, a) => s.terminalText || (i && s.progress < a[i - 1].progress),
  )
)
  bootReport.problems.push('Loading must progress before terminal typing');
if (
  bootReport.snapshots.at(-1).progress !== 1 ||
  bootReport.completeText.some((text, i) => text !== r.boot.debugLines[i])
)
  bootReport.problems.push('Loading did not finish');
fs.writeFileSync(
  path.join(root, 'verification/boot-report.json'),
  JSON.stringify(bootReport, null, 2),
);
if (bootReport.problems.length) {
  await browser.close();
  throw new Error(bootReport.problems.join('; '));
}
console.log(
  'Loading sequence verified: staged progress, typed status lines and complete handoff.',
);
syncEditingGuide(root, r, typingReport);
const sampleTimes = [
  r.boot.debugStarts[0] + 0.3,
  r.boot.debugStarts[1] + 0.4,
  r.boot.progressKeyframes.at(-1)[0],
  typingReport.start + 0.2,
  typingReport.start + 2.75,
  (typingReport.start + typingReport.end) / 2,
  typingReport.end - 0.75,
  r.posterTime,
];
if (stillOnly) {
  await browser.close();
  process.exit(0);
}
if (samplesOnly) {
  for (const [i, t] of sampleTimes.entries()) {
    await page.evaluate((t) => window.setScene(t), t);
    await page.screenshot({
      path: path.join(root, 'verification', `sample-${i}.png`),
    });
  }
  await browser.close();
  console.log('Eight preview frames rendered.');
  process.exit(0);
}

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
const frameDir = path.join(root, '.render-frames');
fs.mkdirSync(frameDir, { recursive: true });
const total = Math.round(r.durationSeconds * r.fps);
const pages = [page];
for (let i = 1; i < (r.captureWorkers || 1); i++) {
  const worker = await browser.newPage({
    viewport: { width: r.width, height: r.height },
    deviceScaleFactor: 1,
  });
  worker.on('pageerror', (e) => errors.push(String(e)));
  await worker.setContent(previewHtml, { waitUntil: 'load' });
  await worker.evaluate(() => document.body.classList.add('render'));
  await worker.evaluate(() => window.previewReady);
  pages.push(worker);
}
let completed = 0;
await Promise.all(
  pages.map(async (worker, index) => {
    for (let frame = index; frame < total; frame += pages.length) {
      await worker.evaluate((t) => window.setScene(t), frame / r.fps);
      await worker.screenshot({
        path: path.join(frameDir, String(frame).padStart(4, '0') + '.png'),
      });
      completed++;
      if (completed % 96 === 0)
        console.log(`Rendered ${completed}/${total} frames`);
    }
  }),
);
if (errors.length) throw new Error(errors.join('\n'));
await browser.close();
await run('ffmpeg', [
  '-y',
  '-loglevel',
  'warning',
  '-framerate',
  String(r.fps),
  '-i',
  path.join(frameDir, '%04d.png'),
  '-c:v',
  'libx264',
  '-preset',
  'slow',
  '-crf',
  '19',
  '-pix_fmt',
  'yuv420p',
  '-movflags',
  '+faststart',
  '-an',
  path.join(root, 'assets/terminal-intro.mp4'),
]);
// Encode GIFs from the original frames: video compression noise prevents
// unchanged pixels from being reused efficiently between GIF frames.
await run('ffmpeg', [
  '-y',
  '-loglevel',
  'warning',
  '-framerate',
  String(r.fps),
  '-i',
  path.join(frameDir, '%04d.png'),
  '-filter_complex',
  `fps=${r.gifFps},scale=${r.gifWidth}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff:max_colors=256[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
  '-loop',
  '0',
  path.join(root, 'assets/terminal-intro.gif'),
]);
// Capture sample frames for visual review of the timeline.
const sampleFrames = sampleTimes.map((t) => Math.round(t * r.fps));
await run('ffmpeg', [
  '-y',
  '-loglevel',
  'warning',
  '-i',
  path.join(root, 'assets/terminal-intro.mp4'),
  '-vf',
  `select='${sampleFrames.map((n) => `eq(n,${n})`).join('+')}',scale=800:-2,tile=2x4:padding=12:margin=12:color=0x081321`,
  '-frames:v',
  '1',
  '-update',
  '1',
  path.join(root, 'verification/animation-contact-sheet.png'),
]);
fs.rmSync(frameDir, { recursive: true, force: true });
console.log('MP4, looping GIF and animation contact sheet rendered.');
