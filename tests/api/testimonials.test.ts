import { NextRequest } from 'next/server'
import { POST } from '@/app/api/testimonials/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: { usageRecord: { create: jest.fn() } },
}))

describe('POST /api/testimonials', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'user-1' } })
    ;(prisma.usageRecord.create as jest.Mock).mockResolvedValue({ id: 'feedback-1' })
  })

  it('records feedback and explicit public-use consent', async () => {
    const response = await POST(new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
      body: JSON.stringify({
        testimonial: 'ForgeVid helped our team publish inventory videos much faster.',
        businessName: 'Example Motors',
        allowPublicUse: true,
      }),
    }))
    expect(response.status).toBe(200)
    expect(prisma.usageRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', action: 'testimonial_submitted' }),
    })
    const call = (prisma.usageRecord.create as jest.Mock).mock.calls[0][0]
    expect(JSON.parse(call.data.metadata)).toMatchObject({
      businessName: 'Example Motors',
      allowPublicUse: true,
    })
  })

  it('rejects feedback that is too short', async () => {
    const response = await POST(new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
      body: JSON.stringify({ testimonial: 'Good', allowPublicUse: false }),
    }))
    expect(response.status).toBe(400)
  })

  it('requires authentication', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const response = await POST(new NextRequest('http://localhost/api/testimonials', {
      method: 'POST',
      body: JSON.stringify({ testimonial: 'A sufficiently long private feedback message.', allowPublicUse: false }),
    }))
    expect(response.status).toBe(401)
  })
})
