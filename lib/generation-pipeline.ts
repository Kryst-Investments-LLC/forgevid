/**
 * Video generation pipeline orchestrator.
 *
 * Single source of truth for running a generation job, used by BOTH:
 *   - the standalone BullMQ worker (workers/video-worker.ts), when Redis is set
 *   - the inline fire-and-forget fallback in the API route, when it is not
 *
 * Progress + result are persisted onto the Video row (metadata.generation JSON
 * + status), so the job-status endpoint can read a single source of truth
 * regardless of which execution path ran the job.
 *
 * Uses relative imports only, so the worker process (tsx) resolves the whole
 * graph without needing tsconfig path-alias support.
 */

import { prisma } from './prisma';
import { hasOpenAiKey, openAiApiKey } from './openai-key';
import { assembleVideo, generateVideoWithScenes, renderDims } from './video-generator';
import type { AspectRatio, ResolvedScene } from './video-generator';
import { selectMusicPath } from './music-library';
import { CAPTION_PRESETS, isCaptionPreset } from './captions';
import { freeBranding, resolveBranding } from './brand-kit';
import { resolveUserMedia } from './user-media';
import { estimateGenerationCost, recordGenerationCost } from './cost-ledger';
import { refundGenerationUsage } from './quota';
import { sendExportCompleteEmail } from './email';
import { rejectedClipUrls } from './clip-memory';

/**
 * "Your video is ready" — the come-back-to-a-finished-video loop. Best-effort:
 * an unconfigured SMTP or a bounced address never fails a finished render.
 */
async function notifyRenderComplete(videoId: string): Promise<void> {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        title: true,
        duration: true,
        resolution: true,
        url: true,
        fileUrl: true,
        user: { select: { email: true, name: true } },
      },
    });
    const url = video?.fileUrl || video?.url;
    if (!video?.user?.email || !url) return;
    await sendExportCompleteEmail(
      video.user.email,
      video.user.name || 'Creator',
      video.title || 'Your video',
      url,
      {
        duration: `${video.duration ?? '?'}s`,
        resolution: video.resolution ?? '',
        fileSize: '',
      },
    );
  } catch (error) {
    console.error('[Pipeline] Completion email failed (non-fatal):', error);
  }
}
import { DEFAULT_TRANSITION, isTransitionType, type TransitionConfig } from './transitions';

/** Rebuild a transition from persisted metadata, rejecting unknown types. */
function transitionFromMetadata(raw: any): TransitionConfig | null {
  if (raw === null) return null;
  if (!raw || !isTransitionType(raw.type)) return DEFAULT_TRANSITION;
  const duration = Number(raw.duration);
  return { type: raw.type, duration: Number.isFinite(duration) ? duration : DEFAULT_TRANSITION.duration };
}

/**
 * Branding is resolved from the video's OWNER on the server, never from client
 * input — otherwise a free user could simply ask for no watermark.
 */
async function brandingForVideo(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });
  if (!video) return freeBranding();
  return resolveBranding(video.userId);
}

/**
 * Resolve the PiP presenter clip (a VIDEO MediaAsset) to its url,
 * ownership-checked against the video's owner. The assembler localizes it.
 */
async function pipUrlForVideo(videoId: string, pipAssetId?: string): Promise<string | null> {
  if (!pipAssetId) return null;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });
  if (!video) return null;
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: pipAssetId, uploadedById: video.userId, type: 'VIDEO' },
    select: { url: true },
  });
  return asset?.url ?? null;
}

/**
 * Resolve an uploaded AUDIO asset (a narration recording, or a music track) to
 * a local file path, ownership-checked against the video's owner. Returns null
 * when absent or not owned, so generation degrades rather than failing.
 */
async function audioAssetForVideo(
  videoId: string,
  narrationAssetId?: string,
): Promise<string | null> {
  if (!narrationAssetId) return null;
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });
  if (!video) return null;

  const asset = await prisma.mediaAsset.findFirst({
    where: { id: narrationAssetId, uploadedById: video.userId, type: 'AUDIO' },
    select: { url: true },
  });
  if (!asset?.url) return null;

  const fs = await import('fs');
  const path = await import('path');
  // Local uploads live under public/; remote urls are fetched to temp.
  if (asset.url.startsWith('/')) {
    const p = path.join(process.cwd(), 'public', asset.url.replace(/^\/+/, ''));
    return fs.existsSync(p) ? p : null;
  }
  if (/^https?:\/\//.test(asset.url)) {
    try {
      const res = await fetch(asset.url);
      if (!res.ok) return null;
      const dir = path.join(process.cwd(), 'public', 'temp');
      fs.mkdirSync(dir, { recursive: true });
      const p = path.join(dir, `narration_${Date.now()}.audio`);
      fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
      return p;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Resolve the user's media from asset IDS against the video's owner. Never take
 * urls from the client — the renderer would happily fetch whatever it was given.
 */
async function userMediaForVideo(videoId: string, assetIds?: string[]) {
  if (!assetIds?.length) return [];
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });
  if (!video) return [];
  return resolveUserMedia(video.userId, assetIds);
}

