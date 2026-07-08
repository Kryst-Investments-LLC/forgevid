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

import { execFileSync } from 'child_process';
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

function scene(index: number, source: string, duration: number): ResolvedScene {
  return {
    id: `scene-${index + 1}`,
    index,
    description: `Test scene ${index + 1}`,
    keywords: ['test'],
    duration,
    visualElements: [],
    clipUrl: source,
    matchedQuery: 'test',
  };
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
