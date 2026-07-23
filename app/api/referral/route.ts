import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrCreateReferralCode, REFERRAL_REWARD_CENTS } from '@/lib/referral'

export const runtime = 'nodejs'

function maskEmail(email?: string | null): string {
  if (!email) return 'a new user'
  const [local, domain] = email.split('@')
  if (!domain) return email
  const shown = local.slice(0, 1)
  return `${shown}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const userId = session.user.id

  const code = await getOrCreateReferralCode(userId)

  const signups = await prisma.referralSignup.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: 'desc' },
  })

  // Lazy conversion: mark any not-yet-converted referral whose referred user now
  // has an active subscription, and credit the reward. Reconciled here so we
  // don't have to touch the Stripe webhook.
  const unconverted = signups.filter((s) => !s.converted)
  if (unconverted.length > 0) {
    const converted = await prisma.subscription.findMany({
      where: { userId: { in: unconverted.map((s) => s.referredUserId) }, status: 'ACTIVE' },
      select: { userId: true },
    })
    const convertedIds = new Set(converted.map((c) => c.userId))
    const toUpdate = unconverted.filter((s) => convertedIds.has(s.referredUserId))
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((s) =>
          prisma.referralSignup.update({
            where: { id: s.id },
            data: { converted: true, rewardCents: REFERRAL_REWARD_CENTS },
          }),
        ),
      )
      for (const s of toUpdate) {
        s.converted = true
        s.rewardCents = REFERRAL_REWARD_CENTS
      }
    }
  }

  // Join referred user emails (masked) for display.
  const users = await prisma.user.findMany({
    where: { id: { in: signups.map((s) => s.referredUserId) } },
    select: { id: true, email: true },
  })
  const emailById = new Map(users.map((u) => [u.id, u.email]))

  const convertedCount = signups.filter((s) => s.converted).length
  const earningsCents = signups.reduce((sum, s) => sum + (s.rewardCents || 0), 0)
  const base = process.env.NEXTAUTH_URL || 'https://www.forgevid.com'

  return NextResponse.json({
    code,
    shareUrl: `${base}/auth/signup?ref=${code}`,
    rewardPerReferralCents: REFERRAL_REWARD_CENTS,
    stats: {
      referred: signups.length,
      converted: convertedCount,
      pending: signups.length - convertedCount,
      earningsCents,
    },
    signups: signups.map((s) => ({
      email: maskEmail(emailById.get(s.referredUserId)),
      converted: s.converted,
      rewardCents: s.rewardCents,
      createdAt: s.createdAt.toISOString(),
    })),
  })
}