export interface GenerationInput {
  prompt: string;
  style: string;
  duration: number;
  addOns?: string[];
  aspectRatio?: AspectRatio;
  /** ElevenLabs voice id for the narration. */
  voiceId?: string;
  /** Narration + caption language ('es' = Spanish). Stock search stays English. */
  language?: import('./video-generator').NarrationLanguage;
  /** Cross-fade between scenes; null means hard cuts. */
  transition?: TransitionConfig | null;
  /** Ids of the user's own MediaAssets to use, in scene order. */
  mediaAssetIds?: string[];
  /** 'draft' = fast preview, 'full' (default), '4k' = paid plans. */
  renderQuality?: import('./video-generator').RenderQuality;
  /** A MediaAsset (AUDIO) id: the user's OWN narration instead of AI TTS. */
  narrationAssetId?: string;
  /** Caption look; 'karaoke' = word-by-word highlight (Reels/TikTok style). */
  captionPreset?: import('./captions').CaptionPresetName;
  /**
   * Presenter picture-in-picture: a VIDEO MediaAsset id overlaid in a corner
   * over the whole video, muted (the voice belongs to the narration track).
   */
  pip?: {
    assetId: string;
    position?: import('./brand-kit').LogoPosition;
    /** Fraction of the frame width the overlay occupies (0.15–0.45). */
    size?: number;
  } | null;
  /** A MediaAsset (AUDIO) id: the user's OWN background music track. */
  musicAssetId?: string;
  /** Use ONLY the supplied media; never pad the plan with stock footage. */
  mediaOnly?: boolean;
  /** Address + price burned into the opening seconds (estate-agent lower third). */
  lowerThird?: { title: string; facts?: string[]; start?: number; duration?: number } | null;
  /** Campaign variation: a shared pre-planned body so only one axis varies. */
  presetScenes?: import('./video-generator').PlannedScene[];
  /** Override the opening line (the hook). */
  hookNarration?: string;
  /** Footage query for the hook. */
  hookSearchQuery?: string;
  /** Override the closing line (the CTA). */
  ctaNarration?: string;
  enableEmotionAware?: boolean;
}

export type GenerationStage =
  | 'queued'
  | 'script'
  | 'assembling'
  | 'uploading'
  | 'done'
  | 'failed';

export interface GenerationProgress {
  stage: GenerationStage;
  percent: number;
  message?: string;
  error?: string;
  videoUrl?: string;
  provider?: string;
  updatedAt: string;
}

// Coarse per-stage progress. The stock-footage assembler does not emit
// fine-grained progress, so we advance at stage boundaries.
const STAGE_PERCENT: Record<GenerationStage, number> = {
  queued: 5,
  script: 20,
  assembling: 55,
  uploading: 85,
  done: 100,
  failed: 100,
};

function parseMetadata(raw: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Merge a progress patch into Video.metadata.generation and persist it.
 */
async function writeProgress(
  videoId: string,
  patch: Partial<GenerationProgress>,
  extraMeta?: Record<string, any>,
): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { metadata: true },
  });
  const meta = parseMetadata(video?.metadata ?? null);
  const prev: Partial<GenerationProgress> = meta.generation ?? {};
  meta.generation = {
    stage: 'queued',
    percent: 0,
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (extraMeta) Object.assign(meta, extraMeta);
  await prisma.video.update({
    where: { id: videoId },
    data: { metadata: JSON.stringify(meta) },
  });
}

export async function setStage(
  videoId: string,
  stage: GenerationStage,
  extra?: Partial<GenerationProgress>,
): Promise<void> {
  await writeProgress(videoId, { stage, percent: STAGE_PERCENT[stage], ...extra });
}

/**
 * Generate a script from the prompt with OpenAI, mirroring the original
 * inline pipeline. Falls back to the raw prompt if the API is unavailable so a
 * missing key degrades rather than hard-fails at this step.
 */
async function generateScript(
  input: GenerationInput,
): Promise<{ script: string; tokensUsed: number }> {
  if (!hasOpenAiKey()) return { script: input.prompt, tokensUsed: 0 };

  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: openAiApiKey() });

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content:
          `You are a professional video script writer and director. Create a detailed ` +
          `script for a ${input.duration}-second ${input.style} video. Include scene ` +
          `descriptions with timestamps, visual elements, suggested music, on-screen ` +
          `text, and transitions. Keep scenes concrete and filmable.`,
      },
      { role: 'user', content: input.prompt },
    ],
    max_tokens: 1500,
    temperature: 0.7,
  });

  return {
    script: response.choices[0]?.message?.content?.trim() || input.prompt,
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}

