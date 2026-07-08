import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('close', () => {
  console.log('🔌 Redis connection closed');
});

// Helper functions for collaboration data
export const CollaborationRedis = {
  // Room management
  async addUserToRoom(roomId: string, user: any): Promise<void> {
    await redisSelfHeal(async () => {
      await redis.sadd(`room:${roomId}:users`, JSON.stringify(user));
      await redis.expire(`room:${roomId}:users`, 86400); // 24 hours
    }, 'addUserToRoom');
  },

  async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
    await redisSelfHeal(async () => {
      const users = await redis.smembers(`room:${roomId}:users`);
      const userToRemove = users.find(u => {
        const userData = JSON.parse(u);
        return userData.id === userId;
      });
      if (userToRemove) {
        await redis.srem(`room:${roomId}:users`, userToRemove);
      }
    }, 'removeUserFromRoom');
  },

  async getRoomUsers(roomId: string): Promise<any[]> {
    return await redisSelfHeal(async () => {
      const users = await redis.smembers(`room:${roomId}:users`);
      return users.map(user => JSON.parse(user));
    }, 'getRoomUsers');
  },

  // Edit management
  async saveEdit(roomId: string, edit: any, userId: string): Promise<void> {
    await redisSelfHeal(async () => {
      const editData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        userId,
        edit,
        timestamp: Date.now()
      };
      await redis.rpush(`room:${roomId}:edits`, JSON.stringify(editData));
      await redis.expire(`room:${roomId}:edits`, 86400); // 24 hours
    }, 'saveEdit');
  },

  async getRecentEdits(roomId: string, limit: number = 10): Promise<any[]> {
    return await redisSelfHeal(async () => {
      const edits = await redis.lrange(`room:${roomId}:edits`, -limit, -1);
      return edits.map(edit => JSON.parse(edit));
    }, 'getRecentEdits');
  },

  // Message management
  async saveMessage(roomId: string, message: any, userId: string): Promise<void> {
    await redisSelfHeal(async () => {
      const messageData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        roomId,
        userId,
        message,
        timestamp: Date.now()
      };
      await redis.rpush(`room:${roomId}:messages`, JSON.stringify(messageData));
      await redis.expire(`room:${roomId}:messages`, 86400); // 24 hours
    }, 'saveMessage');
  },

  async getRecentMessages(roomId: string, limit: number = 10): Promise<any[]> {
    return await redisSelfHeal(async () => {
      const messages = await redis.lrange(`room:${roomId}:messages`, -limit, -1);
      return messages.map(msg => JSON.parse(msg));
    }, 'getRecentMessages');
  },

  // Room state management
  async saveRoomState(roomId: string, state: any): Promise<void> {
    await redisSelfHeal(async () => {
      await redis.set(`room:${roomId}:state`, JSON.stringify(state));
      await redis.expire(`room:${roomId}:state`, 86400); // 24 hours
    }, 'saveRoomState');
  },

  async getRoomState(roomId: string): Promise<any> {
    return await redisSelfHeal(async () => {
      const state = await redis.get(`room:${roomId}:state`);
      return state ? JSON.parse(state) : null;
    }, 'getRoomState');
  },

  // Cleanup
  async cleanupRoom(roomId: string): Promise<void> {
    await redisSelfHeal(async () => {
      await redis.del(`room:${roomId}:users`);
      await redis.del(`room:${roomId}:edits`);
      await redis.del(`room:${roomId}:messages`);
      await redis.del(`room:${roomId}:state`);
    }, 'cleanupRoom');
  }
};

// Self-healing wrapper for Redis operations
async function redisSelfHeal<T>(fn: () => Promise<T>, opName: string, maxRetries: number = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      console.warn(`[Redis][${opName}] Attempt ${attempt} failed:`, err);
      // Basic circuit breaker: if connection error, try reconnect
      if (err?.message?.includes('ECONNREFUSED') || err?.message?.includes('ETIMEDOUT')) {
        try {
          await redis.connect();
        } catch (reconnectErr) {
          console.error(`[Redis][${opName}] Reconnect failed:`, reconnectErr);
        }
      }
      await new Promise(res => setTimeout(res, 100 * attempt));
    }
  }
  console.error(`[Redis][${opName}] All ${maxRetries} attempts failed. Last error:`, lastError);
  // Optionally: send alert to Sentry/Winston here
  throw lastError;
}

export default redis;
