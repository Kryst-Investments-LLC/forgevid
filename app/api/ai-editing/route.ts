import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireVideoOwner } from '@/lib/video-access';
import { securityConfigs } from '@/lib/api-security';
import {
  analyzeVideo,
  generateAutoEditSuggestions,
  type VideoContext,
} from '@/features/ai-editing-ai';

async function loadVideoContext(videoId: string): Promise<VideoContext | null> {
  return prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, title: true, description: true, duration: true, transcript: true, status: true },
  });
}

/**
 * Real AI review of one of the caller's own videos. No `videoUrl` — a bare URL
 * can't be tied to an owner and can't carry the real facts (transcript,
 * persisted scenes) the analysis is based on, so this takes `videoId` and
 * looks the video up server-side. There is no `edit` action: this route never
 * fabricates an edited file. Suggestions instead point at the real editor
 * (/dashboard/editor?videoId=) or a real re-render (POST
 * /api/videos/[videoId]/rerender), both driven from the client.
 */
async function handlePost(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action, videoId, prompt } = body ?? {};

  if (!action) {
    return NextResponse.json({ error: 'Action is required' }, { status: 400 });
  }
  if (!videoId || typeof videoId !== 'string') {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const access = await requireVideoOwner(videoId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const video = await loadVideoContext(videoId);
  if (!video) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    switch (action) {
      case 'analyze': {
        const analysis = await analyzeVideo(video);
        return NextResponse.json({ success: true, data: analysis });
      }

      case 'suggest': {
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
          return NextResponse.json({ error: 'A prompt is required' }, { status: 400 });
        }
        const suggestions = await generateAutoEditSuggestions(video, prompt);
        return NextResponse.json({ success: true, data: { suggestions } });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[AI Editing] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI editing operation failed' },
      { status: 500 },
    );
  }
}

export const POST = securityConfigs.authenticated(handlePost);
