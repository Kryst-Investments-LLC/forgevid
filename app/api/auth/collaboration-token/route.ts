import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { signCollaborationToken } from '@/lib/collaboration-token'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = signCollaborationToken({
    sub: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: session.user.role ?? null,
    organizationId: (session.user as any).organizationId ?? null,
  })

  return NextResponse.json(
    { token, expiresIn: '15m' },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  )
}
