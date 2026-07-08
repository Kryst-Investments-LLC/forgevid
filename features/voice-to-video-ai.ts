/**
 * Voice-to-video: speak a brief, get a video.
 *
 * This used to build a FAKE transcript ("Transcribed audio from N byte file")
 * and hand it to Replicate's Zeroscope (2023-era, 576p @ 8fps). Both are gone:
 * the audio is really transcribed with Whisper now, and the transcript feeds the
 * normal async generation pipeline — the same one the AI Studio uses — so it
 * inherits scenes, captions, music, branding and the progress endpoint.
 */

import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { transcribeAudioToText } from '@/lib/captions';

export interface VoiceToVideoOptions {
  duration: number;
  style: 'professional' | 'casual' | 'dramatic';
  language: string;
}

/** Spoken styles mapped onto the generation styles the pipeline understands. */
export const VOICE_STYLE_MAP: Record<
  VoiceToVideoOptions['style'],
  'modern' | 'cinematic' | 'energetic' | 'professional'
> = {
  professional: 'professional',
  casual: 'modern',
  dramatic: 'cinematic',
};

/**
 * Transcribe recorded audio. Returns the spoken text, or null when Whisper is
 * unavailable — the caller must surface that rather than invent a transcript.
 */
export async function transcribeVoiceRecording(
  audio: Buffer,
  fileExtension = 'webm',
): Promise<string | null> {
  const tempPath = join(tmpdir(), `voice_${Date.now()}.${fileExtension}`);
  try {
    await writeFile(tempPath, audio);
    return await transcribeAudioToText(tempPath);
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}

/** Turn a spoken brief into a prompt for the generation pipeline. */
export function promptFromTranscript(
  transcript: string,
  style: VoiceToVideoOptions['style'],
): string {
  return `Create a ${style} video based on this spoken brief: ${transcript}`;
}

export function validateAudioFormat(file: File): boolean {
  const allowedTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp3',
    'audio/ogg',
    'audio/webm',
    'video/webm', // MediaRecorder frequently labels audio-only webm this way
  ];
  return allowedTypes.includes(file.type);
}

export function validateAudioDuration(file: File, maxDuration: number = 300): Promise<boolean> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      resolve(audio.duration <= maxDuration);
    };
    audio.src = URL.createObjectURL(file);
  });
}
