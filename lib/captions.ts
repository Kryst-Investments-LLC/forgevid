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
import type * as fsTypes from 'fs';

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
  /** Text colour. Must be a validated hex value — it goes into a filtergraph. */
  fontColor?: string;
  /** Override the resolved system font (brand kit typeface). */
  fontFile?: string | null;
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

/**
 * Push every cue later by `offsetSeconds`.
 *
 * Cue times are relative to the scenes. Anything prepended to the render (a
 * brand intro) delays the narration, so without this every caption fires early.
 */
export function shiftCues(cues: CaptionCue[], offsetSeconds: number): CaptionCue[] {
  if (!offsetSeconds) return cues;
  return cues.map((c) => ({ ...c, start: c.start + offsetSeconds, end: c.end + offsetSeconds }));
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

/**
 * Where to look for a caption font, in order.
 *
 * drawtext without an explicit `fontfile` relies on fontconfig finding a
 * "Sans" family. That works on a desktop but a slim container (our Dockerfile
 * is node:18-alpine) ships no fonts at all, so rendering would die with
 * "Cannot find a valid font". Pin an explicit file instead.
 */
/** Directories distros keep fonts in. Searched, not assumed. */
const FONT_DIRS = [
  '/usr/share/fonts',
  '/usr/local/share/fonts',
  '/System/Library/Fonts',
  '/Library/Fonts',
  'C:/Windows/Fonts',
];

/** Preferred faces, best first. Anything else is a last resort. */
const PREFERRED = [
  'dejavusans.ttf',
  'liberationsans-regular.ttf',
  'notosans-regular.ttf',
  'arial.ttf',
  'freesans.ttf',
];

/** Shallow-recursive .ttf search — distros nest fonts one or two levels deep. */
function findTtfFiles(dir: string, depth = 2): string[] {
  if (depth < 0 || !fs.existsSync(dir)) return [];
  let found: string[] = [];
  let entries: fsTypes.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found = found.concat(findTtfFiles(full, depth - 1));
    else if (/\.ttf$/i.test(entry.name)) found.push(full);
  }
  return found;
}

let cachedFont: string | null | undefined;

/**
 * Locate a usable caption font. Order: CAPTION_FONT_FILE, then a preferred face
 * found under any known font dir, then any .ttf at all. Cached.
 *
 * Searching beats hardcoding paths: Alpine, Debian and macOS all nest fonts
 * differently, and Alpine has moved the DejaVu package's install location.
 * Env is read lazily — the worker loads .env after this module is imported.
 */
export function resolveCaptionFontFile(): string | null {
  if (cachedFont !== undefined) return cachedFont;

  const explicit = process.env.CAPTION_FONT_FILE;
  if (explicit && fs.existsSync(explicit)) {
    cachedFont = explicit;
    return cachedFont;
  }

  const all = FONT_DIRS.flatMap((dir) => findTtfFiles(dir));
  const byPreference = PREFERRED.map((name) =>
    all.find((p) => p.toLowerCase().endsWith(`/${name}`)),
  ).find(Boolean);

  cachedFont = byPreference ?? all[0] ?? null;

  if (!cachedFont) {
    console.error(
      '[Captions] No caption font found — captions will be omitted. ' +
        'Install one (alpine: `apk add font-dejavu`) or set CAPTION_FONT_FILE.',
    );
  }
  return cachedFont;
}

/** Test hook: drop the cache so a changed CAPTION_FONT_FILE is picked up. */
export function __resetFontCache() {
  cachedFont = undefined;
}

/**
 * A path inside a filtergraph: `:` separates filter options, and a Windows
 * path is full of them (`C:\...`). Forward slashes + escaped colons, quoted.
 */
export function escapeFontPath(fontPath: string): string {
  return fontPath.replace(/\\/g, '/').replace(/:/g, '\\:');
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
  const {
    fontSize = 28,
    marginBottom = 60,
    maxCharsPerLine = 42,
    fontColor = 'white',
  } = { ...CAPTION_PRESETS.default, ...style };

  // A brand typeface wins, but only if it actually exists on disk.
  const brandFont = style.fontFile && fs.existsSync(style.fontFile) ? style.fontFile : null;
  // Without a font, drawtext aborts the whole render. Drop the captions instead
  // of losing the video; resolveCaptionFontFile() has already logged how to fix it.
  const font = brandFont ?? resolveCaptionFontFile();
  if (!font) return '';
  const fontOpt = `fontfile='${escapeFontPath(font)}':`;

  const filters: string[] = [];

  for (const cue of cues) {
    const lines = wrapText(cue.text, maxCharsPerLine);
    lines.forEach((line, lineIndex) => {
      // Stack lines upward from the bottom margin.
      const yOffset = marginBottom + (lines.length - 1 - lineIndex) * (fontSize + 8);
      filters.push(
        `drawtext=${fontOpt}text='${escapeDrawText(line)}':fontsize=${fontSize}:fontcolor=${fontColor}:` +
          `borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-${yOffset}:` +
          `enable='between(t\\,${cue.start.toFixed(3)}\\,${cue.end.toFixed(3)})'`,
      );
    });
  }

  return filters.join(',');
}

/**
 * A persistent watermark in the top-right corner (free plans).
 * Returns '' when no font is available, so a missing font never kills a render.
 */
export function buildWatermarkFilter(text: string, fontSize = 22): string {
  const font = resolveCaptionFontFile();
  if (!font) return '';
  return (
    `drawtext=fontfile='${escapeFontPath(font)}':text='${escapeDrawText(text)}':` +
    `fontsize=${fontSize}:fontcolor=white@0.85:borderw=1:bordercolor=black@0.6:` +
    `x=w-text_w-20:y=20`
  );
}
