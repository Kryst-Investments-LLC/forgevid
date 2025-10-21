import { NextRequest } from 'next/server';
import { POST, GET, PUT } from '@/app/api/videos/route';
import { prisma } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
// Mock dependencies
jest.mock('@/lib/database', () => ({
    prisma: {
        video: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
        },
        usageRecord: {
            create: jest.fn(),
        },
    },
}));
jest.mock('next-auth/next', () => ({
    getServerSession: jest.fn(),
}));
jest.mock('@/middleware/rate-limit', () => ({
    RateLimiter: {
        checkLimit: jest.fn().mockResolvedValue({
            success: true,
            limit: 100,
            remaining: 99,
            reset: Date.now() + 60000,
        }),
    },
}));
// Mock AI services
jest.mock('openai', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
        audio: {
            transcriptions: {
                create: jest.fn().mockResolvedValue('Mock transcript'),
            },
        },
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: 'Mock summary' } }],
                }),
            },
        },
    })),
}));
jest.mock('elevenlabs', () => ({
    ElevenLabsClient: jest.fn().mockImplementation(() => ({
        textToSpeech: {
            convert: jest.fn().mockResolvedValue('mock-audio-url'),
        },
    })),
}));
// Mock Cloudinary
jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        uploader: {
            upload_stream: jest.fn().mockImplementation((options, callback) => ({
                end: jest.fn().mockImplementation((buffer) => {
                    callback(null, {
                        secure_url: 'https://cloudinary.com/mock-video.mp4',
                        public_id: 'mock-public-id',
                        duration: 120,
                    });
                }),
            })),
        },
    },
}));
describe('/api/videos', () => {
    const mockSession = {
        user: {
            id: 'user-123',
            email: 'test@example.com',
            organizationId: 'org-123',
            role: 'USER',
        },
    };
    beforeEach(() => {
        jest.clearAllMocks();
        getServerSession.mockResolvedValue(mockSession);
    });
    describe('POST /api/videos', () => {
        it('should upload a video successfully', async () => {
            const mockVideo = {
                id: 'video-123',
                title: 'Test Video',
                fileUrl: 'https://cloudinary.com/mock-video.mp4',
                thumbnail: 'https://cloudinary.com/mock-thumbnail.jpg',
                transcript: 'Mock transcript',
                summary: 'Mock summary',
                duration: 120,
                createdAt: new Date(),
            };
            prisma.video.create.mockResolvedValue(mockVideo);
            prisma.usageRecord.create.mockResolvedValue({});
            const formData = new FormData();
            formData.append('file', new File(['mock video content'], 'test.mp4', { type: 'video/mp4' }));
            formData.append('title', 'Test Video');
            formData.append('description', 'Test description');
            const request = new NextRequest('http://localhost:3000/api/videos', {
                method: 'POST',
                body: formData,
            });
            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.video.title).toBe('Test Video');
            expect(prisma.video.create).toHaveBeenCalled();
            expect(prisma.usageRecord.create).toHaveBeenCalled();
        });
        it('should return 401 for unauthorized request', async () => {
            getServerSession.mockResolvedValue(null);
            const formData = new FormData();
            formData.append('file', new File(['mock video content'], 'test.mp4', { type: 'video/mp4' }));
            formData.append('title', 'Test Video');
            const request = new NextRequest('http://localhost:3000/api/videos', {
                method: 'POST',
                body: formData,
            });
            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });
        it('should return 400 for missing required fields', async () => {
            const formData = new FormData();
            formData.append('file', new File(['mock video content'], 'test.mp4', { type: 'video/mp4' }));
            // Missing title
            const request = new NextRequest('http://localhost:3000/api/videos', {
                method: 'POST',
                body: formData,
            });
            const response = await POST(request);
            const data = await response.json();
            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing required fields');
        });
    });
    describe('GET /api/videos', () => {
        it('should return user videos with pagination', async () => {
            const mockVideos = [
                {
                    id: 'video-1',
                    title: 'Video 1',
                    status: 'COMPLETED',
                    createdAt: new Date(),
                },
                {
                    id: 'video-2',
                    title: 'Video 2',
                    status: 'PROCESSING',
                    createdAt: new Date(),
                },
            ];
            prisma.video.findMany.mockResolvedValue(mockVideos);
            prisma.video.count.mockResolvedValue(2);
            const request = new NextRequest('http://localhost:3000/api/videos?page=1&limit=10');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.videos).toHaveLength(2);
            expect(data.pagination.total).toBe(2);
            expect(data.pagination.page).toBe(1);
        });
        it('should filter videos by status', async () => {
            const mockVideos = [
                {
                    id: 'video-1',
                    title: 'Video 1',
                    status: 'COMPLETED',
                    createdAt: new Date(),
                },
            ];
            prisma.video.findMany.mockResolvedValue(mockVideos);
            prisma.video.count.mockResolvedValue(1);
            const request = new NextRequest('http://localhost:3000/api/videos?status=COMPLETED');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.videos).toHaveLength(1);
            expect(prisma.video.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    userId: 'user-123',
                    status: 'COMPLETED',
                }),
            }));
        });
    });
    describe('PUT /api/videos', () => {
        it('should process video with transcribe action', async () => {
            const mockVideo = {
                id: 'video-123',
                title: 'Test Video',
                transcript: null,
                userId: 'user-123',
            };
            prisma.video.findFirst.mockResolvedValue(mockVideo);
            prisma.video.update.mockResolvedValue({
                ...mockVideo,
                transcript: 'Mock transcript',
            });
            const request = new NextRequest('http://localhost:3000/api/videos', {
                method: 'PUT',
                body: JSON.stringify({
                    videoId: 'video-123',
                    action: 'transcribe',
                }),
            });
            const response = await PUT(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.result.transcript).toBe('Mock transcript');
        });
        it('should return 404 for non-existent video', async () => {
            prisma.video.findFirst.mockResolvedValue(null);
            const request = new NextRequest('http://localhost:3000/api/videos', {
                method: 'PUT',
                body: JSON.stringify({
                    videoId: 'non-existent',
                    action: 'transcribe',
                }),
            });
            const response = await PUT(request);
            const data = await response.json();
            expect(response.status).toBe(404);
            expect(data.error).toBe('Video not found');
        });
        it('should return 400 for invalid action', async () => {
            const request = new NextRequest('http://localhost:3000/api/videos', {
                method: 'PUT',
                body: JSON.stringify({
                    videoId: 'video-123',
                    action: 'invalid-action',
                }),
            });
            const response = await PUT(request);
            const data = await response.json();
            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid action');
        });
    });
});
