/**
 * Stock-footage video generator with scene-by-scene matching.
 *
 * Decomposed into three composable stages so scenes are first-class and can be
 * persisted, edited, and re-rendered without re-deriving them from the prompt:
 *
 *   planScenes(script, duration)   -> PlannedScene[]   (GPT scene decomposition)
 *   resolveSceneClips(scenes)      -> ResolvedScene[]  (Pexels footage matching)
 *   assembleVideo(scenes, ...)     -> public URL       (FFmpeg + voiceover + upload)
 *
 * Failures are surfaced, never papered over with someone else's demo video.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { uploadImage as uploadCloudinaryImage, uploadVideo as uploadCloudinaryVideo } from './cloudinary';
import { selectMusicPath } from './music-library';
import { DEFAULT_TTS_MODEL, resolveVoiceId } from './voice-catalog';
import {
  buildCaptionFilter,
  buildWatermarkFilter,
  cuesFromScenes,
  shiftCues,
  transcribeToCues,
  type CaptionCue,
  type CaptionStyle,
} from './captions';
import { overlayPosition, type Branding } from './brand-kit';
import {
  DEFAULT_TRANSITION,
  buildXfadeChain,
  clampTransitionDuration,
  paddedClipDurations,
  type TransitionConfig,
} from './transitions';
import { resolveFfmpegPath, supportsFilter } from './ffmpeg-env';
import { buildKenBurnsFilter, directionForScene } from './ken-burns';

// Dynamic imports to avoid webpack bundling issues
let ffmpeg: any;
let createClient: any;
let OpenAI: any;

let ffmpegBin = '';

async function initializeModules() {
  if (!ffmpeg) {
    const fluentFfmpeg = await import('fluent-ffmpeg');
    ffmpeg = fluentFfmpeg.default;
    // Prefer a system ffmpeg: the bundled installer pins a 2018 build with no
    // xfade. See lib/ffmpeg-env.ts.
    ffmpegBin = resolveFfmpegPath();
    ffmpeg.setFfmpegPath(ffmpegBin);
  }
  if (!createClient) {
    const pexels = await import('pexels');
    createClient = pexels.createClient;
  }
  if (!OpenAI) {
    const openai = await import('openai');
    OpenAI = openai.OpenAI;
  }
}

let pexelsClient: any = null;

/** A scene as planned from the script, before footage is chosen. */
export interface PlannedScene {
  id: string;
  index: number;
  description: string;
  keywords: string[];
  duration: number;
  visualElements: string[];
}

/** A planned scene with its chosen stock clip. */
export interface ResolvedScene extends PlannedScene {
  clipUrl: string;
  matchedQuery: string;
  /**
   * Stills get Ken Burns motion instead of being held static. Optional so scenes
   * persisted before this existed still load (they were all videos).
   */
  mediaType?: 'video' | 'image';
}

export interface VideoClip {
  url: string;
  duration: number;
  type: 'video' | 'image';
}

/** Output shape. Drives both the render size and the stock-footage search. */
export type AspectRatio = '16:9' | '9:16' | '1:1';

export const ASPECT_PRESETS: Record<
  AspectRatio,
  { width: number; height: number; orientation: 'landscape' | 'portrait' | 'square' }
> = {
  '16:9': { width: 1920, height: 1080, orientation: 'landscape' },
  '9:16': { width: 1080, height: 1920, orientation: 'portrait' },
  '1:1': { width: 1080, height: 1080, orientation: 'square' },
};

export function aspectPreset(aspectRatio: AspectRatio = '16:9') {
  return ASPECT_PRESETS[aspectRatio] ?? ASPECT_PRESETS['16:9'];
}

