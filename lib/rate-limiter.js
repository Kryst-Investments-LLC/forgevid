import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
const redis = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
const rateLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl',
    points: 10, // Number of requests
    duration: 60, // Per 60 seconds
});
export async function checkRateLimit(key) {
    try {
        const result = await rateLimiter.consume(key);
        return {
            allowed: true,
            remaining: result.remainingPoints,
        };
    }
    catch (rejRes) {
        return {
            allowed: false,
            remaining: 0,
        };
    }
}
export { rateLimiter };
