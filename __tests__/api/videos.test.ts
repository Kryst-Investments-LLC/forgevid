import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    video: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const { getServerSession } = require('next-auth')
const { prisma } = require('@/lib/prisma')
const { GET, POST } = require('@/app/api/videos/route')

describe('/api/videos current contract', () => {
  const session = { user: { id: 'user-123', email: 'test@example.com' } }

  beforeEach(() => {
    jest.clearAllMocks()
    getServerSession.mockResolvedValue(session)
  })

  it('creates an empty editor project as a draft', async () => {
    const createdAt = new Date()
    prisma.video.create.mockResolvedValue({
      id: 'video-123',
      title: 'Campaign',
      status: 'DRAFT',
      createdAt,
    })

    const response = await POST(new NextRequest('http://localhost/api/videos', {
      method: 'POST',
      body: JSON.stringify({ title: 'Campaign', description: 'Launch video' }),
    }))
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.video).toEqual(expect.objectContaining({ id: 'video-123', status: 'DRAFT' }))
    expect(prisma.video.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-123',
        title: 'Campaign',
        status: 'DRAFT',
        metadata: JSON.stringify({ tracks: [] }),
      }),
    }))
  })

  it('lists only the authenticated user videos and serializes BigInt', async () => {
    prisma.video.findMany.mockResolvedValue([{
      id: 'video-1',
      title: 'Ready',
      description: '',
      status: 'COMPLETED',
      thumbnail: null,
      duration: 10,
      fileSize: BigInt(42),
      url: null,
      fileUrl: '/video.mp4',
      metadata: JSON.stringify({ shareEnabled: true }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.videos[0]).toEqual(expect.objectContaining({
      id: 'video-1',
      fileSize: 42,
      shareEnabled: true,
    }))
    expect(prisma.video.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-123' },
    }))
  })

  it('rejects unauthenticated creation and listing', async () => {
    getServerSession.mockResolvedValue(null)
    const createResponse = await POST(new NextRequest('http://localhost/api/videos', {
      method: 'POST',
      body: JSON.stringify({ title: 'Nope' }),
    }))
    const listResponse = await GET()
    expect(createResponse.status).toBe(401)
    expect(listResponse.status).toBe(401)
  })

  it('rejects invalid project input', async () => {
    const response = await POST(new NextRequest('http://localhost/api/videos', {
      method: 'POST',
      body: JSON.stringify({ title: '' }),
    }))
    expect(response.status).toBe(400)
    expect(prisma.video.create).not.toHaveBeenCalled()
  })
})