/** scale+pad filter that fits source footage into the target frame. */
function fitFilter(aspectRatio: AspectRatio): string {
  const { width, height } = aspectPreset(aspectRatio);
  return (
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1`
  );
}

export interface GenerationOptions {
  prompt: string;
  style: string;
  duration: number;
  addOns: string[];
  aspectRatio?: AspectRatio;
  /** Mood tag used to pick a music track; defaults to `style`. */
  mood?: string;
  /** ElevenLabs voice id for the narration. */
  voiceId?: string;
  /** Plan-gated branding (watermark / logo / intro / outro). */
  branding?: Branding | null;
  /** Cross-fade between scenes; null for hard cuts. */
  transition?: TransitionConfig | null;
}

function sceneId(index: number): string {
  return `scene-${index + 1}`;
}

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function persistGeneratedVideo(outputPath: string, outputFilename: string): Promise<string> {
  const localUrl = `/generated/${outputFilename}`;

  if (!isCloudinaryConfigured()) {
    console.log('[Video Generator] Cloudinary not configured — keeping local generated file');
    return localUrl;
  }

  try {
    const uploadResult = await uploadCloudinaryVideo(outputPath, {
      folder: 'forgevid/generated-ai-videos',
      resource_type: 'video',
    });

    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (cleanupError) {
      console.error('[Video Generator] Failed to cleanup local file after upload:', cleanupError);
    }

    console.log('[Video Generator] ✓ Persisted to Cloudinary:', uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (uploadError) {
    console.error('[Video Generator] Cloudinary upload failed, keeping local file:', uploadError);
    return localUrl;
  }
}

/**
 * Duration of a media file, in seconds.
 *
 * `ffmpeg -i` prints it to stderr and exits non-zero (no output specified);
 * @ffmpeg-installer ships no ffprobe, so parse that. Returns 0 on failure.
 */
function probeDurationSeconds(filePath: string): number {
  const result = spawnSync(ffmpegBin, ['-hide_banner', '-i', filePath], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const match = `${result.stderr ?? ''}`.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/** Re-encode a clip to the render's frame size/fps so concat is seamless. */
async function normalizeClip(source: string, fit: string, outPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(source)
      .outputOptions([
        '-c:v libx264',
        '-preset ultrafast',
        '-crf 23',
        '-an',
        '-r 30',
        '-pix_fmt yuv420p',
      ])
      .videoFilters(fit)
      .output(outPath)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run();
  });
}

/**
 * Grab a poster frame from a rendered video and persist it.
 *
 * Best-effort: a missing thumbnail must never fail a generation, so every
 * failure path returns null. Must run before the local render is deleted.
 */
async function extractThumbnail(videoPath: string, atSeconds: number): Promise<string | null> {
  try {
    const outputDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const filename = `thumb_${Date.now()}.jpg`;
    const thumbPath = path.join(outputDir, filename);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .inputOptions([`-ss ${atSeconds.toFixed(2)}`])
        .outputOptions(['-frames:v 1', '-q:v 3'])
        .output(thumbPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    if (!fs.existsSync(thumbPath)) return null;

    if (isCloudinaryConfigured()) {
      try {
        const upload = await uploadCloudinaryImage(thumbPath, { folder: 'forgevid/thumbnails' });
        fs.unlinkSync(thumbPath);
        return upload.secure_url;
      } catch (error) {
        console.error('[Video Generator] Thumbnail upload failed, keeping local:', error);
      }
    }
    return `/generated/${filename}`;
  } catch (error) {
    console.error('[Video Generator] Thumbnail extraction failed (non-fatal):', error);
    return null;
  }
}

/**
 * Generate voiceover audio via ElevenLabs. Returns the .mp3 path, or null when
 * no key is configured (voiceover is optional — the video still renders).
 */
async function generateVoiceover(narration: string, voiceId?: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.log('[Video Generator] No ElevenLabs API key — skipping voiceover');
    return null;
  }

  try {
    const textToSpeak = narration.slice(0, 2000);
    const voice = resolveVoiceId(voiceId);
    console.log(`[Video Generator] Generating voiceover (${textToSpeak.length} chars, voice ${voice})...`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: textToSpeak,
          model_id: DEFAULT_TTS_MODEL,
          voice_settings: { stability: 0.6, similarity_boost: 0.6 },
        }),
      }
    );

    if (!response.ok) {
      console.error(`[Video Generator] ElevenLabs error: ${response.status} ${response.statusText}`);
      return null;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const voiceoverPath = path.join(tempDir, `voiceover_${Date.now()}.mp3`);
    fs.writeFileSync(voiceoverPath, audioBuffer);
    return voiceoverPath;
  } catch (error) {
    console.error('[Video Generator] Voiceover generation failed:', error);
    return null;
  }
}

export function isStockProviderConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

/**
 * Search Pexels for stock video. Returns [] when unavailable — callers decide
 * how to fail. We never substitute unrelated sample footage.
 */
export async function searchStockVideos(
  query: string,
  limit: number = 5,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape',
): Promise<VideoClip[]> {
  await initializeModules();

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];

  if (!pexelsClient && createClient) {
    pexelsClient = createClient(apiKey);
  }
  if (!pexelsClient) return [];

  try {
    const response = await pexelsClient.videos.search({
      query,
      per_page: limit,
      size: 'large',
      // Matching orientation matters: landscape footage in a 9:16 frame is
      // mostly letterbox.
      orientation,
    });

    if ('videos' in response && response.videos) {
      return response.videos
        .map((video: any) => {
          const videoFiles = video.video_files || [];
          const hdFile = videoFiles.find(
            (f: any) => f.quality === 'hd' || (f.quality === 'sd' && f.width >= 1280)
          );
          const bestFile = hdFile || videoFiles[0];
          return {
            url: bestFile?.link || '',
            duration: video.duration || 5,
            type: 'video' as const,
          };
        })
        .filter((v: { url: string }) => v.url);
    }
  } catch (error) {
    console.error('[Video Generator] Pexels API error:', error);
  }

  return [];
}

/**
 * Search Pexels photos. Used when no video matches a scene — a still with Ken
 * Burns motion beats failing the whole generation.
 */
export async function searchStockPhotos(
  query: string,
  limit: number = 5,
  orientation: 'landscape' | 'portrait' | 'square' = 'landscape',
): Promise<VideoClip[]> {
  await initializeModules();

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return [];
  if (!pexelsClient && createClient) pexelsClient = createClient(apiKey);
  if (!pexelsClient) return [];

  try {
    const response = await pexelsClient.photos.search({ query, per_page: limit, orientation });
    if ('photos' in response && response.photos) {
      return response.photos
        .map((photo: any) => ({
          url: photo.src?.large2x || photo.src?.large || photo.src?.original || '',
          duration: 0,
          type: 'image' as const,
        }))
        .filter((p: { url: string }) => p.url);
    }
  } catch (error) {
    console.error('[Video Generator] Pexels photo search error:', error);
  }
  return [];
}

/**
 * Download a remote file into public/temp. A local path is returned as-is,
 * which keeps assembleVideo testable without network access.
 */
async function downloadFile(url: string, filename: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    if (!fs.existsSync(url)) throw new Error(`Scene source not found on disk: ${url}`);
    return url;
  }
  const tempDir = path.join(process.cwd(), 'public', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const filepath = path.join(tempDir, filename);
  const response = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filepath));
    writer.on('error', reject);
  });
}

/**
 * Stage 1 — decompose the script into scenes with GPT.
 */
export async function planScenes(script: string, totalDuration: number): Promise<PlannedScene[]> {
  await initializeModules();

  const withIds = (raw: any[]): PlannedScene[] =>
    raw
      .filter((s) => s && typeof s.description === 'string')
      .map((s, i) => ({
        id: sceneId(i),
        index: i,
        description: String(s.description),
        keywords: Array.isArray(s.keywords) ? s.keywords.map(String) : [],
        duration: Number(s.duration) > 0 ? Number(s.duration) : Math.max(1, totalDuration / raw.length),
        visualElements: Array.isArray(s.visualElements) ? s.visualElements.map(String) : [],
      }));

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a video production assistant. Parse the video script into individual scenes for stock footage matching.

For each scene, extract:
1. Scene description (what's happening)
2. Search keywords (3-5 visual elements that can be found in stock footage)
3. Duration in seconds (distribute ${totalDuration}s total across all scenes)
4. Key visual elements

Return ONLY a JSON array with this structure:
[
  {
    "description": "Opening with flour on countertop",
    "keywords": ["flour", "baking", "countertop", "kitchen"],
    "duration": 5,
    "visualElements": ["flour dust", "wooden counter", "baking preparation"]
  }
]

Be specific and focus on filmable, real-world visuals. Avoid abstract concepts.`,
        },
        { role: 'user', content: `Parse this script into scenes:\n\n${script}` },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    let content = (response.choices[0]?.message?.content || '').trim();

    // Strip markdown fences, then fall back to extracting the JSON array.
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      if (lines[0].trim().match(/^```(json)?$/)) lines.shift();
      if (lines[lines.length - 1].trim() === '```') lines.pop();
      content = lines.join('\n').trim();
    }
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) content = jsonMatch[0];

    const parsed = JSON.parse(content);
    const raw = Array.isArray(parsed) ? parsed : parsed.scenes || [];
    const scenes = withIds(raw);

    if (scenes.length > 0) {
      console.log(`[Video Generator] Planned ${scenes.length} scenes`);
      return scenes;
    }
  } catch (error) {
    console.error('[Video Generator] Scene planning failed:', error);
  }

  // Degrade to a single scene rather than failing the whole job.
  return [
    {
      id: sceneId(0),
      index: 0,
      description: script.substring(0, 100),
      keywords: await extractKeywordsLegacy(script, 'cinematic'),
      duration: totalDuration,
      visualElements: [],
    },
  ];
}

