import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// Review comments: readable/postable by the video owner, or by anyone with the
// public share link (metadata.shareEnabled). Public reviewers supply a name.
async function loadAccess(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, userId: true, metadata: true },
  })
  if (!video) return null
  let shareEnabled = false
  try {
    shareEnabled = JSON.parse(video.metadata ?? '{}')?.shareEnabled === true
  } catch {
    shareEnabled = false
  }
  return { video, shareEnabled }
}

export async function GET(_req: NextRequest, props: { params: Promise<{ videoId: string }> }) {
  const params = await props.params;
  const access = await loadAccess(params.videoId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getServerSession(authOptions)
  const isOwner = !!session?.user?.id && session.user.id === access.video.userId
  if (!isOwner && !access.shareEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const comments = await prisma.videoComment.findMany({
    where: { videoId: params.videoId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      body: c.body,
      timestampSec: c.timestampSec,
      createdAt: c.createdAt.toISOString(),
      isOwner: !!c.authorUserId && c.authorUserId === access.video.userId,
    })),
    canModerate: isOwner,
    viewerName: isOwner ? session?.user?.name ?? 'You' : null,
  })
}

export async function POST(req: NextRequest, props: { params: Promise<{ videoId: string }> }) {
  const params = await props.params;
  const access = await loadAccess(params.videoId)
  if (!access) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const session = await getServerSession(authOptions)
  const isOwner = !!session?.user?.id && session.user.id === access.video.userId
  if (!isOwner && !access.shareEnabled) {
    return NextResponse.json({ error: 'Commenting is not available for this video' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (text.length < 1 || text.length > 2000) {
    return NextResponse.json({ error: 'Comment must be between 1 and 2000 characters' }, { status: 400 })
  }

  let authorName: string
  let authorUserId: string | null = null
  if (isOwner) {
    authorName = session?.user?.name || 'Owner'
    authorUserId = session!.user!.id
  } else {
    const provided = typeof body.authorName === 'string' ? body.authorName.trim() : ''
    if (provided.length < 1 || provided.length > 60) {
      return NextResponse.json({ error: 'Please enter your name (1–60 characters)' }, { status: 400 })
    }
    authorName = provided
  }

  let timestampSec: number | null = null
  if (body.timestampSec != null) {
    const t = Number(body.timestampSec)
    if (Number.isFinite(t) && t >= 0 && t < 100000) timestampSec = Math.floor(t)
  }

  const created = await prisma.videoComment.create({
    data: { videoId: params.videoId, authorUserId, authorName, body: text, timestampSec },
  })

  return NextResponse.json({
    comment: {
      id: created.id,
      authorName: created.authorName,
      body: created.body,
      timestampSec: created.timestampSec,
      createdAt: created.createdAt.toISOString(),
      isOwner,
    },
  })
}
