import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export async function initializeCache() {
  if (!redis.isOpen) {
    await redis.connect();
  }
  return redis;
}

export class CacheManager {
  private redis: typeof redis;

  constructor() {
    this.redis = redis;
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setEx(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async flush(): Promise<void> {
    await this.redis.flushAll();
  }
}

export { redis };