import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DEFAULT_VOICE_ID, VOICES } from '@/lib/voice-catalog';
import { listClonedVoices } from '@/lib/cloned-voices';
import { allowsVoiceCloning, getUserPlan } from '@/lib/plan';

/**
 * GET /api/voices — narration voices available for generation.
 *
 * The static catalog needs no ElevenLabs call, so the picker populates even
 * before a key is configured. The user's own cloned voices are appended, with
 * `cloned: true` so the UI can group them.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const [cloned, plan] = await Promise.all([
    listClonedVoices(session.user.id).catch(() => []),
    getUserPlan(session.user.id),
  ]);

  return NextResponse.json({
    voices: [
      ...VOICES,
      ...cloned.map((v) => ({
        id: v.providerVoiceId,
        name: `${v.name} (your voice)`,
        gender: 'cloned',
        accent: '',
        description: 'Cloned from your recording',
        cloned: true,
      })),
    ],
    defaultVoiceId: DEFAULT_VOICE_ID,
    // Voiceover silently no-ops without a key; tell the client so it can say so.
    enabled: Boolean(process.env.ELEVENLABS_API_KEY),
    canCloneVoices: allowsVoiceCloning(plan),
  });
}
