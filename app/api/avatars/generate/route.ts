import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { allowsAvatars } from '@/lib/plan';
import { checkGenerationQuota, recordGenerationUsage } from '@/lib/quota';
import { estimateGenerationCost, recordGenerationCost } from '@/lib/cost-ledger';
import { setStage } from '@/lib/generation-pipeline';
import {
  createAvatarVideo,
  getAvatarVideoStatus,
  isAvatarProviderConfigured,
} from '@/lib/avatar-provider';

/**
 * POST /api/avatars/generate — an AI presenter reads your script.
 *
 * Same contract as every other generation: returns a videoId immediately, poll
 * GET /api/ai/jobs/[videoId]. The render happens on the provider's
 * infrastructure; we poll until the video URL exists. Pro plans only; counts
 * against the same monthly quota as normal generations.
 */

const bodySchema = z.object({
  script: z.string().min(5).max(5000),
  avatarId: z.string().min(1).max(100),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  /** Estimated output length, for quota/cost purposes. */
  duration: z.number().int().min(5).max(600).default(60),
});

const POLL_INTERVAL_MS = 5000;
const POLL_DEADLINE_MS = 15 * 60 * 1000;

async function pollUntilDone(videoId: string, providerVideoId: string, userId: string, script: string, duration: number) {
  const deadline = Date.now() + POLL_DEADLINE_MS;
  try {
    await prisma.video.update({ where: { id: videoId }, data: { status: 'PROCESSING' } });
    await setStage(videoId, 'assembling');

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const status = await getAvatarVideoStatus(providerVideoId);

      if (status.status === 'completed' && status.videoUrl) {
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'COMPLETED', url: status.videoUrl, fileUrl: status.videoUrl },
        });
        await setStage(videoId, 'done', { videoUrl: status.videoUrl, provider: 'heygen' });
        await recordGenerationCost({
          userId,
          videoId,
          prompt: script,
          succeeded: true,
          breakdown: estimateGenerationCost({ avatarSeconds: duration }),
        });
        return;
      }
      if (status.status === 'failed') {
        throw new Error(status.error ?? 'Avatar render failed');
      }
    }
    throw new Error('Avatar render timed out after 15 minutes');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Avatar render failed';
    await prisma.video
      .update({ where: { id: videoId }, data: { status: 'FAILED' } })
      .catch(() => {});
    await setStage(videoId, 'failed', { error: message }).catch(() => {});
    await recordGenerationCost({
      userId,
      videoId,
      prompt: script,
      succeeded: false,
      breakdown: estimateGenerationCost({}),
    }).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  const userId = session.user.id;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Avatar renders share the monthly generation quota — provider minutes are
  // the most expensive thing the platform buys.
  const quota = await checkGenerationQuota(userId, input.duration);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason, upgradeRequired: quota.upgradeRequired ?? false },
      { status: 429 },
    );
  }
  if (!allowsAvatars(quota.plan)) {
    return NextResponse.json(
      { error: `Avatar videos require the Pro plan (you are on ${quota.plan})`, upgradeRequired: true },
      { status: 403 },
    );
  }
  if (!isAvatarProviderConfigured()) {
    return NextResponse.json(
      { error: 'Avatar generation is unavailable (HEYGEN_API_KEY is not configured)' },
      { status: 503 },
    );
  }

  try {
    const providerVideoId = await createAvatarVideo({
      script: input.script,
      avatarId: input.avatarId,
      aspectRatio: input.aspectRatio,
    });

    const video = await prisma.video.create({
      data: {
        title: input.script.slice(0, 80),
        description: input.script,
        status: 'QUEUED',
        duration: input.duration,
        format: 'mp4',
        userId,
        metadata: JSON.stringify({
          generation: { stage: 'queued', percent: 5, updatedAt: new Date().toISOString() },
          source: 'avatar',
          provider: { name: 'heygen', videoId: providerVideoId, avatarId: input.avatarId },
          request: { aspectRatio: input.aspectRatio, duration: input.duration },
        }),
      },
      select: { id: true },
    });

    await recordGenerationUsage(userId, video.id, input.duration);

    // Polling is lightweight (no local ffmpeg), so no render slot needed.
    void pollUntilDone(video.id, providerVideoId, userId, input.script, input.duration);

    return NextResponse.json({
      success: true,
      data: { videoId: video.id, status: 'queued', provider: 'heygen' },
      message: 'Avatar render started. Poll /api/ai/jobs/{videoId} for progress.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Avatar render failed to start';
    console.error('[avatars/generate]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