/**
 * Run the full generation job for an already-created Video row.
 * Throws on failure (after marking the row FAILED) so the queue can record it.
 */
export async function runGeneration(videoId: string, input: GenerationInput): Promise<string> {
  // Owner is needed for branding, user media AND the cost ledger — fetch once.
  const owner = await prisma.video.findUnique({
    where: { id: videoId },
    select: { userId: true },
  });
  let scriptTokens = 0;
  let ledgerScenes: ResolvedScene[] = [];

  const settle = async (succeeded: boolean, prompt: string) => {
    if (!owner) return;
    const narrationChars = ledgerScenes.reduce((n, s) => n + s.description.length, 0);
    const renderSeconds = ledgerScenes.reduce((n, s) => n + s.duration, 0);
    await recordGenerationCost({
      userId: owner.userId,
      videoId,
      prompt,
      succeeded,
      breakdown: estimateGenerationCost({
        gptTokens: scriptTokens,
        // TTS synthesizes the narration; Whisper transcribes roughly its length.
        ttsChars: narrationChars,
        whisperSeconds: renderSeconds,
        renderSeconds,
      }),
    });
  };

  try {
    // The row is created QUEUED; it becomes PROCESSING once work actually starts.
    await prisma.video
      .update({ where: { id: videoId }, data: { status: 'PROCESSING' } })
      .catch(() => {});
    await setStage(videoId, 'script');
    const { script, tokensUsed } = await generateScript(input);
    scriptTokens = tokensUsed;

    await setStage(videoId, 'assembling');
    // Handles scene decomposition, stock footage matching, voiceover, FFmpeg
    // assembly, and Cloudinary upload — and returns the scene structure so we
    // can persist it for scene-based editing / re-rendering.
    const aspectRatio: AspectRatio = input.aspectRatio ?? '16:9';
    const branding = await brandingForVideo(videoId);
    // The user's own recording (natural voice) replaces AI TTS when present.
    const narrationPath = await audioAssetForVideo(videoId, input.narrationAssetId);
    // Their own music track beats the (possibly empty) bundled library.
    const musicOverride = await audioAssetForVideo(videoId, input.musicAssetId);
    const { videoUrl, scenes, cues, thumbnailUrl } = await generateVideoWithScenes({
      prompt: script,
      style: input.style,
      duration: input.duration,
      addOns: input.addOns ?? [],
      aspectRatio,
      mood: input.style,
      voiceId: input.voiceId,
      language: input.language,
      branding,
      transition: input.transition,
      // The platform's memory: never serve footage this user already rejected.
      excludeClipUrls: owner ? [...(await rejectedClipUrls(owner.userId))] : [],
      voiceoverPath: narrationPath,
      musicPath: musicOverride,
      mediaOnly: input.mediaOnly,
      captionPreset: input.captionPreset,
      pip: await (async () => {
        const url = await pipUrlForVideo(videoId, input.pip?.assetId);
        return url
          ? { url, position: input.pip?.position, widthFraction: input.pip?.size }
          : null;
      })(),
      lowerThird: input.lowerThird ?? null,
      presetScenes: input.presetScenes,
      hookNarration: input.hookNarration,
      hookSearchQuery: input.hookSearchQuery,
      ctaNarration: input.ctaNarration,
      userMedia: await userMediaForVideo(videoId, input.mediaAssetIds),
      renderQuality: input.renderQuality,
    });
    ledgerScenes = scenes;

    await setStage(videoId, 'uploading');

    const { width, height } = renderDims(aspectRatio, input.renderQuality ?? 'full');
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'COMPLETED',
        url: videoUrl,
        fileUrl: videoUrl,
        resolution: `${width}x${height}`,
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      },
    });
    // Persist scenes alongside the script so the editor can load, swap, and
    // re-render individual scenes without re-deriving them from the prompt.
    await writeProgress(
      videoId,
      { stage: 'done', percent: 100, videoUrl, provider: 'stock-assembler' },
      // captions are persisted so they can be downloaded as SRT/VTT.
      { script, scenes, captions: cues },
    );

    await settle(true, input.prompt);
    notifyRenderComplete(videoId).catch(() => {});
    return videoUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed';
    // Mark the row FAILED and surface the reason — never silently substitute a
    // placeholder video (see TODO Phase 8).
    await prisma.video
      .update({ where: { id: videoId }, data: { status: 'FAILED' } })
      .catch(() => {});
    await writeProgress(videoId, { stage: 'failed', error: message }).catch(() => {});
    // Give the quota slot back — a failed render must not consume a paid credit.
    await refundGenerationUsage(videoId).catch(() => {});
    await settle(false, input.prompt).catch(() => {});
    throw error;
  }
}