/** Legacy keyword extraction, used when scene planning degrades. */
async function extractKeywordsLegacy(prompt: string, style: string): Promise<string[]> {
  try {
    const { OpenAI: OpenAICtor } = await import('openai');
    const openai = new OpenAICtor({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Extract 3-5 visual keywords from the video description that would be good search terms for finding stock footage. Return ONLY a comma-separated list of keywords. Focus on locations, objects, actions, and visual elements that can be filmed. Avoid abstract concepts.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 50,
      temperature: 0.3,
    });

    const extracted = (response.choices[0]?.message?.content || '')
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 2);

    if (extracted.length > 0) return extracted.slice(0, 5);
  } catch (error) {
    console.error('[Video Generator] AI keyword extraction failed:', error);
  }

  const commonWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'for', 'with', 'about', 'create', 'make', 'video', 'generate', 'prompt', 'description', 'short', 'animated'];
  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !commonWords.includes(word));

  const styleKeywords: Record<string, string[]> = {
    cinematic: ['nature', 'landscape', 'sunset'],
    modern: ['city', 'technology', 'business'],
    energetic: ['sports', 'action', 'movement'],
    professional: ['office', 'meeting', 'workplace'],
  };

  return [...new Set([...words.slice(0, 3), ...(styleKeywords[style] || [])])].slice(0, 5);
}

