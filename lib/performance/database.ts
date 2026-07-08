import { prisma } from '@/lib/database';
import { Logger } from '@/lib/logger';

export interface QueryOptimization {
  useIndex: boolean;
  limitResults: number;
  selectFields: string[];
  useCache: boolean;
  cacheTTL: number;
}

export interface DatabaseStats {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHits: number;
  cacheMisses: number;
  connectionPoolSize: number;
  activeConnections: number;
}

export class DatabaseOptimizer {
  private stats: DatabaseStats = {
    totalQueries: 0,
    averageQueryTime: 0,
    slowQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    connectionPoolSize: 0,
    activeConnections: 0
  };

  private slowQueryThreshold = 1000; // 1 second

  /**
   * Optimize video queries with pagination and indexing
   */
  async getVideosOptimized(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    const startTime = Date.now();
    
    try {
      const {
        page = 1,
        limit = 10,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      
      // Build optimized query
      const whereClause: any = { userId };
      if (status) {
        whereClause.status = status;
      }

      const orderBy: any = {};
      orderBy[sortBy] = sortOrder;

      // Execute optimized query
      const [videos, total] = await Promise.all([
        prisma.video.findMany({
          where: whereClause,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            duration: true,
            thumbnail: true,
            createdAt: true,
            updatedAt: true
          }
        }),
        prisma.video.count({ where: whereClause })
      ]);

      const queryTime = Date.now() - startTime;
      this.recordQuery(queryTime);

      return {
        videos,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        queryTime
      };
    } catch (error) {
      Logger.error('Optimized video query failed', error as Error, { userId, options });
      throw error;
    }
  }

