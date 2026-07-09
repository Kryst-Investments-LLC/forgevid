import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { allowsAvatars, getUserPlan } from '@/lib/plan';
import { isAvatarProviderConfigured, listAvatars } from '@/lib/avatar-provider';

/**
 * GET /api/avatars — the avatars available for avatar-video generation.
 * Pro plans only; 503 when no provider key is configured.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const plan = await getUserPlan(session.user.id);
  if (!allowsAvatars(plan)) {
    return NextResponse.json(
      { error: `Avatar videos require the Pro plan (you are on ${plan})`, upgradeRequired: true },
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
    return NextResponse.json({ avatars: await listAvatars() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not list avatars';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
