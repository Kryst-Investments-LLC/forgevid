import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasOpenAiKey } from '@/lib/openai-key';
import { enqueueGeneration } from '@/lib/video-queue';
import { runGeneration } from '@/lib/generation-pipeline';
import { DEFAULT_TRANSITION } from '@/lib/transitions';
import { resolveVoiceId } from '@/lib/voice-catalog';
import { checkGenerationQuota, recordGenerationUsage } from '@/lib/quota';
import { withRenderSlot } from '@/lib/render-semaphore';
import {
  VOICE_STYLE_MAP,
  promptFromTranscript,
  transcribeVoiceRecording,
} from '@/features/voice-to-video-ai';

/**
 * POST /api/voice-to-video — speak a brief, get a video.
 *
 * Transcribes the recording with Whisper, then hands the transcript to the same
 * async generation pipeline the AI Studio uses. Returns immediately with a
 * videoId; poll GET /api/ai/jobs/[videoId] for progress.
 *
 * Previously this fabricated a transcript and rendered synchronously through
 * Replicate's Zeroscope.
 */

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper's own upload limit

const bodySchema = z.object({
  audio: z.string().min(1),
  options: z
    .object({
      duration: z.number().int().min(5).max(600).optional(),
      videoStyle: z.string().optional(),
      language: z.string().max(16).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!hasOpenAiKey()) {
    return NextResponse.json(
      { error: 'Transcription is unavailable (OPENAI_API_KEY is not configured)' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const audio = Buffer.from(parsed.data.audio, 'base64');
  if (audio.length === 0) {
    return NextResponse.json({ error: 'Audio is empty' }, { status: 400 });
  }
  if (audio.length > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Recording must be 25MB or smaller' }, { status: 413 });
  }

  const opts = parsed.data.options ?? {};
  const style: 'professional' | 'casual' | 'dramatic' =
    opts.videoStyle === 'energetic'
      ? 'casual'
      : opts.videoStyle === 'cinematic'
        ? 'dramatic'
        : 'professional';
  const duration = opts.duration ?? 30;

  // Same budget as any other generation — voice input isn't a quota bypass.
  const quota = await checkGenerationQuota(session.user.id, duration);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: quota.reason,
        quota: { used: quota.used, limit: quota.limit, plan: quota.plan },
        upgradeRequired: quota.upgradeRequired ?? false,
      },
      { status: 429 },
    );
  }

  try {
    // Fail visibly: never invent a transcript.
    const transcript = await transcribeVoiceRecording(audio);
    if (!transcript) {
      return NextResponse.json(
        { error: 'Could not transcribe the recording. Try speaking a little longer.' },
        { status: 422 },
      );
    }

    const input = {
      prompt: promptFromTranscript(transcript, style),
      style: VOICE_STYLE_MAP[style],
      duration,
      addOns: [] as string[],
      aspectRatio: '16:9' as const,
    };

    const video = await prisma.video.create({
      data: {
        title: transcript.slice(0, 80),
        description: transcript,
        status: 'QUEUED',
        duration,
        format: 'mp4',
        userId: session.user.id,
        metadata: JSON.stringify({
          generation: { stage: 'queued', percent: 5, updatedAt: new Date().toISOString() },
          source: 'voice-to-video',
          transcript,
          request: {
            style: input.style,
            duration,
            addOns: [],
            aspectRatio: '16:9',
            voiceId: resolveVoiceId(undefined),
            transition: DEFAULT_TRANSITION,
          },
        }),
      },
      select: { id: true },
    });

    await recordGenerationUsage(session.user.id, video.id, duration);

    const jobId = await enqueueGeneration({ videoId: video.id, userId: session.user.id, input });
    if (!jobId) {
      void withRenderSlot(() => runGeneration(video.id, input)).catch((err) => {
        console.error('[voice-to-video] inline generation failed:', err?.message ?? err);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId: video.id,
        jobId: jobId ?? null,
        status: 'queued',
        transcript,
        language: opts.language ?? 'en',
        duration,
      },
      message: 'Transcribed. Generation started — poll /api/ai/jobs/{videoId}.',
    });
  } catch (error) {
    console.error('[voice-to-video] failed:', error);
    return NextResponse.json({ error: 'Failed to process voice-to-video' }, { status: 500 });
  }
}