/**
 * Pick a stock clip for one scene. Tries the scene description first (better
 * semantic match than a bare keyword), then each keyword. Skips any clip URL in
 * `exclude` so scenes don't reuse the same footage.
 */
export async function resolveSceneClip(
  scene: PlannedScene,
  exclude: Set<string> = new Set(),
  aspectRatio: AspectRatio = '16:9',
): Promise<ResolvedScene | null> {
  const { orientation } = aspectPreset(aspectRatio);
  const descriptionQuery = scene.description.split(/\s+/).slice(0, 6).join(' ');
  const queries = [descriptionQuery, ...scene.keywords].filter(Boolean);

  for (const query of queries) {
    const candidates = await searchStockVideos(query, 5, orientation);
    const fresh = candidates.filter((c) => !exclude.has(c.url));
    if (fresh.length > 0) {
      return { ...scene, clipUrl: fresh[0].url, matchedQuery: query, mediaType: 'video' };
    }
  }

  // No footage: a still with Ken Burns motion beats failing the generation.
  for (const query of queries) {
    const photos = await searchStockPhotos(query, 5, orientation);
    const fresh = photos.filter((p) => !exclude.has(p.url));
    if (fresh.length > 0) {
      console.log(`[Video Generator] Scene ${scene.index + 1}: no video, using a photo`);
      return { ...scene, clipUrl: fresh[0].url, matchedQuery: query, mediaType: 'image' };
    }
  }

  return null;
}

/**
 * Stage 2 — choose footage for every scene. Throws if no provider is
 * configured or if a scene cannot be matched, rather than silently shipping
 * unrelated sample footage.
 */
export async function resolveSceneClips(
  scenes: PlannedScene[],
  aspectRatio: AspectRatio = '16:9',
): Promise<ResolvedScene[]> {
  if (!isStockProviderConfigured()) {
    throw new Error('No stock footage provider configured. Set PEXELS_API_KEY to generate videos.');
  }

  const used = new Set<string>();
  const resolved: ResolvedScene[] = [];

  for (const scene of scenes) {
    const match = await resolveSceneClip(scene, used, aspectRatio);
    if (!match) {
      throw new Error(`No stock footage found for scene ${scene.index + 1}: "${scene.description}"`);
    }
    used.add(match.clipUrl);
    resolved.push(match);
    console.log(`[Video Generator] ✓ Scene ${scene.index + 1} matched "${match.matchedQuery}"`);
  }

  return resolved;
}

