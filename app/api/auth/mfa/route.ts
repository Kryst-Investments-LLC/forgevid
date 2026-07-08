import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateBackupCodes, generateMfaSecret, verifyMfaToken } from '@/lib/mfa'
import bcrypt from 'bcryptjs'

type StepUpUser = {
  mfaEnabled: boolean
  mfaSecret: string | null
  password?: string | null
  metadata?: string | null
}

function parseMetadata(metadata: string | null | undefined): Record<string, unknown> {
  if (!metadata) {
    return {}
  }

  try {
    const parsed = JSON.parse(metadata)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function buildMetadataUpdate(metadata: string | null | undefined, transform: (value: Record<string, unknown>) => void) {
  const nextMetadata = parseMetadata(metadata)
  transform(nextMetadata)
  return JSON.stringify(nextMetadata)
}

async function hasStepUpAuthorization(user: StepUpUser, body: { token?: unknown; password?: unknown } | null) {
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (token && user.mfaSecret) {
    return verifyMfaToken(user.mfaSecret, token)
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  if (password && user.password) {
    return bcrypt.compare(password, user.password)
  }

  return false
}

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfaEnabled: true,
      mfaSecret: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    mfaEnabled: user.mfaEnabled,
    hasSecret: Boolean(user.mfaSecret),
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfaEnabled: true,
      mfaSecret: true,
      password: true,
      metadata: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (user.mfaEnabled && !(await hasStepUpAuthorization(user, body))) {
    return NextResponse.json(
      { error: 'Current password or authenticator code required to reset MFA' },
      { status: 403 }
    )
  }

  const { secret, otpauthUrl } = generateMfaSecret(session.user.email)

  const updateData: {
    mfaSecret: string
    mfaEnabled: boolean
    metadata?: string
  } = {
    mfaSecret: secret,
    mfaEnabled: false,
  }

  if (user.metadata || user.mfaEnabled || user.mfaSecret) {
    updateData.metadata = buildMetadataUpdate(user.metadata, (metadata) => {
      delete metadata.mfaBackupCodes
    })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  return NextResponse.json(
    { secret, otpauthUrl },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const token = body?.token

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfaSecret: true,
      metadata: true,
    },
  })

  if (!user?.mfaSecret) {
    return NextResponse.json({ error: 'MFA secret not initialized' }, { status: 400 })
  }

  const isValid = verifyMfaToken(user.mfaSecret, token)

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid MFA code' }, { status: 400 })
  }

  const backupCodes = generateBackupCodes()

  // Hash backup codes before storing
  const hashedCodes = await Promise.all(
    backupCodes.map((code: string) => bcrypt.hash(code, 10))
  )

  // Store hashed backup codes in user metadata
  const metadata = buildMetadataUpdate(user.metadata, (value) => {
    value.mfaBackupCodes = hashedCodes
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      metadata,
    },
  })

  return NextResponse.json(
    { success: true, backupCodes },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      mfaEnabled: true,
      mfaSecret: true,
      password: true,
      metadata: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!(await hasStepUpAuthorization(user, body))) {
    return NextResponse.json(
      { error: 'Current password or authenticator code required to disable MFA' },
      { status: 403 }
    )
  }

  const updateData: {
    mfaEnabled: boolean
    mfaSecret: null
    metadata?: string
  } = {
    mfaEnabled: false,
    mfaSecret: null,
  }

  if (user.metadata || user.mfaEnabled || user.mfaSecret) {
    updateData.metadata = buildMetadataUpdate(user.metadata, (metadata) => {
      delete metadata.mfaBackupCodes
    })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })

  return NextResponse.json({ success: true })
}

