/**
 * Runtime verification for the timeline renderer (lib/video-export.ts).
 *
 * Builds synthetic media with ffmpeg (no network, no API keys, no DB), renders a
 * timeline that exercises: clip trimming, a gap (black filler), an audio track
 * mixed in with a delay, and a text overlay. Then asserts the output actually
 * contains what it should.
 *
 *   npx tsx scripts/verify-export.ts
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { resolveFfmpegPath } from '../lib/ffmpeg-env';
import { exportTimelineVideo, type ExportTrack } from '../lib/video-export';

const ffmpegPath: string = resolveFfmpegPath();
const workDir = path.join(process.cwd(), 'public', 'temp', 'verify-export');

function ffmpeg(args: string[]) {
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'pipe' });
}

/** Read `ffmpeg -i <file>` stderr, which reports Duration and Streams. */
function probe(file: string): string {
  try {
    execFileSync(ffmpegPath, ['-i', file], { stdio: 'pipe' });
    return '';
  } catch (err: any) {
    // ffmpeg -i with no output exits non-zero and prints metadata to stderr.
    return String(err.stderr ?? '');
  }
}

function durationSeconds(probeOutput: string): number {
  const m = probeOutput.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error('Could not parse duration from ffmpeg output');
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ok  ${msg}`);
}

async function main() {
  fs.mkdirSync(workDir, { recursive: true });

  const clipA = path.join(workDir, 'clipA.mp4');
  const clipB = path.join(workDir, 'clipB.mp4');
  const music = path.join(workDir, 'music.m4a');
  const output = path.join(workDir, 'out.mp4');

  console.log('1. Creating synthetic source media...');
  ffmpeg(['-f', 'lavfi', '-i', 'color=red:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipA]);
  ffmpeg(['-f', 'lavfi', '-i', 'color=green:s=640x360:r=24', '-t', '5', '-pix_fmt', 'yuv420p', clipB]);
  ffmpeg(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=10', '-c:a', 'aac', music]);
  assert(fs.existsSync(clipA) && fs.existsSync(clipB) && fs.existsSync(music), 'source media created');

  // Timeline: A[0..3]  gap[3..4]  B[4..7]   => 7s total
  // Audio: music from t=0 for 7s. Text: "Hello ForgeVid" from t=1 for 2s.
  const tracks: ExportTrack[] = [
    {
      id: 'v1',
      type: 'video',
      clips: [
        { id: 'c1', source: clipA, startTime: 0, duration: 3, trimStart: 1 },
        { id: 'c2', source: clipB, startTime: 4, duration: 3 },
      ],
    },
    {
      id: 'a1',
      type: 'audio',
      clips: [{ id: 'a-c1', source: music, startTime: 0, duration: 7 }],
    },
    {
      id: 't1',
      type: 'text',
      clips: [{ id: 't-c1', startTime: 1, duration: 2, text: 'Hello ForgeVid' }],
    },
  ];

  console.log('2. Rendering timeline (gap filler + audio mix + text overlay)...');
  await exportTimelineVideo(tracks, { format: 'mp4', quality: 'sd', fps: 24 }, output);

  console.log('3. Asserting output...');
  assert(fs.existsSync(output), 'output file exists');
  const size = fs.statSync(output).size;
  assert(size > 10_000, `output is non-trivial (${size} bytes)`);

  const info = probe(output);
  const dur = durationSeconds(info);
  assert(Math.abs(dur - 7) < 0.6, `duration ~7s (got ${dur.toFixed(2)}s) — gap filler preserved timing`);
  assert(/Stream .*Video: h264/.test(info), 'has H.264 video stream');
  assert(/Stream .*Audio: aac/.test(info), 'has AAC audio stream (audio track was mixed in)');
  assert(/1280x720/.test(info), 'scaled to sd 1280x720');

  console.log('\nPASS — timeline renderer produced a real composited video.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nFAIL:', err.message);
    process.exit(1);
  });
