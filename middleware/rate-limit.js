import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 req/min
    prefix: '@upstash/ratelimit',
});
export async function rateLimit(request) {
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success, limit, remaining, reset } = await ratelimit.limit(ip);
    return { success, limit, remaining, reset };
}
// Apply in next.config.js or per-route
