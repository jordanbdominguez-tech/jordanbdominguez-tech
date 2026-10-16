import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
fs.mkdirSync(path.join(root, 'verification'), { recursive: true });
const config = JSON.parse(
  fs.readFileSync(path.join(root, 'profile-content.json'), 'utf8'),
);
const report = {
  media: {},
  decodeErrors: [],
  durationSeconds: config.render.durationSeconds,
};
for (const name of ['terminal-intro.mp4', 'terminal-intro.gif']) {
  const file = path.join(root, 'assets', name);
  const meta = JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,nb_frames',
        '-of',
        'json',
        file,
      ],
      { encoding: 'utf8' },
    ),
  );
  const errors = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  if (errors) throw new Error(errors);
  if (
    Math.abs(Number(meta.format.duration) - config.render.durationSeconds) > 0.1
  )
    throw new Error(`${name}: unexpected duration`);
  const isGif = name.endsWith('.gif'),
    stream = meta.streams[0],
    r = config.render;
  const expectedWidth = isGif ? r.gifWidth : r.width;
  const expectedHeight = isGif
    ? Math.round((r.height * r.gifWidth) / r.width / 2) * 2
    : r.height;
  const [numerator, denominator] = stream.r_frame_rate.split('/').map(Number);
  if (stream.width !== expectedWidth || stream.height !== expectedHeight)
    throw new Error(`${name}: unexpected dimensions`);
  if (Math.abs(numerator / denominator - (isGif ? r.gifFps : r.fps)) > 0.1)
    throw new Error(`${name}: unexpected frame rate`);
  if (!isGif && (stream.codec_name !== 'h264' || stream.pix_fmt !== 'yuv420p'))
    throw new Error('MP4 must use broadly compatible H.264 / yuv420p');
  report.media[name] = meta;
}
const gif = fs.readFileSync(path.join(root, 'assets/terminal-intro.gif'));
const loopMarker = Buffer.from([
  0x21,
  0xff,
  0x0b,
  ...Buffer.from('NETSCAPE2.0'),
  0x03,
  0x01,
  0x00,
  0x00,
  0x00,
]);
if (!gif.includes(loopMarker))
  throw new Error('GIF infinite loop extension missing');
report.gifLoop = 'infinite';
const png = fs.readFileSync(path.join(root, 'assets/terminal-poster.png'));
report.poster = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
if (
  report.poster.width !== config.render.width ||
  report.poster.height !== config.render.height
)
  throw new Error('Poster dimensions mismatch');
report.visualReview =
  'Inspect the locally generated sample frames and animation contact sheet for visual quality; this script verifies media integrity.';
fs.writeFileSync(
  path.join(root, 'verification/media-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  'Both videos decode; dimensions, duration, and infinite GIF loop verified.',
);
