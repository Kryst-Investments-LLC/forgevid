import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { allowsVoiceCloning, getUserPlan } from '@/lib/plan';
import { cloneVoiceFromSample, isVoiceCloningConfigured } from '@/lib/cloned-voices';

/**
 * POST /api/voices/clone — clone a narration voice from the user's recording.
 *
 * multipart/form-data: `name` (string) + `file` (an audio sample, ~1-5 min of
 * clean speech works best). Pro plans only; 503 without an ElevenLabs key.
 * Fail-visibly: no fake voice ids, ever.
 */

const MAX_SAMPLE_BYTES = 25 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'video/webm',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const plan = await getUserPlan(session.user.id);
  if (!allowsVoiceCloning(plan)) {
    return NextResponse.json(
      { error: `Voice cloning requires the Pro plan (you are on ${plan})`, upgradeRequired: true },
      { status: 403 },
    );
  }

  if (!isVoiceCloningConfigured()) {
    return NextResponse.json(
      { error: 'Voice cloning is unavailable (ELEVENLABS_API_KEY is not configured)' },
      { status: 503 },
    );
  }

  let name = '';
  let file: File | null = null;
  try {
    const form = await req.formData();
    name = String(form.get('name') ?? '').trim();
    const value = form.get('file');
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  if (!name || name.length > 80) {
    return NextResponse.json({ error: 'A voice name (max 80 chars) is required' }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: 'No audio sample provided' }, { status: 400 });
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${file.type || 'unknown'}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_SAMPLE_BYTES) {
    return NextResponse.json({ error: 'Sample must be 25MB or smaller' }, { status: 413 });
  }

  try {
    const voice = await cloneVoiceFromSample({
      userId: session.user.id,
      name,
      sample: Buffer.from(await file.arrayBuffer()),
      sampleFilename: file.name || 'sample.mp3',
      sampleMimeType: file.type,
    });
    return NextResponse.json({ voice });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Voice cloning failed';
    console.error('[voices/clone]', message);
    // Surface the provider's failure honestly (minus anything sensitive).
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
