import { createRedisClient } from '../server/redis-config';
// Production Redis client with advanced features
class ProductionRedis {
    redis;
    isConnected = false;
    constructor() {
        this.redis = createRedisClient();
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.redis.on('connect', () => {
            this.isConnected = true;
            console.log('✅ Production Redis connected');
        });
        this.redis.on('error', (error) => {
            this.isConnected = false;
            console.error('❌ Production Redis error:', error);
        });
        this.redis.on('close', () => {
            this.isConnected = false;
            console.log('🔌 Production Redis disconnected');
        });
    }
    // Health check
    async healthCheck() {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    // Room management with TTL and cleanup
    async createRoom(roomId, metadata) {
        const roomData = {
            id: roomId,
            ...metadata,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        await this.redis.hset(`room:${roomId}`, roomData);
        await this.redis.expire(`room:${roomId}`, 86400); // 24 hours
    }
    async getRoom(roomId) {
        const roomData = await this.redis.hgetall(`room:${roomId}`);
        return Object.keys(roomData).length > 0 ? roomData : null;
    }
    async updateRoomActivity(roomId) {
        await this.redis.hset(`room:${roomId}`, 'lastActivity', Date.now());
    }
    // User management with presence tracking
    async addUserToRoom(roomId, user) {
        const userData = {
            ...user,
            joinedAt: Date.now(),
            lastSeen: Date.now()
        };
        await this.redis.sadd(`room:${roomId}:users`, JSON.stringify(userData));
        await this.redis.expire(`room:${roomId}:users`, 86400);
        // Update room activity
        await this.updateRoomActivity(roomId);
    }
    async removeUserFromRoom(roomId, userId) {
        const users = await this.redis.smembers(`room:${roomId}:users`);
        const userToRemove = users.find(u => {
            const userData = JSON.parse(u);
            return userData.id === userId;
        });
        if (userToRemove) {
            await this.redis.srem(`room:${roomId}:users`, userToRemove);
        }
    }
    async getRoomUsers(roomId) {
        const users = await this.redis.smembers(`room:${roomId}:users`);
        return users.map(user => JSON.parse(user));
    }
    // Edit management with versioning
    async saveEdit(roomId, edit, userId) {
        const editId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const editData = {
            id: editId,
            roomId,
            userId,
            edit,
            timestamp: Date.now(),
            version: await this.getNextVersion(roomId)
        };
        // Save edit
        await this.redis.rpush(`room:${roomId}:edits`, JSON.stringify(editData));
        await this.redis.expire(`room:${roomId}:edits`, 86400);
        // Update room activity
        await this.updateRoomActivity(roomId);
        return editId;
    }
    async getRecentEdits(roomId, limit = 10) {
        const edits = await this.redis.lrange(`room:${roomId}:edits`, -limit, -1);
        return edits.map(edit => JSON.parse(edit));
    }
    async getEditHistory(roomId, fromVersion, toVersion) {
        const edits = await this.redis.lrange(`room:${roomId}:edits`, 0, -1);
        const parsedEdits = edits.map(edit => JSON.parse(edit));
        return parsedEdits.filter(edit => edit.version >= fromVersion && edit.version <= toVersion);
    }
    // Message management with threading
    async saveMessage(roomId, message, userId, threadId) {
        const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const messageData = {
            id: messageId,
            roomId,
            userId,
            message,
            threadId: threadId || null,
            timestamp: Date.now(),
            edited: false,
            deleted: false
        };
        const key = threadId ? `room:${roomId}:thread:${threadId}:messages` : `room:${roomId}:messages`;
        await this.redis.rpush(key, JSON.stringify(messageData));
        await this.redis.expire(key, 86400);
        // Update room activity
        await this.updateRoomActivity(roomId);
        return messageId;
    }
    async getRecentMessages(roomId, limit = 10, threadId) {
        const key = threadId ? `room:${roomId}:thread:${threadId}:messages` : `room:${roomId}:messages`;
        const messages = await this.redis.lrange(key, -limit, -1);
        return messages.map(msg => JSON.parse(msg));
    }
    // Video state management
    async saveVideoState(roomId, state) {
        const stateData = {
            ...state,
            timestamp: Date.now(),
            roomId
        };
        await this.redis.set(`room:${roomId}:video-state`, JSON.stringify(stateData));
        await this.redis.expire(`room:${roomId}:video-state`, 86400);
    }
    async getVideoState(roomId) {
        const state = await this.redis.get(`room:${roomId}:video-state`);
        return state ? JSON.parse(state) : null;
    }
    // Analytics and metrics
    async trackEvent(event, data) {
        const eventData = {
            event,
            data,
            timestamp: Date.now()
        };
        await this.redis.lpush('analytics:events', JSON.stringify(eventData));
        await this.redis.ltrim('analytics:events', 0, 9999); // Keep last 10k events
    }
    async getAnalytics(roomId) {
        const events = await this.redis.lrange('analytics:events', 0, -1);
        const parsedEvents = events.map(event => JSON.parse(event));
        if (roomId) {
            return parsedEvents.filter(event => event.data.roomId === roomId);
        }
        return parsedEvents;
    }
    // Rate limiting
    async checkRateLimit(key, limit, window) {
        const current = await this.redis.incr(`rate_limit:${key}`);
        if (current === 1) {
            await this.redis.expire(`rate_limit:${key}`, window);
        }
        return current <= limit;
    }
    // Cleanup and maintenance
    async cleanupExpiredRooms() {
        const pattern = 'room:*';
        const keys = await this.redis.keys(pattern);
        for (const key of keys) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1) {
                // Key exists but has no expiration, set one
                await this.redis.expire(key, 86400);
            }
        }
    }
    async getRoomStats(roomId) {
        const [users, edits, messages] = await Promise.all([
            this.redis.scard(`room:${roomId}:users`),
            this.redis.llen(`room:${roomId}:edits`),
            this.redis.llen(`room:${roomId}:messages`)
        ]);
        return { users, edits, messages };
    }
    // Private helper methods
    async getNextVersion(roomId) {
        return await this.redis.incr(`room:${roomId}:version`);
    }
    // Connection management
    async disconnect() {
        await this.redis.disconnect();
    }
    getConnectionStatus() {
        return this.isConnected;
    }
}
export default ProductionRedis;
