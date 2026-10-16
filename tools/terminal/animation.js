// Deterministic timeline shared by the offline preview and every export frame.
// `timing` is injected from profile-content.json by build.mjs.
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const byId = (id) => document.getElementById(id);
const parts = [...document.querySelectorAll('[data-start]')].filter(
  (el) => !el.id.startsWith('section-'),
);
const columns = [...document.querySelectorAll('.matrix-column')];
const debugLines = [...document.querySelectorAll('[data-debug]')];
const debugText = debugLines.map((el) => Array.from(el.textContent));
const portfolio = byId('portfolio-scene'),
  aperture = byId('power-window');
const bootLayer = byId('boot-layer'),
  flare = byId('power-flare');
const typingCursor = byId('typing-cursor');
const introCopy = byId('terminal-intro-copy');
const typedGroups = [...document.querySelectorAll('[data-typing-section]')];
const typingLines = [];
let typingClock = timing.typing.startSeconds;
// Keep complete strings separate from animated DOM text so replay and seeking
// are deterministic, including bullets and punctuation.
typedGroups.forEach((group) => {
  [...group.querySelectorAll('text')].forEach((el, lineIndex) => {
    const chars = Array.from(el.textContent);
    const command = lineIndex === 0;
    const rate = command
      ? timing.typing.commandCharactersPerSecond
      : group.id === 'section-whoami' && lineIndex === 1
        ? timing.typing.nameCharactersPerSecond
        : timing.typing.bodyCharactersPerSecond;
    const start = typingClock,
      end = start + chars.length / rate;
    typingLines.push({ el, chars, start, end, rate, group: group.id, command });
    typingClock = end + timing.typing.linePauseSeconds;
  });
  typingClock += timing.typing.sectionPauseSeconds;
});
const typingEnd = typingLines.at(-1).end;
window.typingTimeline = {
  start: timing.typing.startSeconds,
  end: typingEnd,
  lines: typingLines.map(({ el, chars, ...line }) => ({
    ...line,
    text: chars.join(''),
  })),
};
function typeTerminal(t, still) {
  let active = null;
  typedGroups.forEach((group) => {
    group.style.opacity = 1;
    group.removeAttribute('transform');
  });
  typingLines.forEach((line) => {
    const count = still
      ? line.chars.length
      : Math.min(
          line.chars.length,
          Math.max(0, Math.floor((t - line.start) * line.rate)),
        );
    const value = line.chars.slice(0, count).join('');
    if (line.el.textContent !== value) line.el.textContent = value;
    if (t >= line.start) active = line;
  });
  const running = !still && t >= timing.typing.startSeconds && t < typingEnd;
  typingCursor.style.opacity = running ? 1 : 0;
  if (running && active) {
    const fontSize = Number(active.el.getAttribute('font-size'));
    typingCursor.setAttribute(
      'x',
      Number(active.el.getAttribute('x')) +
        active.el.getComputedTextLength() +
        3,
    );
    typingCursor.setAttribute(
      'y',
      Number(active.el.getAttribute('y')) - fontSize * 0.81,
    );
    typingCursor.setAttribute('width', fontSize * 0.46);
    typingCursor.setAttribute('height', fontSize * 1.02);
    // A short blink at line breaks reads like a live terminal prompt.
    typingCursor.style.opacity =
      t > active.end ? 0.4 + 0.6 * Math.abs(Math.cos(t * 8)) : 1;
  }
  byId('cursor').style.display = still || t >= typingEnd ? 'inline' : 'none';
}

function bootProgress(t) {
  const frames = timing.boot.progressKeyframes;
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [end, value] = frames[i],
      [start, previous] = frames[i - 1];
    if (t <= end)
      return (
        previous + (value - previous) * smooth((t - start) / (end - start))
      );
  }
  return frames.at(-1)[1];
}

