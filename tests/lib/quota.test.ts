/**
 * lib/quota.ts unit tests — no database. Prisma / lib/plan / lib/credits are
 * all mocked, following the pattern in tests/api/ai.test.ts
 * (jest.mock('@/lib/prisma', ...)).
 *
 * The behavior under test is the two-pool fallback added for the 2026-07
 * credit-system relaunch: once the monthly UsageRecord allowance is
 * exhausted, checkGenerationQuota must consult the purchased-credit balance
 * before denying, and the resulting verdict must carry usePurchasedCredit /
 * topUpAvailable correctly for the caller (app/api/ai/route.ts) to act on.
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
// NOTE: `jest` itself is intentionally the ambient global here, not imported
// from '@jest/globals' — with this repo's next/jest (SWC) transform, importing
// it breaks jest.mock() hoisting and the mock silently never applies.

jest.mock('@/lib/prisma', () => ({
  prisma: {
    usageRecord: {
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/plan', () => ({
  getUserPlan: jest.fn(),
}))

jest.mock('@/lib/credits', () => ({
  getCreditBalance: jest.fn(),
  consumeCredit: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getUserPlan } from '@/lib/plan'
import { getCreditBalance, consumeCredit } from '@/lib/credits'
import {
  checkGenerationQuota,
  settleGenerationEntitlement,
  PLAN_QUOTAS,
  PURCHASED_CREDIT_MIN_DURATION_SECONDS,
  type QuotaVerdict,
} from '@/lib/quota'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockGetUserPlan = getUserPlan as jest.Mock
const mockGetCreditBalance = getCreditBalance as jest.Mock
const mockConsumeCredit = consumeCredit as jest.Mock

describe('checkGenerationQuota', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('allows a generation within the plan duration cap and monthly allowance', async () => {
    mockGetUserPlan.mockResolvedValue('free')
    mockPrisma.usageRecord.count.mockResolvedValue(0)

    const verdict = await checkGenerationQuota('user-1', 30)

    expect(verdict.allowed).toBe(true)
    expect(verdict.usePurchasedCredit).toBeUndefined()
    expect(mockGetCreditBalance).not.toHaveBeenCalled()
  })

  it('denies outright when duration exceeds the plan cap, without ever consulting credits', async () => {
    mockGetUserPlan.mockResolvedValue('free')

    const verdict = await checkGenerationQuota('user-1', PLAN_QUOTAS.free.maxDurationSeconds + 1)

    expect(verdict.allowed).toBe(false)
    expect(mockGetCreditBalance).not.toHaveBeenCalled()
    expect(mockPrisma.usageRecord.count).not.toHaveBeenCalled()
  })

  it('falls back to a purchased credit once the monthly limit is hit and balance > 0', async () => {
    mockGetUserPlan.mockResolvedValue('free')
    mockPrisma.usageRecord.count.mockResolvedValue(PLAN_QUOTAS.free.videosPerMonth)
    mockGetCreditBalance.mockResolvedValue(3)

    const verdict = await checkGenerationQuota('user-1', 30)

    expect(verdict.allowed).toBe(true)
    expect(verdict.usePurchasedCredit).toBe(true)
    // max(plan cap, 90) — free plan's cap (60) is below the purchased-credit floor.
    expect(verdict.maxDurationSeconds).toBe(PURCHASED_CREDIT_MIN_DURATION_SECONDS)
  })

  it('gives a pro-plan purchased-credit render its own (higher) cap when it beats 90s', async () => {
    mockGetUserPlan.mockResolvedValue('pro')
    mockPrisma.usageRecord.count.mockResolvedValue(PLAN_QUOTAS.pro.videosPerMonth)
    mockGetCreditBalance.mockResolvedValue(1)

    const verdict = await checkGenerationQuota('user-1', 100)

    expect(verdict.allowed).toBe(true)
    expect(verdict.usePurchasedCredit).toBe(true)
    expect(verdict.maxDurationSeconds).toBe(PLAN_QUOTAS.pro.maxDurationSeconds) // 120 > 90
  })

  it('denies with topUpAvailable when the monthly limit is hit and the balance is 0', async () => {
    mockGetUserPlan.mockResolvedValue('free')
    mockPrisma.usageRecord.count.mockResolvedValue(PLAN_QUOTAS.free.videosPerMonth)
    mockGetCreditBalance.mockResolvedValue(0)

    const verdict = await checkGenerationQuota('user-1', 30)

    expect(verdict.allowed).toBe(false)
    expect(verdict.usePurchasedCredit).toBeUndefined()
    expect(verdict.topUpAvailable).toBe(true)
    expect(verdict.reason).toMatch(/top-up/i)
  })

  it('fails CLOSED (denies, no credit fallback) when the usage lookup errors', async () => {
    mockGetUserPlan.mockResolvedValue('free')
    mockPrisma.usageRecord.count.mockRejectedValue(new Error('db unreachable'))

    const verdict = await checkGenerationQuota('user-1', 30)

    expect(verdict.allowed).toBe(false)
    expect(mockGetCreditBalance).not.toHaveBeenCalled()
  })

  // creditCost > 1 — the avatar-render case ($0.50/min on the provider makes
  // a single credit a loss, so avatars/generate passes creditCost: 2).
  describe('creditCost > 1 (e.g. avatar renders)', () => {
    it('denies with topUpAvailable when the balance (1) is below the cost (2)', async () => {
      mockGetUserPlan.mockResolvedValue('pro')
      mockPrisma.usageRecord.count.mockResolvedValue(PLAN_QUOTAS.pro.videosPerMonth)
      mockGetCreditBalance.mockResolvedValue(1)

      const verdict = await checkGenerationQuota('user-1', 60, 2)

      expect(verdict.allowed).toBe(false)
      expect(verdict.usePurchasedCredit).toBeUndefined()
      expect(verdict.topUpAvailable).toBe(true)
      expect(verdict.reason).toMatch(/2 purchased credits/i)
    })

    it('allows with usePurchasedCredit + creditCost 2 when the balance (2) covers the cost (2)', async () => {
      mockGetUserPlan.mockResolvedValue('pro')
      mockPrisma.usageRecord.count.mockResolvedValue(PLAN_QUOTAS.pro.videosPerMonth)
      mockGetCreditBalance.mockResolvedValue(2)

      const verdict = await checkGenerationQuota('user-1', 60, 2)

      expect(verdict.allowed).toBe(true)
      expect(verdict.usePurchasedCredit).toBe(true)
      expect(verdict.creditCost).toBe(2)
    })
  })
})

describe('settleGenerationEntitlement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const baseVerdict: QuotaVerdict = {
    allowed: true,
    plan: 'free',
    used: 2,
    limit: 2,
    maxDurationSeconds: 90,
  }

  it('always records monthly usage, and does not touch credits when usePurchasedCredit is unset', async () => {
    mockPrisma.usageRecord.create.mockResolvedValue({} as any)

    await settleGenerationEntitlement('user-1', 'video-1', 30, baseVerdict)

    expect(mockPrisma.usageRecord.create).toHaveBeenCalledTimes(1)
    expect(mockConsumeCredit).not.toHaveBeenCalled()
  })

  it('consumes verdict.creditCost purchased credits (defaulting to 1) alongside usage', async () => {
    mockPrisma.usageRecord.create.mockResolvedValue({} as any)

    await settleGenerationEntitlement('user-1', 'video-1', 30, {
      ...baseVerdict,
      usePurchasedCredit: true,
    })

    expect(mockConsumeCredit).toHaveBeenCalledWith({ userId: 'user-1', videoId: 'video-1', credits: 1 })
  })

  it('consumes exactly the avatar 2-credit cost when the verdict priced it in', async () => {
    mockPrisma.usageRecord.create.mockResolvedValue({} as any)

    await settleGenerationEntitlement('user-1', 'video-avatar-1', 60, {
      ...baseVerdict,
      usePurchasedCredit: true,
      creditCost: 2,
    })

    expect(mockConsumeCredit).toHaveBeenCalledWith({
      userId: 'user-1',
      videoId: 'video-avatar-1',
      credits: 2,
    })
  })
})