/**
 * Stage 3 — download, trim, concat, caption, add voiceover, and upload.
 * Takes an explicit scene list so re-renders can skip planning/resolving.
 */
export interface AssembleOptions {
  /** Absolute path to a background music file. Looped and ducked under narration. */
  musicPath?: string | null;
  /** Music level before ducking (0-1). */
  musicVolume?: number;
  /**
   * Reuse an existing voiceover instead of synthesizing a new one. Lets a
   * re-render skip a paid TTS call — and makes the assembler testable offline.
   */
  voiceoverPath?: string | null;
  /** ElevenLabs voice id; unknown ids fall back to the default. */
  voiceId?: string | null;
  /**
   * Pre-computed caption cues. When omitted, the voiceover is transcribed with
   * Whisper; failing that we fall back to one cue per scene.
   */
  cues?: CaptionCue[] | null;
  captionStyle?: CaptionStyle;
  /** Plan-gated branding: watermark, logo, intro/outro, caption colour/font. */
  branding?: Branding | null;
  /** Cross-fade between scenes. Pass null for hard cuts. */
  transition?: TransitionConfig | null;
}

export interface AssembleResult {
  videoUrl: string;
  /** The cues actually burned in — persist these for SRT/VTT export. */
  cues: CaptionCue[];
  /** Poster frame URL, or null if extraction failed (never fatal). */
  thumbnailUrl: string | null;
}

