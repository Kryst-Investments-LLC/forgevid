import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { DEFAULT_VOICE_ID, isKnownVoice } from '@/lib/voice-catalog';
import { listClonedVoices } from '@/lib/cloned-voices';
import { elevenLabsSynth, sceneCacheKey } from '@/lib/voiceover';

/**
 * GET /api/voices/preview?id=<voiceId> — hear a voice before choosing it.
 *
 * Synthesizes one fixed sample line and caches the mp3 by (line | voice |
 * model), so each voice costs ElevenLabs credits exactly once, ever. Only
 * catalog voices and the caller's OWN cloned voices are allowed — this must
 * not be an open proxy to arbitrary ElevenLabs voice ids.
 *
 * Fail-visibly: no ELEVENLABS_API_KEY => 503, never silence or a fake clip.
 */

export const dynamic = 'force-dynamic';

const PREVIEW_LINE =
  "Hi! This is how your video's narration will sound. Pick me and let's make something great.";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const voiceId = new URL(req.url).searchParams.get('id') || DEFAULT_VOICE_ID;

  if (!isKnownVoice(voiceId)) {
    const own = await listClonedVoices(session.user.id);
    if (!own.some((v) => v.providerVoiceId === voiceId)) {
      return NextResponse.json({ error: 'Unknown voice' }, { status: 400 });
    }
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: 'Voice preview is not configured (ELEVENLABS_API_KEY missing)' },
      { status: 503 },
    );
  }

  try {
    // Same content-addressed cache the renderer uses (.cache/tts).
    const dir = path.join(process.cwd(), '.cache', 'tts');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${sceneCacheKey(PREVIEW_LINE, voiceId)}.mp3`);

    let bytes: Buffer;
    if (fs.existsSync(file) && fs.statSync(file).size > 0) {
      bytes = fs.readFileSync(file);
    } else {
      const audio = await elevenLabsSynth(PREVIEW_LINE, voiceId);
      if (!audio || audio.length === 0) {
        return NextResponse.json({ error: 'Voice synthesis failed' }, { status: 502 });
      }
      fs.writeFileSync(file, audio);
      bytes = audio;
    }

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'audio/mpeg',
        // The sample never changes for a voice — let the browser keep it.
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[voices/preview] failed:', error);
    return NextResponse.json({ error: 'Voice preview failed' }, { status: 500 });
  }
}
