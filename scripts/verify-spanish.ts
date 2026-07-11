/**
 * Proof that the automotive vertical renders a REAL bilingual video.
 *
 * Renders the same vehicle twice — once with language 'es', once with 'en' —
 * through the full pipeline (planScenes -> ElevenLabs TTS -> ffmpeg), then asks
 * Whisper (verbose_json) which language it actually HEARD in each render. The
 * Spanish cut must come back detected as Spanish, the English cut as English.
 *
 *   npx tsx scripts/verify-spanish.ts
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import ffmpegPath from 'ffmpeg-static';
import OpenAI from 'openai';

import { generateVideoWithScenes, type NarrationLanguage } from '../lib/video-generator';
import { vehiclePrompt, vehicleLowerThird, type Vehicle } from '../lib/vehicle-feed';

loadEnvConfig(process.cwd());

const FF = process.env.FFMPEG_PATH || (ffmpegPath as unknown as string) || 'ffmpeg';
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgevid-es-'));
const publicDir = path.join(process.cwd(), 'public');

function ffmpeg(args: string[]) {
  execFileSync(FF, args, { stdio: 'ignore' });
}

/** A colour card standing in for a dealer photo — the audio is what we verify. */
function makePhoto(name: string, color: string): string {
  const p = path.join(workDir, name);
  ffmpeg(['-y', '-f', 'lavfi', '-i', `color=c=${color}:s=1280x720:d=1`, '-frames:v', '1', p]);
  return p;
}

const vehicle: Vehicle = {
  ref: 'STK-9001',
  title: '2022 Toyota RAV4 XLE',
  year: 2022,
  make: 'Toyota',
  model: 'RAV4',
  trim: 'XLE',
  price: '$28,900',
  mileage: '24,000 mi',
  highlights: 'One owner, clean history, all-wheel drive, backup camera.',
  photos: [],
};

async function renderAndDetect(language: NarrationLanguage): Promise<{ detected: string; text: string; file: string }> {
  const photos = [makePhoto(`car1_${language}.jpg`, 'gray'), makePhoto(`car2_${language}.jpg`, 'navy')];

  const { videoUrl } = await generateVideoWithScenes({
    prompt: vehiclePrompt(vehicle, photos.length),
    style: 'professional',
    duration: 14,
    addOns: ['voiceover', 'subtitles'],
    aspectRatio: '16:9',
    language,
    mediaOnly: true,
    lowerThird: vehicleLowerThird(vehicle),
    userMedia: photos.map((p, i) => ({ url: p, mediaType: 'image' as const, name: `car${i + 1}.jpg` })),
  });

  const outFile = path.join(publicDir, videoUrl.replace(/^\//, ''));
  if (!fs.existsSync(outFile)) throw new Error(`render produced no file for ${language}: ${outFile}`);

  const audio = path.join(workDir, `audio_${language}.mp3`);
  ffmpeg(['-y', '-i', outFile, '-vn', '-ar', '16000', '-ac', '1', '-b:a', '64k', audio]);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result: any = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audio) as any,
    model: 'whisper-1',
    response_format: 'verbose_json',
  });

  return { detected: String(result?.language ?? '').toLowerCase(), text: String(result?.text ?? '').trim(), file: outFile };
}

async function main() {
  if (!process.env.OPENAI_API_KEY || !process.env.ELEVENLABS_API_KEY) {
    throw new Error('OPENAI_API_KEY and ELEVENLABS_API_KEY must be set (.env.local)');
  }

  let failures = 0;
  const generated: string[] = [];

  for (const language of ['es', 'en'] as NarrationLanguage[]) {
    const expected = language === 'es' ? 'spanish' : 'english';
    console.log(`\n▶ Rendering the RAV4 in ${language.toUpperCase()} ...`);
    const { detected, text, file } = await renderAndDetect(language);
    generated.push(file);

    const ok = detected === expected;
    console.log(`  Whisper detected language: ${detected}  (expected ${expected})  ${ok ? '✅' : '❌'}`);
    console.log(`  Heard: "${text}"`);
    if (!ok) failures += 1;
  }

  // Clean up: temp photos/audio always; the proof videos too (their transcripts
  // above are the evidence). Leave nothing behind in public/generated.
  fs.rmSync(workDir, { recursive: true, force: true });
  for (const f of generated) fs.rmSync(f, { force: true });

  if (failures > 0) {
    console.error(`\n❌ ${failures} render(s) came back in the wrong language.`);
    process.exit(1);
  }
  console.log('\n✅ Bilingual render verified: Spanish cut is Spanish, English cut is English.');
}

main().catch((err) => {
  console.error('verify-spanish failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