export async function assembleVideo(
  scenes: ResolvedScene[],
  addOns: string[] = [],
  aspectRatio: AspectRatio = '16:9',
  options: AssembleOptions = {},
): Promise<AssembleResult> {
  await initializeModules();

  if (scenes.length === 0) throw new Error('Cannot assemble a video with no scenes');

  const fit = fitFilter(aspectRatio);
  const scenesDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const musicVolume = options.musicVolume ?? 0.25;
  const branding = options.branding ?? null;

  const tempDir = path.join(process.cwd(), 'public', 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const wantVoiceover = addOns.length === 0 || addOns.includes('voiceover');
  const wantSubtitles = addOns.length === 0 || addOns.includes('subtitles');
  const narration = scenes.map((s) => s.description).join('. ').replace(/\s+/g, ' ').trim();

  /** Source media handed to ffmpeg (may be a caller-owned local path). */
  const sources: string[] = [];
  /** Only files WE created — everything here gets deleted in `finally`. */
  const tempFiles: string[] = [];
  const trimmed: string[] = [];
  let voiceoverPath: string | null = null;
  let fileListPath = '';

  try {
    // Fetch footage and synthesize narration in parallel.
    const [clipPaths, vo] = await Promise.all([
      (async () => {
        const paths: string[] = [];
        for (const scene of scenes) {
          const ext = scene.mediaType === 'image' ? 'jpg' : 'mp4';
          const filename = `scene_${Date.now()}_${scene.index}.${ext}`;
          const resolved = await downloadFile(scene.clipUrl, filename);
          paths.push(resolved);
          // Only a downloaded copy is ours to delete; a local source is not.
          if (resolved !== scene.clipUrl) tempFiles.push(resolved);
        }
        return paths;
      })(),
      // An injected voiceover wins: re-renders reuse it instead of paying for TTS again.
      options.voiceoverPath
        ? Promise.resolve(options.voiceoverPath)
        : wantVoiceover
          ? generateVoiceover(narration, options.voiceId ?? undefined)
          : Promise.resolve(null),
    ]);
    sources.push(...clipPaths);
    voiceoverPath = vo;
    // Only a voiceover we synthesized is ours to delete.
    if (voiceoverPath && !options.voiceoverPath) tempFiles.push(voiceoverPath);

    // Cross-fades overlap clips, so each clip but the last is rendered longer by
    // the transition duration — that keeps the total equal to sum(sceneDurations),
    // which keeps the narration in sync and caption cues valid.
    const sceneDurations = scenes.map((s) => s.duration);
    let requested = options.transition === null ? null : options.transition ?? DEFAULT_TRANSITION;

    // xfade needs ffmpeg >= 4.3. Degrade to hard cuts rather than failing.
    if (requested && !supportsFilter('xfade')) {
      console.warn(
        `[Video Generator] This ffmpeg has no xfade filter (needs >= 4.3) — ` +
          `rendering hard cuts. Install a newer ffmpeg or set FFMPEG_PATH.`,
      );
      requested = null;
    }

    const transitionDuration = requested
      ? clampTransitionDuration(requested.duration, sceneDurations)
      : 0;
    const transition: TransitionConfig | null =
      requested && transitionDuration > 0
        ? { type: requested.type, duration: transitionDuration }
        : null;
    const clipDurations = paddedClipDurations(sceneDurations, transitionDuration);

    const { width: outW, height: outH } = aspectPreset(aspectRatio);
    const kenBurnsAvailable = supportsFilter('zoompan');

    // Trim each clip to its (possibly padded) duration. A still is looped and
    // given Ken Burns motion — held static it reads as a broken video.
    for (let i = 0; i < scenes.length; i++) {
      const trimmedPath = path.join(tempDir, `trimmed_${Date.now()}_${i}.mp4`);
      const isStill = scenes[i].mediaType === 'image';
      const clipDuration = clipDurations[i];

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg(sources[i]);

        if (isStill) {
          // A single image must be looped to fill the clip's duration.
          cmd.inputOptions(['-loop 1']);
        }

        cmd
          .setDuration(clipDuration)
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-crf 23',
            '-an',
            '-r 30',
            '-pix_fmt yuv420p',
            '-movflags +faststart',
          ])
          .videoFilters(
            isStill && kenBurnsAvailable
              ? buildKenBurnsFilter({
                  width: outW,
                  height: outH,
                  fps: 30,
                  durationSeconds: clipDuration,
                  direction: directionForScene(i),
                })
              : fit,
          )
          .output(trimmedPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });
      trimmed.push(trimmedPath);
    }

    // Cross-fade the scenes into ONE clip, so the rest of the pipeline (bookend
    // concat, captions, audio) is untouched. Skipped for a single scene.
    if (transition && trimmed.length > 1) {
      const chain = buildXfadeChain(clipDurations, transition);
      const fadedPath = path.join(tempDir, `xfade_${Date.now()}.mp4`);

      await new Promise<void>((resolve, reject) => {
        const cmd = ffmpeg();
        for (const clip of trimmed) cmd.input(clip);
        cmd
          .complexFilter(chain.filters.join(';'), [chain.outputLabel])
          .outputOptions([
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '23',
            '-an',
            '-r', '30',
            '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart',
          ])
          .output(fadedPath)
          .on('end', () => resolve())
          .on('error', (err: Error) => reject(err))
          .run();
      });

      tempFiles.push(...trimmed);
      trimmed.length = 0;
      trimmed.push(fadedPath);
      console.log(
        `[Video Generator] Applied ${transition.type} transitions (${transition.duration}s)`,
      );
    }

    // Brand intro/outro bookend the scenes. They must be normalized to the same
    // codec/size/fps or the concat demuxer produces a broken stream.
    let introDuration = 0;
    let outroDuration = 0;

    const prepareBookend = async (url: string, label: string): Promise<string> => {
      const src = await downloadFile(url, `${label}_${Date.now()}.mp4`);
      if (src !== url) tempFiles.push(src);
      const normalized = path.join(tempDir, `${label}_norm_${Date.now()}.mp4`);
      await normalizeClip(src, fit, normalized);
      tempFiles.push(normalized);
      return normalized;
    };

    if (branding?.introUrl) {
      try {
        const intro = await prepareBookend(branding.introUrl, 'intro');
        introDuration = probeDurationSeconds(intro);
        trimmed.unshift(intro);
      } catch (error) {
        console.error('[Video Generator] Intro failed, skipping (non-fatal):', error);
      }
    }
    if (branding?.outroUrl) {
      try {
        const outro = await prepareBookend(branding.outroUrl, 'outro');
        outroDuration = probeDurationSeconds(outro);
        trimmed.push(outro);
      } catch (error) {
        console.error('[Video Generator] Outro failed, skipping (non-fatal):', error);
      }
    }

    const timelineDuration = introDuration + scenesDuration + outroDuration;

    fileListPath = path.join(tempDir, `filelist_${Date.now()}.txt`);
    fs.writeFileSync(fileListPath, trimmed.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n'));

    const outputFilename = `generated_video_${Date.now()}.mp4`;
    const outputDir = path.join(process.cwd(), 'public', 'generated');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, outputFilename);

    // Real captions come from transcribing the narration. Without a voiceover
    // (or without an OpenAI key) fall back to one cue per scene.
    let cues: CaptionCue[] = [];
    if (wantSubtitles) {
      cues =
        options.cues ??
        (voiceoverPath ? await transcribeToCues(voiceoverPath) : null) ??
        cuesFromScenes(scenes);

      // A brand intro delays the narration; shift the cues to match.
      cues = shiftCues(cues, introDuration);
    }

    const captionStyle: CaptionStyle = {
      ...options.captionStyle,
      ...(branding?.captionColor ? { fontColor: branding.captionColor } : {}),
      ...(branding?.fontFile ? { fontFile: branding.fontFile } : {}),
    };

    const textFilter = cues.length > 0 ? buildCaptionFilter(cues, captionStyle) : '';
    const watermarkFilter = branding?.watermarkText
      ? buildWatermarkFilter(branding.watermarkText)
      : '';

    const videoFilter = [fit, textFilter, watermarkFilter].filter(Boolean).join(',');

    const musicPath = options.musicPath ?? null;

    // Materialize the brand logo up front — it becomes an extra ffmpeg input.
    let logoPath: string | null = null;
    if (branding?.logoUrl) {
      try {
        logoPath = await downloadFile(branding.logoUrl, `logo_${Date.now()}.png`);
        if (logoPath !== branding.logoUrl) tempFiles.push(logoPath);
      } catch (error) {
        console.error('[Video Generator] Logo fetch failed, skipping (non-fatal):', error);
        logoPath = null;
      }
    }

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg().input(fileListPath).inputOptions(['-f concat', '-safe 0']);

      // Input indices: 0 = concatenated video, then voiceover, music, logo.
      let inputIndex = 0;
      let voiceIndex = -1;
      let musicIndex = -1;
      let logoIndex = -1;
      if (voiceoverPath) {
        command.input(voiceoverPath);
        voiceIndex = ++inputIndex;
      }
      if (musicPath) {
        // Loop a short track to cover the whole video; -t below bounds the output.
        command.input(musicPath).inputOptions(['-stream_loop -1']);
        musicIndex = ++inputIndex;
      }
      if (logoPath) {
        // A still image must loop, or it appears for a single frame.
        command.input(logoPath).inputOptions(['-loop 1']);
        logoIndex = ++inputIndex;
      }

      // ffmpeg accepts either -vf or -filter_complex, never both — so the video
      // chain lives in the complex graph now that audio needs one.
      const filters: string[] = [];
      if (logoIndex > 0) {
        filters.push(`[0:v]${videoFilter}[vbase]`);
        filters.push(`[${logoIndex}:v]format=rgba,colorchannelmixer=aa=${branding!.logoOpacity}[logo]`);
        filters.push(
          `[vbase][logo]overlay=${overlayPosition(branding!.logoPosition)}:format=auto,` +
            `format=yuv420p[vout]`,
        );
      } else {
        filters.push(`[0:v]${videoFilter}[vout]`);
      }

      // sidechaincompress requires both inputs in the same format.
      const AFMT = 'aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo';

      if (voiceIndex > 0 && musicIndex > 0) {
        // Duck the music using the narration as the sidechain key.
        //
        // The key MUST be padded with silence: sidechaincompress stops as soon
        // as its sidechain input ends, which would kill the music the instant
        // narration finishes. Padding lets the compressor release back to full
        // volume and keep the music playing to the end of the video.
        filters.push(`[${voiceIndex}:a]${AFMT},asplit=2[vo][vokeyraw]`);
        filters.push(`[vokeyraw]apad[vokey]`);
        filters.push(`[${musicIndex}:a]${AFMT},volume=${musicVolume}[mus]`);
        filters.push(
          `[mus][vokey]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[musduck]`,
        );
        // duration=longest keeps the (looped) music going past the narration.
        filters.push(`[vo][musduck]amix=inputs=2:duration=longest:dropout_transition=0[aout]`);
      } else if (voiceIndex > 0) {
        filters.push(`[${voiceIndex}:a]${AFMT}[aout]`);
      } else if (musicIndex > 0) {
        filters.push(`[${musicIndex}:a]${AFMT},volume=${musicVolume}[aout]`);
      }

      const hasAudio = voiceIndex > 0 || musicIndex > 0;
      const maps = hasAudio ? ['vout', 'aout'] : ['vout'];

      const outputOptions = [
        // Bound the output: music is looped infinitely, and -shortest is
        // unreliable for streams coming out of filter_complex.
        '-t', String(timelineDuration),
        '-c:v', 'libx264',
        '-preset', 'slow',
        '-crf', '18',
        '-r', '30',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-max_muxing_queue_size', '1024',
      ];

      if (hasAudio) {
        outputOptions.push('-c:a', 'aac', '-b:a', '192k');
      } else {
        outputOptions.push('-an');
      }

      command
        // complexFilter(), not outputOptions(['-vf', ...]): fluent splits an array
        // entry containing EXACTLY ONE space (custom.js: `split.length === 2`), so
        // a two-word caption like "Opening shot" tears the filter in half.
        .complexFilter(filters.join(';'), maps)
        .outputOptions(outputOptions)
        .output(outputPath)
        .on('progress', (p: any) => console.log(`[Video Generator] Assembly ${p.percent?.toFixed(1) || 0}%`))
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });

    // Grab the poster frame BEFORE persisting — persistGeneratedVideo deletes
    // the local render once it is uploaded. Take it ~1s in, past any fade-in.
    const thumbnailUrl = await extractThumbnail(outputPath, Math.min(1, timelineDuration / 2));

    const videoUrl = await persistGeneratedVideo(outputPath, outputFilename);
    return { videoUrl, cues, thumbnailUrl };
  } finally {
    // Always clean temp artifacts, even on failure. Never the caller's media —
    // a synthesized voiceover is already in tempFiles; an injected one is not,
    // and neither is the music track.
    for (const file of [...tempFiles, ...trimmed, fileListPath]) {
      if (!file) continue;
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
      } catch (error) {
        console.error('[Video Generator] Cleanup error:', error);
      }
    }
  }
}

