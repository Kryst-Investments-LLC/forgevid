import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/ai/route';
import { prisma } from '@/lib/database';
// Mock dependencies
jest.mock('@/lib/database', () => ({
    prisma: {
        aIGeneration: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));
jest.mock('next-auth', () => ({
    getServerSession: jest.fn(),
}));
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
}));
// Mock fetch for ElevenLabs
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
});
const { getServerSession } = require('next-auth');
const mockPrisma = prisma;
describe('/api/ai', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST', () => {
        it('should create AI generation for script writing', async () => {
            getServerSession.mockResolvedValue({
                user: { id: 'user-1' }
            });
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
            });
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
            });
            const request = new NextRequest('http://localhost:3000/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: 'Create a video script',
                    type: 'SCRIPT_WRITING'
                }),
            });
            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.status).toBe('completed');
            expect(data.result).toBe('Generated script content');
            expect(mockPrisma.aIGeneration.create).toHaveBeenCalledWith({
                data: {
                    prompt: 'Create a video script',
                    type: 'SCRIPT_WRITING',
                    status: 'PROCESSING',
                    userId: 'user-1',
                },
            });
        });
        it('should handle voice synthesis requests', async () => {
            getServerSession.mockResolvedValue({
                user: { id: 'user-1' }
            });
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
            });
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
            });
            const request = new NextRequest('http://localhost:3000/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: 'Hello world',
                    type: 'VOICE_SYNTHESIS'
                }),
            });
            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.status).toBe('completed');
            expect(data.result).toContain('data:audio/mpeg;base64');
        });
        it('should return 401 for unauthorized users', async () => {
            getServerSession.mockResolvedValue(null);
            const request = new NextRequest('http://localhost:3000/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: 'Test prompt',
                    type: 'SCRIPT_WRITING'
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(401);
        });
        it('should handle validation errors', async () => {
            getServerSession.mockResolvedValue({
                user: { id: 'user-1' }
            });
            const request = new NextRequest('http://localhost:3000/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: '',
                    type: 'INVALID_TYPE'
                }),
            });
            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });
    describe('GET', () => {
        it('should return user AI generations', async () => {
            getServerSession.mockResolvedValue({
                user: { id: 'user-1' }
            });
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
            ]);
            const request = new NextRequest('http://localhost:3000/api/ai');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(Array.isArray(data)).toBe(true);
            expect(data).toHaveLength(1);
            expect(data[0].id).toBe('gen-1');
        });
        it('should return specific generation by ID', async () => {
            getServerSession.mockResolvedValue({
                user: { id: 'user-1' }
            });
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
            });
            const request = new NextRequest('http://localhost:3000/api/ai?id=gen-1');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.id).toBe('gen-1');
            expect(data.user.name).toBe('Test User');
        });
    });
});
