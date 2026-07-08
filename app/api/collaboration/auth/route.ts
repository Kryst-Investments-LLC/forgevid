import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateSecureToken } from '@/lib/encryption';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = generateSecureToken(32);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error('Collaboration auth error:', error);
    return NextResponse.json({ error: 'Failed to generate collaboration token' }, { status: 500 });
  }
}
