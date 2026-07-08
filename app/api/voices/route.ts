import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DEFAULT_VOICE_ID, VOICES } from '@/lib/voice-catalog';

/**
 * GET /api/voices — narration voices available for generation.
 *
 * Static catalog: no ElevenLabs call, so it works (and the UI populates) even
 * before a key is configured.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  return NextResponse.json({
    voices: VOICES,
    defaultVoiceId: DEFAULT_VOICE_ID,
    // Voiceover silently no-ops without a key; tell the client so it can say so.
    enabled: Boolean(process.env.ELEVENLABS_API_KEY),
  });
}
