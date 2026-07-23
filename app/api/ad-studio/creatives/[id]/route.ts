import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// PATCH { isWinner?, roas?, notes? } — update a creative's performance (winners
// library + ROAS loop). Owner only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const creative = await prisma.adCreative.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  })
  if (!creative) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (creative.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: { isWinner?: boolean; roas?: number | null; notes?: string | null } = {}
  if (typeof body.isWinner === 'boolean') data.isWinner = body.isWinner
  if (body.roas === null) {
    data.roas = null
  } else if (body.roas !== undefined) {
    const r = Number(body.roas)
    if (!Number.isFinite(r) || r < 0 || r > 1000) {
      return NextResponse.json({ error: 'ROAS must be between 0 and 1000' }, { status: 400 })
    }
    data.roas = r
  }
  if (typeof body.notes === 'string') data.notes = body.notes.slice(0, 500)

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  const updated = await prisma.adCreative.update({
    where: { id: params.id },
    data,
    select: { id: true, isWinner: true, roas: true, notes: true },
  })

  return NextResponse.json({ creative: updated })
}
