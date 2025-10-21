import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/admin/revenue/route'

// Mock dependencies
jest.mock('@/lib/database', () => ({
  prisma: {
    user: {
      count: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const { getServerSession } = require('next-auth')

describe('/api/admin/revenue', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return revenue analytics for admin users', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      })

      const { prisma } = require('@/lib/database')
      
      // Mock database responses
      prisma.user.count.mockResolvedValue(100)
      prisma.subscription.findMany.mockResolvedValue([
        {
          id: 'sub-1',
          status: 'ACTIVE',
          plan: 'pro',
          userId: 'user-1',
          createdAt: new Date(),
        },
        {
          id: 'sub-2',
          status: 'ACTIVE',
          plan: 'starter',
          userId: 'user-2',
          createdAt: new Date(),
        }
      ])
      
      prisma.subscription.groupBy.mockResolvedValue([
        { plan: 'pro', _count: { plan: 1 } },
        { plan: 'starter', _count: { plan: 1 } }
      ])
      
      prisma.subscription.count
        .mockResolvedValueOnce(0) // canceled this month
        .mockResolvedValueOnce(5) // trial users
        .mockResolvedValueOnce(10) // converted users

      prisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 9900, // $99 in cents
          currency: 'usd',
          status: 'SUCCEEDED',
          userId: 'user-1',
          createdAt: new Date(),
          user: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
          subscription: { plan: 'pro' }
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/admin/revenue?period=30')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics).toBeDefined()
      expect(data.metrics.mrr).toBeGreaterThan(0)
      expect(data.metrics.arr).toBeGreaterThan(0)
      expect(data.metrics.conversionRate).toBeGreaterThan(0)
      expect(data.subscriptionBreakdown).toBeInstanceOf(Array)
      expect(data.monthlyTrends).toBeInstanceOf(Array)
      expect(data.totalUsers).toBe(100)
    })

    it('should return 403 for non-admin users', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1', role: 'USER' }
      })

      const request = new NextRequest('http://localhost:3000/api/admin/revenue')

      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('should return 403 for unauthenticated users', async () => {
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/revenue')

      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('should calculate conversion rate correctly', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'admin-1', role: 'ADMIN' }
      })

      const { prisma } = require('@/lib/database')
      
      // Mock specific conversion rate scenario
      prisma.user.count.mockResolvedValue(50)
      prisma.subscription.findMany.mockResolvedValue([])
      prisma.subscription.groupBy.mockResolvedValue([])
      prisma.subscription.count
        .mockResolvedValueOnce(0) // canceled this month
        .mockResolvedValueOnce(20) // trial users
        .mockResolvedValueOnce(5) // converted users (25% conversion)
      prisma.payment.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/admin/revenue')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.metrics.conversionRate).toBe(25) // 5/20 * 100 = 25%
    })
  })
})