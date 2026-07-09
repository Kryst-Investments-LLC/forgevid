/**
 * Per-scene voiceover with a content-addressed cache.
 *
 * One mechanism, two wins:
 *
 *  PACING — the #1 source of "AI-video jank" was scene durations coming from
 *  GPT's guess while the narration got trimmed/padded to fit. Synthesizing each
 *  scene's line separately lets the AUDIO decide the scene's duration: scenes
 *  are cut to speech instead of speech being squeezed into scenes.
 *
 *  COST — segments are cached by sha256(description | voiceId | model), so a
 *  re-render after editing one scene only pays TTS for that one scene.
 *
 * Degrades cleanly: no ElevenLabs key (or any failed segment) returns null and
 * the caller falls back to the old whole-narration behaviour.
 *
 * Relative imports only — reachable from the worker process.
 */

import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { resolveFfmpegPath } from './ffmpeg-env';
import { DEFAULT_TTS_MODEL, DEFAULT_VOICE_ID } from './voice-catalog';

export interface SceneLine {
  id: string;
  description: string;
}

export interface SceneVoiceover {
  sceneId: string;
  /** Absolute path of the audio segment (cache file — do NOT delete). */
  path: string;
  durationSeconds: number;
  cached: boolean;
}

/** Breathing room appended to each scene beyond its spoken line. */
export const SCENE_AUDIO_PADDING_SECONDS = 0.35;

function cacheDir(): string {
  const dir = path.join(process.cwd(), '.cache', 'tts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function sceneCacheKey(description: string, voiceId: string): string {
  return createHash('sha256')
    .update(`${description}|${voiceId}|${DEFAULT_TTS_MODEL}`)
    .digest('hex');
}

/** Probe an audio file's duration with the resolved ffmpeg. 0 on failure. */
export function probeAudioSeconds(file: string): number {
  const result = spawnSync(resolveFfmpegPath(), ['-hide_banner', '-i', file], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const m = `${result.stderr ?? ''}`.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Synthesize one line with ElevenLabs. Returns the mp3 bytes, or null. */
async function elevenLabsSynth(text: string, voiceId: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: DEFAULT_TTS_MODEL,
        voice_settings: { stability: 0.6, similarity_boost: 0.6 },
      }),
    });
    if (!response.ok) {
      console.error(`[Voiceover] ElevenLabs ${response.status} for a scene line`);
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('[Voiceover] Scene synthesis failed:', error);
    return null;
  }
}

export type SceneSynth = (text: string, voiceId: string) => Promise<Buffer | null>;

/**
 * Synthesize (or fetch from cache) one segment per scene.
 * Returns null unless EVERY scene has audio — partial narration is worse than
 * the whole-narration fallback.
 *
 * `synth` is injectable so pacing/caching are testable without an API key.
 */
export async function synthesizeSceneVoiceovers(
  scenes: SceneLine[],
  voiceId?: string | null,
  synth: SceneSynth = elevenLabsSynth,
): Promise<SceneVoiceover[] | null> {
  if (scenes.length === 0) return null;
  // Validated upstream (catalog or the user's cloned voice) — use verbatim.
  const voice = voiceId || DEFAULT_VOICE_ID;
  const out: SceneVoiceover[] = [];

  for (const scene of scenes) {
    const text = scene.description.trim();
    if (!text) return null;

    const file = path.join(cacheDir(), `${sceneCacheKey(text, voice)}.mp3`);
    let cached = fs.existsSync(file) && fs.statSync(file).size > 0;

    if (!cached) {
      const audio = await synth(text.slice(0, 1000), voice);
      if (!audio || audio.length === 0) return null;
      fs.writeFileSync(file, audio);
    }

    const durationSeconds = probeAudioSeconds(file);
    if (durationSeconds <= 0) {
      // A corrupt cache entry must not poison every future render.
      fs.rmSync(file, { force: true });
      return null;
    }

    out.push({ sceneId: scene.id, path: file, durationSeconds, cached });
  }

  return out;
}

/**
 * Concatenate the segments into one narration file for the mixer.
 * Segments are same-codec mp3 (both ElevenLabs and the cache), so the concat
 * demuxer applies; output is re-encoded to AAC for the final mux.
 */
export async function concatSceneVoiceovers(
  segments: SceneVoiceover[],
  outPath: string,
): Promise<string> {
  const listPath = `${outPath}.txt`;
  fs.writeFileSync(
    listPath,
    segments.map((s) => `file '${s.path.replace(/\\/g, '/')}'`).join('\n'),
  );

  const result = spawnSync(
    resolveFfmpegPath(),
    ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'aac', '-b:a', '192k', outPath],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  fs.rmSync(listPath, { force: true });

  if (result.status !== 0 || !fs.existsSync(outPath)) {
    throw new Error(`Voiceover concat failed: ${String(result.stderr ?? '').slice(-300)}`);
  }
  return outPath;
}

/** The duration each scene should get when its narration drives the cut. */
export function pacedDuration(segment: SceneVoiceover): number {
  return Math.max(1, Number((segment.durationSeconds + SCENE_AUDIO_PADDING_SECONDS).toFixed(3)));
}