/**
 * Full generation returning BOTH the video URL and the scene structure, so the
 * caller can persist scenes for later editing / re-rendering.
 */
export async function generateVideoWithScenes(
  options: GenerationOptions,
): Promise<{
  videoUrl: string;
  scenes: ResolvedScene[];
  cues: CaptionCue[];
  thumbnailUrl: string | null;
}> {
  const { prompt, duration, addOns, aspectRatio = '16:9', mood, voiceId, branding, transition } =
    options;

  const planned = await planScenes(prompt, duration);
  if (planned.length === 0) throw new Error('Failed to plan any scenes from the script');

  const resolved = await resolveSceneClips(planned, aspectRatio);

  // Music is opt-out and silently skipped when the library is empty.
  const wantMusic = !addOns || addOns.length === 0 || addOns.includes('music');
  const musicPath = wantMusic ? selectMusicPath(mood ?? options.style) : null;

  const { videoUrl, cues, thumbnailUrl } = await assembleVideo(resolved, addOns || [], aspectRatio, {
    musicPath,
    voiceId,
    branding,
    transition,
  });

  console.log(
    `[Video Generator] ✅ Generated ${duration}s ${aspectRatio} video with ${resolved.length} scenes`,
  );
  return { videoUrl, scenes: resolved, cues, thumbnailUrl };
}

/** Backwards-compatible wrapper returning just the URL. */
export async function generateVideoFromPrompt(options: GenerationOptions): Promise<string> {
  const { videoUrl } = await generateVideoWithScenes(options);
  return videoUrl;
}

export type { CaptionCue } from './captions';

/** Remove generated/temp files older than 24h. */
export function cleanupOldVideos() {
  const generatedDir = path.join(process.cwd(), 'public', 'generated');
  const tempDir = path.join(process.cwd(), 'public', 'temp');

  const cleanDirectory = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    for (const file of fs.readdirSync(dir)) {
      const filepath = path.join(dir, file);
      try {
        if (now - fs.statSync(filepath).mtimeMs > maxAge) {
          fs.unlinkSync(filepath);
        }
      } catch (error) {
        console.error(`[Video Generator] Failed to cleanup ${file}:`, error);
      }
    }
  };

  cleanDirectory(generatedDir);
  cleanDirectory(tempDir);
}
