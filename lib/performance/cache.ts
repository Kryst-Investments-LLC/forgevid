import { Redis } from '@upstash/redis';
import { Logger } from '@/lib/logger';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  namespace: string;
  serialize?: boolean;
  compress?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage: number;
}

export class PerformanceCache {
  private redis: Redis;
  private stats: Map<string, CacheStats> = new Map();
  private defaultTTL = 3600; // 1 hour

  constructor() {
    this.redis = Redis.fromEnv();
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, config?: Partial<CacheConfig>): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, config?.namespace);
      const value = await this.redis.get(fullKey);
      
      if (value === null) {
        this.recordMiss(key);
        return null;
      }

      this.recordHit(key);
      
      if (config?.serialize !== false) {
        return JSON.parse(value as string);
      }
      
      return value as T;
    } catch (error) {
      Logger.error('Cache get error', error as Error, { key });
      this.recordMiss(key);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, config?: Partial<CacheConfig>): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, config?.namespace);
      const ttl = config?.ttl || this.defaultTTL;
      
      let serializedValue: string;
      if (config?.serialize !== false) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = value as string;
      }

      // Compress if enabled
      if (config?.compress) {
        // In a real implementation, you'd use compression here
        // For now, we'll just use the serialized value
      }

      await this.redis.setex(fullKey, ttl, serializedValue);
      this.recordSet(key);
      return true;
    } catch (error) {
      Logger.error('Cache set error', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      await this.redis.del(fullKey);
      this.recordDelete(key);
      return true;
    } catch (error) {
      Logger.error('Cache delete error', error as Error, { key });
      return false;
    }
  }

  /**
   * Get or set pattern - get from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    const cached = await this.get<T>(key, config);
    if (cached !== null) {
      return cached;
    }

    const value = await computeFn();
    await this.set(key, value, config);
    return value;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      return deleted;
    } catch (error) {
      Logger.error('Cache pattern invalidation error', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(namespace?: string): CacheStats {
    const key = namespace || 'default';
    const stats = this.stats.get(key) || {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      memoryUsage: 0
    };

    stats.hitRate = stats.hits / (stats.hits + stats.misses) || 0;
    return stats;
  }

  /**
   * Clear all cache statistics
   */
  clearStats(): void {
    this.stats.clear();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(): Promise<void> {
    Logger.info('Starting cache warm-up');

    try {
      // Warm up user sessions
      await this.warmUpUserSessions();
      
      // Warm up templates
      await this.warmUpTemplates();
      
      // Warm up system configuration
      await this.warmUpSystemConfig();
      
      Logger.info('Cache warm-up completed');
    } catch (error) {
      Logger.error('Cache warm-up failed', error as Error);
    }
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    
    try {
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: latency < 100 ? 'healthy' : 'unhealthy',
        latency
      };
    } catch (error) {
      Logger.error('Cache health check failed', error as Error);
      return {
        status: 'unhealthy',
        latency: Date.now() - start
      };
    }
  }

  // Private methods
  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || 'default';
    return `forgevid:${ns}:${key}`;
  }

  private recordHit(key: string): void {
    const stats = this.getOrCreateStats(key);
    stats.hits++;
  }

  private recordMiss(key: string): void {
    const stats = this.getOrCreateStats(key);
    stats.misses++;
  }

  private recordSet(key: string): void {
    const stats = this.getOrCreateStats(key);
    stats.sets++;
  }

  private recordDelete(key: string): void {
    const stats = this.getOrCreateStats(key);
    stats.deletes++;
  }

  private getOrCreateStats(key: string): CacheStats {
    const namespace = this.extractNamespace(key);
    if (!this.stats.has(namespace)) {
      this.stats.set(namespace, {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        memoryUsage: 0
      });
    }
    return this.stats.get(namespace)!;
  }

  private extractNamespace(key: string): string {
    const parts = key.split(':');
    return parts[1] || 'default';
  }

  // Warm-up methods
  private async warmUpUserSessions(): Promise<void> {
    // This would typically fetch active user sessions
    // For now, we'll just set a placeholder
    await this.set('active_sessions', [], {
      namespace: 'sessions',
      ttl: 1800 // 30 minutes
    });
  }

  private async warmUpTemplates(): Promise<void> {
    // This would typically fetch popular templates
    // For now, we'll just set a placeholder
    await this.set('popular_templates', [], {
      namespace: 'templates',
      ttl: 3600 // 1 hour
    });
  }

  private async warmUpSystemConfig(): Promise<void> {
    // This would typically fetch system configuration
    // For now, we'll just set a placeholder
    await this.set('system_config', {}, {
      namespace: 'config',
      ttl: 7200 // 2 hours
    });
  }
}

// Cache decorators for easy use
export function Cacheable(config?: Partial<CacheConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = new PerformanceCache();

    descriptor.value = async function (...args: any[]) {
      const key = `${propertyName}:${JSON.stringify(args)}`;
      
      return cache.getOrSet(key, () => method.apply(this, args), config);
    };
  };
}

export function CacheInvalidate(pattern: string, namespace?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = new PerformanceCache();

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);
      await cache.invalidatePattern(pattern, namespace);
      return result;
    };
  };
}

// Global cache instance
export const cache = new PerformanceCache();