/** Read the persisted scene list for a video (empty if none yet). */
export async function loadScenes(videoId: string): Promise<ResolvedScene[]> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { metadata: true },
  });
  const meta = parseMetadata(video?.metadata ?? null);
  return Array.isArray(meta.scenes) ? (meta.scenes as ResolvedScene[]) : [];
}

/** Replace the persisted scene list, leaving the rest of metadata intact. */
export async function saveScenes(videoId: string, scenes: ResolvedScene[]): Promise<void> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { metadata: true },
  });
  const meta = parseMetadata(video?.metadata ?? null);
  meta.scenes = scenes;
  await prisma.video.update({
    where: { id: videoId },
    data: { metadata: JSON.stringify(meta) },
  });
}

/**
 * Re-assemble a video from its already-persisted (and possibly edited) scenes.
 * Skips planning and footage matching entirely.
 */
export async function rerenderVideo(videoId: string): Promise<string> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { metadata: true },
  });
  const meta = parseMetadata(video?.metadata ?? null);
  const scenes = Array.isArray(meta.scenes) ? (meta.scenes as ResolvedScene[]) : [];
  if (scenes.length === 0) {
    throw new Error('This video has no persisted scenes to re-render');
  }
  const addOns: string[] = Array.isArray(meta.request?.addOns) ? meta.request.addOns : [];
  // Reuse the ratio the video was generated with, or a re-render would silently
  // turn a vertical video landscape.
  const aspectRatio: AspectRatio = meta.request?.aspectRatio ?? '16:9';

  try {
    await prisma.video.update({ where: { id: videoId }, data: { status: 'PROCESSING' } });
    await setStage(videoId, 'assembling');

    // Keep the soundtrack on a re-render too: the user's own track first.
    const wantMusic = addOns.length === 0 || addOns.includes('music');
    const musicPath = wantMusic
      ? (await audioAssetForVideo(videoId, meta.request?.musicAssetId)) ??
        selectMusicPath(meta.request?.style)
      : null;

    // A re-render re-synthesizes the voiceover, so previously-transcribed cues
    // would no longer be aligned; only reuse them when the scenes are unchanged.
    // Re-resolve branding: the user's plan may have changed since generation.
    const branding = await brandingForVideo(videoId);

    const renderQuality: import('./video-generator').RenderQuality =
      meta.request?.renderQuality === 'draft' || meta.request?.renderQuality === '4k'
        ? meta.request.renderQuality
        : 'full';
    // Re-render keeps the caption look the video was generated with.
    const captionPreset = isCaptionPreset(meta.request?.captionPreset)
      ? meta.request.captionPreset
      : null;
    const assembled = await assembleVideo(scenes, addOns, aspectRatio, {
      musicPath,
      voiceId: meta.request?.voiceId,
      voiceoverPath: await audioAssetForVideo(videoId, meta.request?.narrationAssetId),
      lowerThird: meta.request?.lowerThird ?? null,
      branding,
      // Re-render must reuse the same transition, or the output changes shape.
      transition: transitionFromMetadata(meta.request?.transition),
      renderQuality,
      // Same presenter overlay the video was generated with (re-ownership-checked).
      pip: await (async () => {
        const url = await pipUrlForVideo(videoId, meta.request?.pip?.assetId);
        return url
          ? {
              url,
              position: meta.request?.pip?.position,
              widthFraction: meta.request?.pip?.size,
            }
          : null;
      })(),
      ...(captionPreset
        ? {
            captionStyle: CAPTION_PRESETS[captionPreset],
            captionAnimation: captionPreset === 'karaoke' ? ('karaoke' as const) : null,
          }
        : {}),
    });
    const { videoUrl, cues, thumbnailUrl } = assembled;

    await setStage(videoId, 'uploading');
    const { width, height } = renderDims(aspectRatio, renderQuality);
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'COMPLETED',
        url: videoUrl,
        fileUrl: videoUrl,
        resolution: `${width}x${height}`,
        ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
      },
    });
    // Persist the scenes as rendered: narration pacing may have re-timed them
    // and each now carries a poster frame. Otherwise the editor drifts.
    await saveScenes(videoId, assembled.scenes);
    await writeProgress(
      videoId,
      { stage: 'done', percent: 100, videoUrl, provider: 'stock-assembler' },
      { captions: cues },
    );

    return videoUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Re-render failed';
    await prisma.video
      .update({ where: { id: videoId }, data: { status: 'FAILED' } })
      .catch(() => {});
    await writeProgress(videoId, { stage: 'failed', error: message }).catch(() => {});
    throw error;
  }
}