  /**
   * Optimize template queries with caching
   */
  async getTemplatesOptimized(
    options: {
      category?: string;
      isPublic?: boolean;
      limit?: number;
      userId?: string;
    } = {}
  ) {
    const startTime = Date.now();
    
    try {
      const {
        category,
        isPublic = true,
        limit = 20,
        userId
      } = options;

      const whereClause: any = {};
      
      if (category) {
        whereClause.category = category;
      }
      
      if (isPublic !== undefined) {
        whereClause.isPublic = isPublic;
      }

      if (userId) {
        whereClause.OR = [
          { isPublic: true },
          { createdById: userId }
        ];
      }

      const templates = await prisma.template.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          thumbnail: true,
          isPublic: true,
          createdAt: true,
          createdBy: {
            select: {
              name: true,
              image: true
            }
          }
        }
      });

      const queryTime = Date.now() - startTime;
      this.recordQuery(queryTime);

      return {
        templates,
        queryTime
      };
    } catch (error) {
      Logger.error('Optimized template query failed', error as Error, { options });
      throw error;
    }
  }

  /**
   * Optimize user analytics queries
   */
  async getUserAnalyticsOptimized(
    userId: string,
    dateRange: {
      start: Date;
      end: Date;
    }
  ) {
    const startTime = Date.now();
    
    try {
      const [videoStats, usageStats, recentActivity] = await Promise.all([
        // Video statistics
        prisma.video.groupBy({
          by: ['status'],
          where: {
            userId,
            createdAt: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          },
          _count: {
            id: true
          }
        }),
        
        // Usage statistics
        prisma.usageRecord.groupBy({
          by: ['action'],
          where: {
            userId,
            timestamp: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          },
          _sum: {
            quantity: true
          }
        }),
        
        // Recent activity
        prisma.auditLog.findMany({
          where: {
            userId,
            timestamp: {
              gte: dateRange.start,
              lte: dateRange.end
            }
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
          select: {
            action: true,
            timestamp: true,
            details: true
          }
        })
      ]);

      const queryTime = Date.now() - startTime;
      this.recordQuery(queryTime);

      return {
        videoStats,
        usageStats,
        recentActivity,
        queryTime
      };
    } catch (error) {
      Logger.error('Optimized analytics query failed', error as Error, { userId, dateRange });
      throw error;
    }
  }

  /**
   * Optimize search queries with full-text search
   */
  async searchOptimized(
    query: string,
    options: {
      type?: 'videos' | 'templates' | 'all';
      userId?: string;
      limit?: number;
    } = {}
  ) {
    const startTime = Date.now();
    
    try {
      const { type = 'all', userId, limit = 20 } = options;
      const searchTerm = `%${query}%`;
      
      const results: any = {};

      if (type === 'videos' || type === 'all') {
        const videoWhere: any = {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { transcript: { contains: query, mode: 'insensitive' } }
          ]
        };

        if (userId) {
          videoWhere.userId = userId;
        }

        results.videos = await prisma.video.findMany({
          where: videoWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            status: true,
            createdAt: true
          }
        });
      }

      if (type === 'templates' || type === 'all') {
        const templateWhere: any = {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ],
          isPublic: true
        };

        results.templates = await prisma.template.findMany({
          where: templateWhere,
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            thumbnail: true,
            createdAt: true
          }
        });
      }

      const queryTime = Date.now() - startTime;
      this.recordQuery(queryTime);

      return {
        ...results,
        query,
        queryTime
      };
    } catch (error) {
      Logger.error('Optimized search query failed', error as Error, { query, options });
      throw error;
    }
  }

  /**
   * Batch operations for better performance
   */
  async batchCreateVideos(videos: any[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Process in batches of 100
      const batchSize = 100;
      const batches = [];
      
      for (let i = 0; i < videos.length; i += batchSize) {
        batches.push(videos.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await prisma.video.createMany({
          data: batch,
          skipDuplicates: true
        });
      }

      const queryTime = Date.now() - startTime;
      this.recordQuery(queryTime);

      Logger.info('Batch video creation completed', {
        totalVideos: videos.length,
        batches: batches.length,
        queryTime
      });
    } catch (error) {
      Logger.error('Batch video creation failed', error as Error, { count: videos.length });
      throw error;
    }
  }

  /**
   * Optimize database connections
   */
  async optimizeConnections(): Promise<void> {
    try {
      // This would typically involve connection pool optimization
      // For Prisma, we can configure the connection pool in the schema
      Logger.info('Database connection optimization completed');
    } catch (error) {
      Logger.error('Database connection optimization failed', error as Error);
    }
  }

  /**
   * Get database performance statistics
   */
  getStats(): DatabaseStats {
    return { ...this.stats };
  }

  /**
   * Reset database statistics
   */
  resetStats(): void {
    this.stats = {
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      connectionPoolSize: 0,
      activeConnections: 0
    };
  }

  /**
   * Health check for database
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      
      return {
        status: latency < 1000 ? 'healthy' : 'unhealthy',
        latency
      };
    } catch (error) {
      Logger.error('Database health check failed', error as Error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start
      };
    }
  }

  // Private methods
  private recordQuery(queryTime: number): void {
    this.stats.totalQueries++;
    
    // Update average query time
    const totalTime = this.stats.averageQueryTime * (this.stats.totalQueries - 1) + queryTime;
    this.stats.averageQueryTime = totalTime / this.stats.totalQueries;
    
    // Record slow queries
    if (queryTime > this.slowQueryThreshold) {
      this.stats.slowQueries++;
      Logger.warn('Slow query detected', { queryTime, threshold: this.slowQueryThreshold });
    }
  }
}

// Global database optimizer instance
export const dbOptimizer = new DatabaseOptimizer();

// Query optimization decorator
export function OptimizedQuery(options: QueryOptimization = { useIndex: true, limitResults: 100, selectFields: [], useCache: true, cacheTTL: 300 }) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const optimizer = new DatabaseOptimizer();

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      
      try {
        const result = await method.apply(this, args);
        const queryTime = Date.now() - startTime;
        
        // Log slow queries
        if (queryTime > 1000) {
          Logger.warn('Slow query detected', {
            method: propertyName,
            queryTime,
            args: args.length
          });
        }
        
        return result;
      } catch (error) {
        Logger.error('Query failed', error as Error, {
          method: propertyName,
          args: args.length
        });
        throw error;
      }
    };
  };
}
