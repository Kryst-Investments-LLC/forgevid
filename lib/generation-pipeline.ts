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
import { assembleVideo, generateVideoWithScenes } from './video-generator';
import type { ResolvedScene } from './video-generator';

export interface GenerationInput {
  prompt: string;
  style: string;
  duration: number;
  addOns?: string[];
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
async function generateScript(input: GenerationInput): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return input.prompt;

  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  return response.choices[0]?.message?.content?.trim() || input.prompt;
}

/**
 * Run the full generation job for an already-created Video row.
 * Throws on failure (after marking the row FAILED) so the queue can record it.
 */
export async function runGeneration(videoId: string, input: GenerationInput): Promise<string> {
  try {
    await setStage(videoId, 'script');
    const script = await generateScript(input);

    await setStage(videoId, 'assembling');
    // Handles scene decomposition, stock footage matching, voiceover, FFmpeg
    // assembly, and Cloudinary upload — and returns the scene structure so we
    // can persist it for scene-based editing / re-rendering.
    const { videoUrl, scenes } = await generateVideoWithScenes({
      prompt: script,
      style: input.style,
      duration: input.duration,
      addOns: input.addOns ?? [],
    });

    await setStage(videoId, 'uploading');

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'COMPLETED',
        url: videoUrl,
        fileUrl: videoUrl,
      },
    });
    // Persist scenes alongside the script so the editor can load, swap, and
    // re-render individual scenes without re-deriving them from the prompt.
    await writeProgress(
      videoId,
      { stage: 'done', percent: 100, videoUrl, provider: 'stock-assembler' },
      { script, scenes },
    );

    return videoUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed';
    // Mark the row FAILED and surface the reason — never silently substitute a
    // placeholder video (see TODO Phase 8).
    await prisma.video
      .update({ where: { id: videoId }, data: { status: 'FAILED' } })
      .catch(() => {});
    await writeProgress(videoId, { stage: 'failed', error: message }).catch(() => {});
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

  try {
    await prisma.video.update({ where: { id: videoId }, data: { status: 'PROCESSING' } });
    await setStage(videoId, 'assembling');

    const videoUrl = await assembleVideo(scenes, addOns);

    await setStage(videoId, 'uploading');
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'COMPLETED', url: videoUrl, fileUrl: videoUrl },
    });
    await writeProgress(videoId, {
      stage: 'done',
      percent: 100,
      videoUrl,
      provider: 'stock-assembler',
    });

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
