import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OpenAI } from 'openai';
import { prisma } from '@/lib/prisma';
import { lazyClient } from '@/lib/lazy-client';
import { hasOpenAiKey, openAiApiKey } from '@/lib/openai-key';
import { requireVideoOwner } from '@/lib/video-access';
import { loadScenes, saveScenes } from '@/lib/generation-pipeline';
import { isStockProviderConfigured, resolveSceneClip } from '@/lib/video-generator';
import type { AspectRatio } from '@/lib/video-generator';
import {
  SCENE_CHAT_SYSTEM_PROMPT,
  applySceneOps,
  describeScenesForModel,
  sceneOpsSchema,
} from '@/lib/scene-ops';
import { PRODUCT_ACTIONS, recordProductEvent } from '@/lib/product-loop';

/**
 * POST /api/videos/[videoId]/scenes/chat — "make scene 2 faster"
 *
 * The model only proposes operations from a closed set; they are validated and
 * applied by a pure function. It never touches the scene list directly, so an
 * invented scene id or field is rejected instead of persisted.
 *
 * Mutates the stored scenes only. Call POST /rerender to re-encode.
 */

const openai = lazyClient<OpenAI>(() => new OpenAI({ apiKey: openAiApiKey() }));

const bodySchema = z.object({ message: z.string().min(1).max(1000) });

export async function POST(req: NextRequest, { params }: { params: { videoId: string } }) {
  const access = await requireVideoOwner(params.videoId);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (!hasOpenAiKey()) {
    return NextResponse.json(
      { error: 'Chat editing is unavailable (OPENAI_API_KEY is not configured)' },
      { status: 503 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const scenes = await loadScenes(params.videoId);
  if (scenes.length === 0) {
    return NextResponse.json({ error: 'This video has no scenes to edit' }, { status: 422 });
  }

  // Ask for operations, not prose.
  let proposal;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0,
      messages: [
        { role: 'system', content: SCENE_CHAT_SYSTEM_PROMPT },
        { role: 'user', content: `Scenes:\n${describeScenesForModel(scenes)}\n\nRequest: ${parsed.data.message}` },
      ],
      max_tokens: 700,
    });
    proposal = JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch (error) {
    console.error('[scene-chat] model call failed:', error);
    return NextResponse.json({ error: 'Could not understand that request' }, { status: 502 });
  }

  // Anything the model invented dies here, not in the database.
  const validated = sceneOpsSchema.safeParse(proposal);
  if (!validated.success) {
    return NextResponse.json(
      { error: 'The assistant proposed an invalid edit', details: validated.error.issues },
      { status: 422 },
    );
  }

  const result = applySceneOps(scenes, validated.data.operations);

  // swap_clip needs a stock search, which applySceneOps deliberately can't do.
  const swapFailures: string[] = [];
  if (result.swapSceneIds.length > 0) {
    if (!isStockProviderConfigured()) {
      swapFailures.push('No stock footage provider configured (PEXELS_API_KEY)');
    } else {
      const video = await prisma.video.findUnique({
        where: { id: params.videoId },
        select: { metadata: true },
      });
      let aspectRatio: AspectRatio = '16:9';
      try {
        aspectRatio = JSON.parse(video?.metadata ?? '{}')?.request?.aspectRatio ?? '16:9';
      } catch {
        // keep the default
      }

      for (const sceneId of result.swapSceneIds) {
        const index = result.scenes.findIndex((s) => s.id === sceneId);
        if (index === -1) continue;
        const exclude = new Set(result.scenes.map((s) => s.clipUrl).filter(Boolean));
        const replacement = await resolveSceneClip(result.scenes[index], exclude, aspectRatio);
        if (replacement) result.scenes[index] = replacement;
        else swapFailures.push(`No alternative footage for ${sceneId}`);
      }
    }
  }

  if (result.applied.length > 0) {
    await saveScenes(params.videoId, result.scenes);
    await recordProductEvent(access.userId, PRODUCT_ACTIONS.chatEdit, {
      videoId: params.videoId,
      operations: result.applied.length,
    });
  }

  return NextResponse.json({
    reply: validated.data.reply || 'Done.',
    applied: result.applied,
    // Be honest about what was ignored rather than pretending it all worked.
    skipped: [
      ...result.skipped.map((s) => ({ op: s.op, reason: s.reason })),
      ...swapFailures.map((reason) => ({ op: null, reason })),
    ],
    scenes: result.scenes,
    rerenderRequired: result.applied.length > 0,
  });
}
