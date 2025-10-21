import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/media/route'

// Mock dependencies
jest.mock('@/lib/database', () => ({
  prisma: {
    mediaAsset: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const { getServerSession } = require('next-auth')

describe('/api/media', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create media asset successfully', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      const mockMediaAsset = {
        id: 'media-1',
        name: 'test-video.mp4',
        fileName: 'test-video.mp4',
        type: 'VIDEO',
        url: 'https://example.com/video.mp4',
        uploadedById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        thumbnail: null,
        duration: null,
        fileSize: null,
        resolution: null,
        metadata: null,
        isPublic: false,
      }

      const { prisma } = require('@/lib/database')
      prisma.mediaAsset.create.mockResolvedValue(mockMediaAsset)

      const request = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test-video.mp4',
          fileName: 'test-video.mp4',
          type: 'VIDEO',
          url: 'https://example.com/video.mp4'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('media-1')
      expect(data.name).toBe('test-video.mp4')
      expect(data.type).toBe('VIDEO')
    })

    it('should return 401 for unauthorized users', async () => {
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/media', {
        method: 'POST',
        body: JSON.stringify({
          name: 'test.mp4',
          type: 'VIDEO',
          url: 'https://example.com/test.mp4'
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('GET', () => {
    it('should return user media assets', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      const mockAssets = [
        {
          id: 'media-1',
          name: 'video1.mp4',
          type: 'VIDEO',
          url: 'https://example.com/video1.mp4',
          uploadedById: 'user-1',
          createdAt: new Date(),
        },
        {
          id: 'media-2',
          name: 'image1.jpg',
          type: 'IMAGE',
          url: 'https://example.com/image1.jpg',
          uploadedById: 'user-1',
          createdAt: new Date(),
        }
      ]

      const { prisma } = require('@/lib/database')
      prisma.mediaAsset.findMany.mockResolvedValue(mockAssets)

      const request = new NextRequest('http://localhost:3000/api/media')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data.assets)).toBe(true)
      expect(data.assets).toHaveLength(2)
      expect(data.total).toBe(2)
    })
  })
})