import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeUserDefaults } from '@/lib/product-loop';

/**
 * GET /api/me/defaults — the platform's memory of how THIS user works.
 *
 * Learned from their own videos (most-used style/aspect/voice); the AI Studio
 * opens pre-set to it, so returning users start where they left off.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  return NextResponse.json(await computeUserDefaults(session.user.id));
}
