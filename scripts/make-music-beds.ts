/**
 * Synthesize ORIGINAL, license-free background beds.
 *
 *   npx tsx scripts/make-music-beds.ts
 *
 * Why this exists: ForgeVid ships no music, because every track needs a licence
 * and bundling one would hand our users a copyright claim on their own advert.
 * The ducking/mixing pipeline has therefore always been real, tested, and
 * completely silent — which is the single most obvious "this was made by a
 * machine" tell in the output.
 *
 * These beds are generated from sine tones by ffmpeg. Nobody owns a sine wave,
 * so there is nothing to license and nothing to attribute. They are ambient pads,
 * not songs: they sit far under a voiceover and give the silence a floor.
 *
 * They are a FLOOR, not a ceiling. Drop a properly licensed track into
 * public/music/ and list it in tracks.json and it wins on merit.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { resolveFfmpegPath } from '../lib/ffmpeg-env';

const ff = resolveFfmpegPath();
const outDir = path.join(process.cwd(), 'public', 'music');

interface Bed {
  id: string;
  title: string;
  moods: string[];
  /** Chord, in Hz, low to high. */
  freqs: number[];
  /** Cutoff of the low-pass — lower is warmer and further back in the mix. */
  cutoff: number;
  /** Tremolo rate, Hz. ffmpeg's tremolo rejects anything below 0.1. */
  lfo: number;
  seconds: number;
}

const BEDS: Bed[] = [
  {
    id: 'calm-bed',
    title: 'Still (generated)',
    // A minor add9: warm, unresolved, stays out of the way of speech.
    moods: ['calm', 'professional', 'modern', 'corporate', 'sad'],
    freqs: [110, 164.81, 220, 329.63],
    cutoff: 1200,
    lfo: 0.12,
    seconds: 40,
  },
  {
    id: 'uplift-bed',
    title: 'Lift (generated)',
    // C major: brighter, a little forward motion from the faster LFO.
    moods: ['happy', 'energetic', 'uplifting', 'bright'],
    freqs: [130.81, 196, 261.63, 392],
    cutoff: 2200,
    lfo: 0.28,
    seconds: 40,
  },
  {
    id: 'cinematic-bed',
    title: 'Wide (generated)',
    // D minor, dropped low: slow, spacious, for the "premium" register.
    moods: ['cinematic', 'dramatic', 'premium', 'epic'],
    freqs: [73.42, 110, 146.83, 220],
    cutoff: 900,
    lfo: 0.1,
    seconds: 40,
  },
];

/**
 * A pad, not a drone: each voice is detuned a few cents against a twin, which
 * makes them beat slowly against each other (chorus). A gentle tremolo breathes,
 * a low-pass takes the harshness off, and a short echo gives it a room.
 *
 * Constant amplitude, no fades — the assembler loops this with `-stream_loop`,
 * and a fade would pump audibly at every seam.
 */
function buildFilter(bed: Bed): { inputs: string[]; filter: string } {
  const inputs: string[] = [];
  const voices: string[] = [];
  let i = 0;

  for (const f of bed.freqs) {
    for (const detune of [1, 1.004]) {
      inputs.push('-f', 'lavfi', '-i', `sine=frequency=${(f * detune).toFixed(3)}:duration=${bed.seconds}:sample_rate=44100`);
      // Higher voices sit quieter, or the chord turns into a whistle.
      const gain = (0.5 / bed.freqs.length) * (f < 200 ? 1 : 0.55);
      voices.push(`[${i}:a]volume=${gain.toFixed(4)}[v${i}]`);
      i++;
    }
  }

  const mix = voices.map((_, n) => `[v${n}]`).join('');
  const filter = [
    voices.join(';'),
    `${mix}amix=inputs=${i}:normalize=0[chord]`,
    // Sine tones mix to roughly -43 dBFS, which is inaudible under a voiceover.
    // loudnorm brings every bed to the same target so the mixer's ducking has a
    // predictable signal to work with, whichever mood was chosen.
    `[chord]tremolo=f=${Math.max(bed.lfo, 0.1)}:d=0.35,` +
      `lowpass=f=${bed.cutoff},` +
      `aecho=0.6:0.5:220|380:0.25|0.18,` +
      `alimiter=limit=0.9,` +
      `loudnorm=I=-20:TP=-2:LRA=7[out]`,
  ].join(';');

  return { inputs, filter };
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Array<Record<string, unknown>> = [];

  for (const bed of BEDS) {
    const file = `${bed.id}.m4a`;
    const target = path.join(outDir, file);
    const { inputs, filter } = buildFilter(bed);

    const result = spawnSync(
      ff,
      ['-y', ...inputs, '-filter_complex', filter, '-map', '[out]',
       '-c:a', 'aac', '-b:a', '128k', '-t', String(bed.seconds), target],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );

    if (result.status !== 0 || !fs.existsSync(target)) {
      console.error(`FAILED ${bed.id}:`, String(result.stderr).slice(-400));
      process.exit(1);
    }
    const kb = (fs.statSync(target).size / 1024).toFixed(0);
    console.log(`  ${file}  ${kb}KB  ${bed.seconds}s  moods: ${bed.moods.join(', ')}`);

    manifest.push({
      id: bed.id,
      title: bed.title,
      moods: bed.moods,
      file,
      license: 'Generated from sine tones by scripts/make-music-beds.ts. No rights reserved.',
    });
  }

  const manifestPath = path.join(outDir, 'tracks.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nWrote ${manifestPath} with ${manifest.length} beds.`);
}

main();
