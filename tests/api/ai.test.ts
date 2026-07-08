import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/route'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    aIGeneration: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/features/emotion-ai', () => ({
  analyzeEmotion: jest.fn().mockResolvedValue({
    emotion: 'excited',
    confidence: 0.85,
    sentimentScore: 0.7,
  }),
  selectAssetsForEmotion: jest.fn().mockReturnValue({
    musicTracks: ['energetic.mp3'],
    transitions: ['quick_cut.mp4'],
    colorSchemes: ['vibrant_red'],
    pacing: 'fast',
  }),
  generateEmotionAwareScript: jest.fn().mockImplementation((script) => script + ' (with emotion)'),
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Generated script content' } }],
          usage: { total_tokens: 100 },
        }),
      },
    },
    images: {
      generate: jest.fn().mockResolvedValue({
        data: [{ url: 'https://example.com/image.jpg' }],
      }),
    },
  })),
}))

jest.mock('@/lib/video-generator', () => ({
  generateVideoFromPrompt: jest.fn().mockResolvedValue('https://example.com/video.mp4'),
  cleanupOldVideos: jest.fn(),
}))

// Mock fetch for ElevenLabs
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
})

const { getServerSession } = require('next-auth')
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('/api/ai', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create AI generation for script writing', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      mockPrisma.aIGeneration.create.mockResolvedValue({
        id: 'gen-1',
        type: 'SCRIPT_WRITING',
        prompt: 'Create a video script',
        status: 'PROCESSING',
        userId: 'user-1',
        result: null,
        tokensUsed: null,
        cost: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.aIGeneration.update.mockResolvedValue({
        id: 'gen-1',
        type: 'SCRIPT_WRITING',
        prompt: 'Create a video script',
        status: 'COMPLETED',
        userId: 'user-1',
        result: 'Generated script content',
        tokensUsed: 100,
        cost: 0.003,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Create a video script',
          type: 'SCRIPT_WRITING'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('completed')
      expect(data.result).toBe('Generated script content')
      expect(mockPrisma.aIGeneration.create).toHaveBeenCalledWith({
        data: {
          prompt: 'Create a video script',
          type: 'SCRIPT_WRITING',
          status: 'PROCESSING',
          userId: 'user-1',
        },
      })
    })

    it('should handle voice synthesis requests', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      mockPrisma.aIGeneration.create.mockResolvedValue({
        id: 'gen-2',
        type: 'VOICE_SYNTHESIS',
        prompt: 'Hello world',
        status: 'PROCESSING',
        userId: 'user-1',
        result: null,
        tokensUsed: null,
        cost: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.aIGeneration.update.mockResolvedValue({
        id: 'gen-2',
        type: 'VOICE_SYNTHESIS',
        prompt: 'Hello world',
        status: 'COMPLETED',
        userId: 'user-1',
        result: 'data:audio/mpeg;base64,SGVsbG8gd29ybGQ=',
        tokensUsed: 0,
        cost: 0.001,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Hello world',
          type: 'VOICE_SYNTHESIS'
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('completed')
      expect(data.result).toContain('data:audio/mpeg;base64')
    })

    it('should return 401 for unauthorized users', async () => {
      getServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Test prompt',
          type: 'SCRIPT_WRITING'
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should handle validation errors', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      const request = new NextRequest('http://localhost:3000/api/ai', {
        method: 'POST',
        body: JSON.stringify({
          prompt: '',
          type: 'INVALID_TYPE'
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('GET', () => {
    it('should return user AI generations', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      mockPrisma.aIGeneration.findMany.mockResolvedValue([
        {
          id: 'gen-1',
          type: 'SCRIPT_WRITING',
          prompt: 'Create a script',
          status: 'COMPLETED',
          userId: 'user-1',
          result: 'Script content',
          tokensUsed: 100,
          cost: 0.003,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ])

      const request = new NextRequest('http://localhost:3000/api/ai')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe('gen-1')
    })

    it('should return specific generation by ID', async () => {
      getServerSession.mockResolvedValue({
        user: { id: 'user-1' }
      })

      mockPrisma.aIGeneration.findUnique.mockResolvedValue({
        id: 'gen-1',
        type: 'SCRIPT_WRITING',
        prompt: 'Create a script',
        status: 'COMPLETED',
        userId: 'user-1',
        result: 'Script content',
        tokensUsed: 100,
        cost: 0.003,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: {
          id: 'user-1',
          name: 'Test User',
        }
      })

      const request = new NextRequest('http://localhost:3000/api/ai?id=gen-1')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('gen-1')
      expect(data.user.name).toBe('Test User')
    })
  })

  it('should handle emotion-aware video generation', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user-1' }
    })

    const request = new NextRequest('http://localhost:3000/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        action: 'generate_video',
        prompt: 'Create an exciting video about product launch',
        style: 'energetic',
        duration: 30,
        enableEmotionAware: true
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    // Should include emotion data in response
  })

  it('should generate DALL-E images', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user-1' }
    })

    mockPrisma.aIGeneration.create.mockResolvedValue({
      id: 'gen-3',
      type: 'IMAGE_GENERATION',
      prompt: 'A modern office space',
      status: 'PROCESSING',
      userId: 'user-1',
      result: null,
      tokensUsed: null,
      cost: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.aIGeneration.update.mockResolvedValue({
      id: 'gen-3',
      type: 'IMAGE_GENERATION',
      prompt: 'A modern office space',
      status: 'COMPLETED',
      userId: 'user-1',
      result: 'https://example.com/image.jpg',
      tokensUsed: 0,
      cost: 0.04,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new NextRequest('http://localhost:3000/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'A modern office space',
        type: 'IMAGE_GENERATION',
        settings: { size: '1024x1024' }
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('completed')
    expect(data.result).toBe('https://example.com/image.jpg')
    expect(data.cost).toBe(0.04)
  })

  it('should generate ElevenLabs voice synthesis', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user-1' }
    })

    mockPrisma.aIGeneration.create.mockResolvedValue({
      id: 'gen-4',
      type: 'VOICE_SYNTHESIS',
      prompt: 'Hello world',
      status: 'PROCESSING',
      userId: 'user-1',
      result: null,
      tokensUsed: null,
      cost: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.aIGeneration.update.mockResolvedValue({
      id: 'gen-4',
      type: 'VOICE_SYNTHESIS',
      prompt: 'Hello world',
      status: 'COMPLETED',
      userId: 'user-1',
      result: 'data:audio/mpeg;base64,SGVsbG8gd29ybGQ=',
      tokensUsed: 0,
      cost: 0.001,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new NextRequest('http://localhost:3000/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Hello world',
        type: 'VOICE_SYNTHESIS',
        settings: { voiceId: 'custom-voice' }
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('completed')
    expect(data.result).toContain('data:audio/mpeg')
  })

  it('should handle storyboard generation', async () => {
    getServerSession.mockResolvedValue({
      user: { id: 'user-1' }
    })

    mockPrisma.aIGeneration.create.mockResolvedValue({
      id: 'gen-5',
      type: 'STORYBOARD',
      prompt: 'Create storyboard',
      status: 'PROCESSING',
      userId: 'user-1',
      result: null,
      tokensUsed: null,
      cost: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    mockPrisma.aIGeneration.update.mockResolvedValue({
      id: 'gen-5',
      type: 'STORYBOARD',
      prompt: 'Create storyboard',
      status: 'COMPLETED',
      userId: 'user-1',
      result: 'Storyboard content',
      tokensUsed: 200,
      cost: 0.006,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new NextRequest('http://localhost:3000/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'Create storyboard',
        type: 'STORYBOARD'
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('completed')
    expect(data.result).toBe('Storyboard content')
    expect(data.tokensUsed).toBe(200)
  })
})