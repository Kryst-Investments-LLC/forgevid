/**
 * lib/credits.ts unit tests — no database. Prisma is mocked, following the
 * pattern in tests/api/ai.test.ts / tests/api/payments.test.ts
 * (jest.mock('@/lib/prisma', ...)).
 *
 * Covers the two behaviors that matter most for correctness of the purchased-
 * credit pool: getCreditBalance failing CLOSED on a lookup error (an
 * unprovable balance must never unlock a purchased-credit generation), and
 * grantCredits being idempotent on a re-delivered Stripe webhook (P2002 on
 * the unique stripeSessionId is "already granted", not a failure).
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
// NOTE: `jest` itself is intentionally the ambient global here, not imported
// from '@jest/globals' — with this repo's next/jest (SWC) transform, importing
// it breaks jest.mock() hoisting and the mock silently never applies (the real
// lib/prisma.ts loads instead). Confirmed by reproduction; see tests/lib/auth-sso.test.ts
// for the same pattern.

jest.mock('@/lib/prisma', () => ({
  prisma: {
    creditLedger: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import { getCreditBalance, grantCredits, consumeCredit, refundCreditForVideo } from '@/lib/credits'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('lib/credits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCreditBalance', () => {
    it('returns the summed delta', async () => {
      mockPrisma.creditLedger.aggregate.mockResolvedValue({ _sum: { delta: 7 } } as any)

      await expect(getCreditBalance('user-1')).resolves.toBe(7)
    })

    it('returns 0 when the user has no ledger rows', async () => {
      mockPrisma.creditLedger.aggregate.mockResolvedValue({ _sum: { delta: null } } as any)

      await expect(getCreditBalance('user-1')).resolves.toBe(0)
    })

    it('fails CLOSED (returns 0) on a lookup error', async () => {
      mockPrisma.creditLedger.aggregate.mockRejectedValue(new Error('db unreachable'))

      await expect(getCreditBalance('user-1')).resolves.toBe(0)
    })
  })

  describe('grantCredits', () => {
    it('creates a ledger row for a new purchase', async () => {
      mockPrisma.creditLedger.create.mockResolvedValue({} as any)

      await grantCredits({
        userId: 'user-1',
        credits: 10,
        reason: 'purchase_topup10',
        stripeSessionId: 'cs_test_1',
      })

      expect(mockPrisma.creditLedger.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          delta: 10,
          reason: 'purchase_topup10',
          stripeSessionId: 'cs_test_1',
        },
      })
    })

    it('swallows a P2002 duplicate (re-delivered webhook) as success', async () => {
      const duplicate = Object.assign(new Error('Unique constraint failed on stripeSessionId'), {
        code: 'P2002',
      })
      mockPrisma.creditLedger.create.mockRejectedValue(duplicate)

      await expect(
        grantCredits({
          userId: 'user-1',
          credits: 1,
          reason: 'purchase_single',
          stripeSessionId: 'cs_test_2',
        }),
      ).resolves.toBeUndefined()
    })

    it('does not throw on an unexpected error either (best-effort bookkeeping)', async () => {
      mockPrisma.creditLedger.create.mockRejectedValue(new Error('connection reset'))

      await expect(
        grantCredits({
          userId: 'user-1',
          credits: 25,
          reason: 'purchase_topup25',
          stripeSessionId: 'cs_test_3',
        }),
      ).resolves.toBeUndefined()
    })
  })

  describe('consumeCredit', () => {
    it('writes a -1 ledger row tagged with the video', async () => {
      mockPrisma.creditLedger.create.mockResolvedValue({} as any)

      await consumeCredit({ userId: 'user-1', videoId: 'video-1' })

      expect(mockPrisma.creditLedger.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', delta: -1, reason: 'consume_generation', videoId: 'video-1' },
      })
    })
  })

  describe('refundCreditForVideo', () => {
    it('refunds when a consume row exists and no refund has been recorded yet', async () => {
      mockPrisma.creditLedger.findFirst
        .mockResolvedValueOnce({ id: 'consume-1', userId: 'user-1' } as any) // consume lookup
        .mockResolvedValueOnce(null as any) // refund lookup
      mockPrisma.creditLedger.create.mockResolvedValue({} as any)

      await refundCreditForVideo('video-1')

      expect(mockPrisma.creditLedger.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', delta: 1, reason: 'refund_failed_render', videoId: 'video-1' },
      })
    })

    it('is a no-op when the video never consumed a purchased credit', async () => {
      mockPrisma.creditLedger.findFirst.mockResolvedValue(null as any)

      await refundCreditForVideo('video-1')

      expect(mockPrisma.creditLedger.create).not.toHaveBeenCalled()
    })

    it('is a no-op when the video was already refunded (no double grant)', async () => {
      mockPrisma.creditLedger.findFirst
        .mockResolvedValueOnce({ id: 'consume-1', userId: 'user-1' } as any)
        .mockResolvedValueOnce({ id: 'refund-1' } as any)

      await refundCreditForVideo('video-1')

      expect(mockPrisma.creditLedger.create).not.toHaveBeenCalled()
    })
  })
})
