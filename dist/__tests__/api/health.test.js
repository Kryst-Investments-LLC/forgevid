import { NextRequest } from 'next/server';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/database';
import { Redis } from '@upstash/redis';
// Mock dependencies
jest.mock('@/lib/database', () => ({
    prisma: {
        $queryRaw: jest.fn(),
    },
}));
jest.mock('@upstash/redis', () => ({
    Redis: {
        fromEnv: jest.fn().mockReturnValue({
            get: jest.fn(),
        }),
    },
}));
jest.mock('@/lib/logger', () => ({
    Logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));
// Mock fetch for external API checks
global.fetch = jest.fn();
describe('/api/health', () => {
    let mockRedis;
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedis = {
            get: jest.fn(),
        };
        Redis.fromEnv.mockReturnValue(mockRedis);
    });
    describe('GET /api/health', () => {
        it('should return healthy status when all services are working', async () => {
            // Mock successful database check
            prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
            // Mock successful Redis check
            mockRedis.get.mockResolvedValue('ok');
            // Mock successful external API checks
            global.fetch
                .mockResolvedValueOnce({ ok: true }) // OpenAI
                .mockResolvedValueOnce({ ok: true }); // Cloudinary
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(200);
            expect(data.status).toBe('healthy');
            expect(data.health.checks).toHaveLength(3);
            expect(data.health.checks.every((check) => check.status === 'healthy')).toBe(true);
            expect(data.system).toHaveProperty('uptime');
            expect(data.system).toHaveProperty('memory');
            expect(data.performance).toHaveProperty('responseTime');
        });
        it('should return unhealthy status when database is down', async () => {
            // Mock database failure
            prisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));
            // Mock successful Redis check
            mockRedis.get.mockResolvedValue('ok');
            // Mock successful external API checks
            global.fetch
                .mockResolvedValueOnce({ ok: true }) // OpenAI
                .mockResolvedValueOnce({ ok: true }); // Cloudinary
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(503);
            expect(data.status).toBe('unhealthy');
            expect(data.health.checks.find((check) => check.service === 'database').status).toBe('unhealthy');
        });
        it('should return unhealthy status when Redis is down', async () => {
            // Mock successful database check
            prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
            // Mock Redis failure
            mockRedis.get.mockRejectedValue(new Error('Redis connection failed'));
            // Mock successful external API checks
            global.fetch
                .mockResolvedValueOnce({ ok: true }) // OpenAI
                .mockResolvedValueOnce({ ok: true }); // Cloudinary
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(503);
            expect(data.status).toBe('unhealthy');
            expect(data.health.checks.find((check) => check.service === 'redis').status).toBe('unhealthy');
        });
        it('should return degraded status when external APIs are down', async () => {
            // Mock successful database check
            prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
            // Mock successful Redis check
            mockRedis.get.mockResolvedValue('ok');
            // Mock external API failures
            global.fetch
                .mockResolvedValueOnce({ ok: false }) // OpenAI
                .mockResolvedValueOnce({ ok: false }); // Cloudinary
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(503);
            expect(data.status).toBe('unhealthy');
            expect(data.health.checks.find((check) => check.service === 'external-apis').status).toBe('unhealthy');
        });
        it('should handle health check errors gracefully', async () => {
            // Mock database check throwing an error
            prisma.$queryRaw.mockRejectedValue(new Error('Unexpected error'));
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(response.status).toBe(503);
            expect(data.status).toBe('unhealthy');
            expect(data.error).toBe('Health check failed');
        });
        it('should include system information', async () => {
            // Mock all services as healthy
            prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
            mockRedis.get.mockResolvedValue('ok');
            global.fetch
                .mockResolvedValueOnce({ ok: true })
                .mockResolvedValueOnce({ ok: true });
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(data.system).toMatchObject({
                uptime: expect.any(Number),
                memory: expect.objectContaining({
                    rss: expect.any(Number),
                    heapTotal: expect.any(Number),
                    heapUsed: expect.any(Number),
                    external: expect.any(Number),
                }),
                version: expect.any(String),
                platform: expect.any(String),
                arch: expect.any(String),
                nodeEnv: expect.any(String),
                pid: expect.any(Number),
                cpuUsage: expect.objectContaining({
                    user: expect.any(Number),
                    system: expect.any(Number),
                }),
            });
        });
        it('should include performance metrics', async () => {
            // Mock all services as healthy
            prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
            mockRedis.get.mockResolvedValue('ok');
            global.fetch
                .mockResolvedValueOnce({ ok: true })
                .mockResolvedValueOnce({ ok: true });
            const request = new NextRequest('http://localhost:3000/api/health');
            const response = await GET(request);
            const data = await response.json();
            expect(data.performance).toMatchObject({
                responseTime: expect.any(Number),
                memoryUsage: expect.objectContaining({
                    rss: expect.any(Number),
                    heapTotal: expect.any(Number),
                    heapUsed: expect.any(Number),
                    external: expect.any(Number),
                }),
                uptime: expect.any(Number),
                timestamp: expect.any(String),
            });
        });
    });
});
