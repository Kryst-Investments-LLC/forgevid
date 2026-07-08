/**
 * Runtime verification for the generation assembler (lib/video-generator.ts).
 *
 * Renders assembleVideo() against synthetic local clips — no Pexels, no OpenAI,
 * no ElevenLabs, no Cloudinary, no DB. Asserts that aspect ratio actually drives
 * the output frame size, that scene durations are honored, and that a caller's
 * local source files survive the assembler's temp cleanup.
 *
 *   npm run verify:generate
 */

import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { assembleVideo, aspectPreset, type ResolvedScene, type AspectRatio } from '../lib/video-generator';

const ffmpegPath: string = require('@ffmpeg-installer/ffmpeg').path;
const workDir = path.join(process.cwd(), 'public', 'temp', 'verify-generate');

function ffmpeg(args: string[]) {
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'pipe' });
}

function probe(file: string): string {
  try {
    execFileSync(ffmpegPath, ['-i', file], { stdio: 'pipe' });
    return '';
  } catch (err: any) {
    return String(err.stderr ?? '');
  }
}

function durationSeconds(out: string): number {
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error('Could not parse duration');
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok  ${msg}`);
}

function scene(index: number, source: string, duration: number, description?: string): ResolvedScene {
  return {
    id: `scene-${index + 1}`,
    index,
    description: description ?? `Test scene ${index + 1}`,
    keywords: ['test'],
    duration,
    visualElements: [],
    clipUrl: source,
    matchedQuery: 'test',
  };
}

/**
 * Regression: fluent-ffmpeg splits an outputOptions array entry containing
 * EXACTLY ONE space. A two-word caption made the whole -vf value one-space, so
 * the drawtext filter was torn in half and ffmpeg failed. Captions with >=2
 * spaces happened to survive, which is why this hid for so long.
 */
async function checkTwoWordCaption(source: string) {
  console.log('\nRendering with a TWO-WORD caption (one-space filter regression)...');
  const url = await assembleVideo([scene(0, source, 2, 'Opening shot')], ['subtitles'], '16:9');
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'two-word caption rendered (filter not torn in half)');
  fs.unlinkSync(outFile);
}

async function renderAndCheck(aspectRatio: AspectRatio, sources: string[]) {
  const { width, height } = aspectPreset(aspectRatio);
  console.log(`\nRendering ${aspectRatio} (expect ${width}x${height})...`);

  // addOns=['subtitles'] => captions on, voiceover off (no ElevenLabs key needed).
  const url = await assembleVideo(
    [scene(0, sources[0], 2), scene(1, sources[1], 2)],
    ['subtitles'],
    aspectRatio,
  );

  // Cloudinary is unconfigured, so we get a local /generated/<file> URL.
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), `${aspectRatio}: output rendered`);

  const info = probe(outFile);
  assert(new RegExp(`${width}x${height}`).test(info), `${aspectRatio}: frame is ${width}x${height}`);
  const dur = durationSeconds(info);
  assert(Math.abs(dur - 4) < 0.6, `${aspectRatio}: duration ~4s (got ${dur.toFixed(2)}s)`);

  fs.unlinkSync(outFile);
}

/**
 * Mean volume (dB) of a time window of `file`, via ffmpeg's volumedetect.
 * volumedetect exits 0, so read stderr from spawnSync rather than a thrown error.
 */
function meanVolumeDb(file: string, start: number, duration: number): number {
  const res = spawnSync(
    ffmpegPath,
    [
      '-nostdin',
      '-ss', String(start),
      '-t', String(duration),
      '-i', file,
      '-vn', // don't decode the video stream — we only want loudness
      '-af', 'volumedetect',
      '-f', 'null', '-',
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  const out = `${res.stderr ?? ''}`;
  const m = out.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/);
  if (!m) {
    throw new Error(
      `Could not parse mean_volume from ${file} [${start}s +${duration}s]. ` +
        `status=${res.status} signal=${res.signal} error=${res.error?.message} ` +
        `stderrLen=${out.length}\ntail:\n${out.slice(-400)}`,
    );
  }
  // A fully silent window reports -inf; treat it as very quiet.
  return m[1] === '-inf' ? -100 : Number(m[1]);
}

/**
 * Music must duck under narration. The voiceover here is deliberately quiet
 * (above sidechaincompress's threshold, but contributing little to the mix), so
 * a loudness drop while it plays can only come from the music being ducked.
 */
async function checkMusicDucking(clip: string) {
  console.log('\nChecking music ducking under narration...');
  const music = path.join(workDir, 'music.m4a');
  const voice = path.join(workDir, 'voice.m4a');

  // Music: loud, 6s. Voice: quiet, only the first 2s of a 4s video.
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=300:duration=6', '-c:a', 'aac', music]);
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=800:duration=2', '-af', 'volume=0.2', '-c:a', 'aac', voice]);

  const url = await assembleVideo([scene(0, clip, 4)], ['subtitles'], '16:9', {
    musicPath: music,
    voiceoverPath: voice,
  });
  const outFile = path.join(process.cwd(), 'public', 'generated', path.basename(url));
  assert(fs.existsSync(outFile), 'music+voiceover render produced output');

  const info = probe(outFile);
  assert(/Stream .*Audio: aac/.test(info), 'output has an audio stream');

  const duringNarration = meanVolumeDb(outFile, 0.2, 1.5); // voice playing -> music ducked
  const afterNarration = meanVolumeDb(outFile, 2.6, 1.2); // voice gone -> music recovers
  console.log(`      during narration: ${duringNarration} dB, after: ${afterNarration} dB`);
  // Regression: sidechaincompress ends when its key input ends, which used to
  // kill the music the instant narration stopped (audio ended at 2s, not 4s).
  assert(afterNarration > -90, 'music still plays after narration ends (sidechain key is padded)');
  assert(
    afterNarration > duringNarration + 1.5,
    `music is ducked while narration plays (${duringNarration}dB -> ${afterNarration}dB)`,
  );

  // The caller's music/voice files must survive cleanup.
  assert(fs.existsSync(music) && fs.existsSync(voice), 'injected music/voiceover not deleted');
  fs.unlinkSync(outFile);
}

async function main() {
  fs.mkdirSync(workDir, { recursive: true });
  const clipA = path.join(workDir, 'a.mp4');
  const clipB = path.join(workDir, 'b.mp4');

  console.log('Creating synthetic source clips...');
  ffmpeg(['-f', 'lavfi', '-i', 'color=red:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipA]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=blue:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipB]);
  assert(fs.existsSync(clipA) && fs.existsSync(clipB), 'source clips created');

  await renderAndCheck('16:9', [clipA, clipB]);
  await renderAndCheck('9:16', [clipA, clipB]);
  await renderAndCheck('1:1', [clipA, clipB]);
  await checkTwoWordCaption(clipA);
  await checkMusicDucking(clipA);

  // Regression guard: assembleVideo must not delete media it did not download.
  assert(fs.existsSync(clipA) && fs.existsSync(clipB), 'caller-owned local sources were NOT deleted');

  console.log('\nPASS — aspect ratio drives the rendered frame size.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAIL:', err.message);
    process.exit(1);
  });
