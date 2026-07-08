import { NextRequest } from 'next/server';
import { POST, GET, PUT, DELETE } from '@/app/api/templates/route';
import { POST as POSTRating, GET as GETRating } from '@/app/api/templates/ratings/route';
import { POST as POSTFavorite, GET as GETFavorite } from '@/app/api/templates/favorites/route';
import { POST as POSTRemix } from '@/app/api/templates/remix/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    template: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    templateRating: {
      upsert: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    templateFavorite: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth
const mockSession = {
  user: { id: 'user_123', email: 'test@example.com', name: 'Test User' },
};

describe('Template API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('GET /api/templates', () => {
    it('should fetch templates with pagination', async () => {
      const mockTemplates = [
        {
          id: 'template_1',
          name: 'Test Template',
          category: 'BUSINESS',
          duration: 30,
          averageRating: 4.5,
          favoriteCount: 10,
          usageCount: 50,
          _count: { ratings: 20, favorites: 10 },
        },
      ];

      (prisma.template.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.template.count as jest.Mock).mockResolvedValue(100);

      const request = new NextRequest('http://localhost:3000/api/templates?page=1&limit=20');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.templates).toHaveLength(1);
      expect(data.pagination.total).toBe(100);
      expect(prisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      );
    });

    it('should filter templates by category', async () => {
      (prisma.template.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.template.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/templates?category=BUSINESS');
      await GET(request);

      expect(prisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'BUSINESS',
          }),
        })
      );
    });

    it('should search templates by name and description', async () => {
      (prisma.template.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.template.count as jest.Mock).mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/templates?search=marketing');
      await GET(request);

      expect(prisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ description: expect.any(Object) }),
            ]),
          }),
        })
      );
    });
  });

  describe('POST /api/templates', () => {
    it('should create a new template', async () => {
      const mockTemplate = {
        id: 'template_new',
        name: 'New Template',
        description: 'Test template',
        category: 'MARKETING',
        duration: 30,
        isPublic: false,
        createdById: 'user_123',
      };

      (prisma.template.create as jest.Mock).mockResolvedValue(mockTemplate);

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Template',
          description: 'Test template',
          category: 'MARKETING',
          duration: 30,
          aspectRatio: '16:9',
          resolution: '1080p',
          isPublic: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('New Template');
      expect(prisma.template.create).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Template Ratings', () => {
    it('should add a rating', async () => {
      const mockRating = {
        id: 'rating_1',
        templateId: 'template_1',
        userId: 'user_123',
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.templateRating.upsert as jest.Mock).mockResolvedValue(mockRating);
      (prisma.templateRating.aggregate as jest.Mock).mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 1 },
      });
      (prisma.template.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/templates/ratings', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'template_1',
          rating: 4.5,
          comment: 'Great template!',
        }),
      });

      const response = await POSTRating(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.templateRating.upsert).toHaveBeenCalled();
    });

    it('should reject invalid ratings', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates/ratings', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'template_1',
          rating: 10, // Invalid: > 5
        }),
      });

      const response = await POSTRating(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Template Favorites', () => {
    it('should add a favorite', async () => {
      const mockFavorite = {
        id: 'fav_1',
        templateId: 'template_1',
        userId: 'user_123',
        createdAt: new Date(),
      };

      (prisma.templateFavorite.create as jest.Mock).mockResolvedValue(mockFavorite);
      (prisma.template.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/templates/favorites', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'template_1',
          action: 'add',
        }),
      });

      const response = await POSTFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.templateFavorite.create).toHaveBeenCalled();
    });

    it('should remove a favorite', async () => {
      (prisma.templateFavorite.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.template.update as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/templates/favorites', {
        method: 'POST',
        body: JSON.stringify({
          templateId: 'template_1',
          action: 'remove',
        }),
      });

      const response = await POSTFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.templateFavorite.deleteMany).toHaveBeenCalled();
    });

    it('should check if the authenticated user favorited a template', async () => {
      (prisma.templateFavorite.findUnique as jest.Mock).mockResolvedValue({
        id: 'fav_1',
      });

      const request = new NextRequest('http://localhost:3000/api/templates/favorites?templateId=template_1&userId=other_user');
      const response = await GETFavorite(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isFavorite).toBe(true);
      expect(prisma.templateFavorite.findUnique).toHaveBeenCalledWith({
        where: {
          templateId_userId: {
            templateId: 'template_1',
            userId: 'user_123',
          },
        },
      });
    });

    it('should require authentication to read favorites', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/templates/favorites?templateId=template_1');
      const response = await GETFavorite(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Template Remix', () => {
    it('should remix templates', async () => {
      const mockTemplates = [
        {
          id: 'template_1',
          name: 'Template 1',
          category: 'BUSINESS',
          duration: 30,
          aspectRatio: '16:9',
          resolution: '1080p',
          tags: 'business',
          thumbnail: 'url1',
          templateData: JSON.stringify({ style: 'professional', music: 'corporate' }),
        },
        {
          id: 'template_2',
          name: 'Template 2',
          category: 'MARKETING',
          duration: 45,
          aspectRatio: '16:9',
          resolution: '1080p',
          tags: 'marketing',
          thumbnail: 'url2',
          templateData: JSON.stringify({ style: 'dynamic', music: 'energetic' }),
        },
      ];

      (prisma.template.findMany as jest.Mock).mockResolvedValue(mockTemplates);
      (prisma.template.create as jest.Mock).mockResolvedValue({
        id: 'remix_1',
        name: 'Template 1 + Template 2 Remix',
      });

      const request = new NextRequest('http://localhost:3000/api/templates/remix', {
        method: 'POST',
        body: JSON.stringify({
          templateIds: ['template_1', 'template_2'],
          blendMode: 'balanced',
        }),
      });

      const response = await POSTRemix(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.template.create).toHaveBeenCalled();
    });

    it('should require at least 2 templates to remix', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates/remix', {
        method: 'POST',
        body: JSON.stringify({
          templateIds: ['template_1'],
          blendMode: 'balanced',
        }),
      });

      const response = await POSTRemix(request);

      expect(response.status).toBe(400);
    });
  });
});