window.setScene = (t, still = false) => {
  const b = timing.boot;
  const ending = still
    ? 0
    : smooth(
        (t - (timing.durationSeconds - timing.fadeOutSeconds)) /
          timing.fadeOutSeconds,
      );
  // Expand from a centered terminal scanline; contract to it at the loop seam.
  const openW = still ? 1 : ease(t / 0.35);
  const openH = still ? 1 : ease((t - 0.28) / (b.powerOnSeconds - 0.28));
  const width = 2400 * openW * (1 - Math.pow(ending, 4));
  const height = (2 + 1358 * openH) * (1 - ending);
  aperture.setAttribute('x', 1200 - width / 2);
  aperture.setAttribute('y', 680 - height / 2);
  aperture.setAttribute('width', width);
  aperture.setAttribute('height', height);
  aperture.setAttribute('rx', still ? 0 : Math.min(16, height / 2));
  const flareOpacity = still
    ? 0
    : t < b.powerOnSeconds
      ? clamp(t / 0.12) * (1 - smooth((t - 0.28) / (b.powerOnSeconds - 0.28)))
      : ending * 0.55;
  flare.setAttribute('x', 1200 - width / 2);
  flare.setAttribute('width', width);
  flare.style.opacity = flareOpacity;

  const zoom = still ? 1 : ease((t - b.zoomStart) / (b.zoomEnd - b.zoomStart));
  const scale = b.initialScale + (1 - b.initialScale) * zoom;
  portfolio.setAttribute(
    'transform',
    `translate(${1200 * (1 - scale)} ${680 * (1 - scale)}) scale(${scale})`,
  );
  portfolio.style.opacity = still
    ? 1
    : smooth((t - b.portfolioStart) / b.portfolioFadeSeconds);
  parts.forEach((el) => {
    const p = still
      ? 1
      : ease((t - Number(el.dataset.start)) / timing.revealSeconds);
    el.style.opacity = p;
    el.setAttribute('transform', `translate(0 ${(1 - p) * 12})`);
  });
  // Both introductory comments arrive together while the first prompt types.
  const intro = timing.introReveal;
  const introProgress = still
    ? 1
    : smooth((t - intro.startSeconds) / intro.durationSeconds);
  introCopy.style.opacity = introProgress;
  introCopy.setAttribute(
    'transform',
    `translate(0 ${(1 - introProgress) * intro.offsetY})`,
  );
  typeTerminal(t, still);
  const bootOpacity = still
    ? 0
    : smooth((t - b.rainStart) / 0.35) *
      (1 - smooth((t - (b.rainEnd - b.fadeSeconds)) / b.fadeSeconds));
  bootLayer.style.opacity = bootOpacity;
  bootLayer.style.display = bootOpacity > 0 ? 'inline' : 'none';
  if (bootOpacity > 0) {
    byId('boot-shade').style.opacity =
      1 - smooth((t - b.portfolioStart) / b.portfolioFadeSeconds);
    const travel = (t - b.rainStart) * b.matrixSpeed;
    columns.forEach((col, i) => {
      const offset = ((i * 347) % 1660) - 610;
      const y = ((travel * (0.6 + (i % 7) * 0.08) + offset + 650) % 1940) - 650;
      col.setAttribute('transform', `translate(${42 + i * 56} ${y})`);
      // Animate one bright hexadecimal head per stream, keeping tails calm.
      col.lastElementChild.textContent = (
        (i * 13 + Math.floor(t * b.matrixCharacterRate)) %
        16
      )
        .toString(16)
        .toUpperCase();
    });
    byId('boot-console').style.opacity = smooth((t - b.consoleStart) / 0.35);
    debugLines.forEach((el, i) => {
      const count = Math.max(
        0,
        Math.floor((t - b.debugStarts[i]) * b.debugCharactersPerSecond),
      );
      el.textContent = debugText[i].slice(0, count).join('');
    });
    const progress = bootProgress(t);
    byId('boot-progress').setAttribute('width', 740 * progress);
    byId('boot-percent').textContent =
      String(Math.floor(progress * 100)).padStart(2, '0') + '%';
    byId('scan-beam').setAttribute(
      'y',
      clamp((t - b.rainStart) / (b.rainEnd - b.rainStart)) * 1360,
    );
    const glitch = b.glitchWindows.some(([start, end]) => t > start && t < end);
    byId('glitch-band').style.opacity = glitch ? 0.45 : 0;
    byId('matrix-rain').setAttribute(
      'transform',
      `translate(${glitch ? 8 : 0} 0)`,
    );
  }
  byId('frame-glow').style.opacity = 0.3 + 0.1 * Math.sin(t * Math.PI * 0.35);
  byId('cursor').style.opacity = still
    ? 1
    : 0.72 + 0.28 * Math.cos(t * Math.PI * 1.25);
};
let playing = false,
  origin,
  animationFrame;
function animate(now) {
  if (!playing) return;
  setScene(((now - origin) / 1000) % timing.durationSeconds);
  animationFrame = requestAnimationFrame(animate);
}
byId('replay').onclick = () => {
  cancelAnimationFrame(animationFrame);
  playing = true;
  origin = performance.now();
  setScene(0);
  animationFrame = requestAnimationFrame(animate);
};
byId('poster').onclick = () => {
  playing = false;
  cancelAnimationFrame(animationFrame);
  setScene(timing.posterTime, true);
};
if (new URLSearchParams(location.search).has('render'))
  document.body.classList.add('render');
setScene(timing.posterTime, true);
window.previewReady = document.fonts.ready.then(() => true);
