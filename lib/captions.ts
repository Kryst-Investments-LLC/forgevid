/**
 * Captions.
 *
 * The pipeline used to burn in each scene's *description* over that scene's
 * time span — not the spoken narration, and not aligned to speech. Real
 * captions come from transcribing the voiceover with Whisper.
 *
 * Degrades cleanly: with no OPENAI_API_KEY (or no voiceover) we fall back to
 * scene-description cues, which is exactly the old behaviour.
 *
 * Relative imports only — reachable from the worker process.
 */

import fs from 'fs';

export interface CaptionCue {
  /** Seconds from the start of the video. */
  start: number;
  end: number;
  text: string;
}

export interface CaptionStyle {
  fontSize?: number;
  /** Distance from the bottom of the frame, in pixels. */
  marginBottom?: number;
  /** Wrap text at roughly this many characters per line. */
  maxCharsPerLine?: number;
}

/** Named presets so callers don't hand-tune pixel values. */
export const CAPTION_PRESETS: Record<string, CaptionStyle> = {
  default: { fontSize: 28, marginBottom: 60, maxCharsPerLine: 42 },
  large: { fontSize: 40, marginBottom: 80, maxCharsPerLine: 32 },
  subtle: { fontSize: 22, marginBottom: 40, maxCharsPerLine: 52 },
};

/**
 * Transcribe an audio file into timed cues with Whisper.
 * Returns null when transcription is unavailable — never throws the job away.
 */
export async function transcribeToCues(audioPath: string): Promise<CaptionCue[] | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.log('[Captions] No OPENAI_API_KEY — cannot transcribe, using scene captions');
    return null;
  }
  if (!fs.existsSync(audioPath)) return null;

  try {
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const result: any = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath) as any,
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    const segments = Array.isArray(result?.segments) ? result.segments : [];
    const cues: CaptionCue[] = segments
      .map((s: any) => ({
        start: Number(s.start) || 0,
        end: Number(s.end) || 0,
        text: String(s.text ?? '').trim(),
      }))
      .filter((c: CaptionCue) => c.text.length > 0 && c.end > c.start);

    if (cues.length === 0) return null;
    console.log(`[Captions] Transcribed ${cues.length} cues from the voiceover`);
    return cues;
  } catch (error) {
    console.error('[Captions] Transcription failed, falling back to scene captions:', error);
    return null;
  }
}

/** Fallback cues: one per scene, spanning that scene. Mirrors the old behaviour. */
export function cuesFromScenes(
  scenes: Array<{ description: string; duration: number }>,
): CaptionCue[] {
  const cues: CaptionCue[] = [];
  let t = 0;
  for (const scene of scenes) {
    cues.push({ start: t, end: t + scene.duration, text: scene.description });
    t += scene.duration;
  }
  return cues;
}

/** Greedy word wrap so long cues don't run off the frame. */
export function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line.length === 0) {
      line = word;
    } else if (line.length + 1 + word.length <= maxCharsPerLine) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Escape a value for FFmpeg's `drawtext=text='...'` .
 *
 * Inside single quotes a comma is literal, but a backslash, a colon and a
 * literal single quote are not, and `%` starts a strftime expansion. We drop
 * apostrophes rather than trying to re-open the quoted string.
 */
export function escapeDrawText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '')
    .replace(/%/g, '%%')
    .replace(/:/g, '\\:');
}

function fmtTime(seconds: number, sep: ',' | '.'): string {
  const clamped = Math.max(0, seconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms, 3)}`;
}

export function cuesToSrt(cues: CaptionCue[]): string {
  return (
    cues
      .map((c, i) => `${i + 1}\n${fmtTime(c.start, ',')} --> ${fmtTime(c.end, ',')}\n${c.text}`)
      .join('\n\n') + '\n'
  );
}

export function cuesToVtt(cues: CaptionCue[]): string {
  return (
    'WEBVTT\n\n' +
    cues
      .map((c) => `${fmtTime(c.start, '.')} --> ${fmtTime(c.end, '.')}\n${c.text}`)
      .join('\n\n') +
    '\n'
  );
}

/**
 * Build a drawtext filter chain that burns `cues` into the video.
 *
 * drawtext rather than the `subtitles` filter: no libass dependency in the
 * deploy image, and no filtergraph-escaping of a Windows `C:\...` path.
 * Returns '' when there is nothing to draw.
 */
export function buildCaptionFilter(cues: CaptionCue[], style: CaptionStyle = {}): string {
  const { fontSize = 28, marginBottom = 60, maxCharsPerLine = 42 } = {
    ...CAPTION_PRESETS.default,
    ...style,
  };

  const filters: string[] = [];

  for (const cue of cues) {
    const lines = wrapText(cue.text, maxCharsPerLine);
    lines.forEach((line, lineIndex) => {
      // Stack lines upward from the bottom margin.
      const yOffset = marginBottom + (lines.length - 1 - lineIndex) * (fontSize + 8);
      filters.push(
        `drawtext=text='${escapeDrawText(line)}':fontsize=${fontSize}:fontcolor=white:` +
          `borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-${yOffset}:` +
          `enable='between(t\\,${cue.start.toFixed(3)}\\,${cue.end.toFixed(3)})'`,
      );
    });
  }

  return filters.join(',');
}
