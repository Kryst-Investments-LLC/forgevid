import { prisma } from './database';
export class HealthMonitor {
    static checks = new Map();
    static registerCheck(name, check) {
        this.checks.set(name, check);
    }
    static async runHealthChecks() {
        const results = [];
        let overallStatus = 'healthy';
        for (const [name, check] of this.checks) {
            try {
                const result = await check();
                results.push(result);
                if (result.status === 'unhealthy') {
                    overallStatus = 'unhealthy';
                }
                else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                results.push({
                    service: name,
                    status: 'unhealthy',
                    details: { error: error instanceof Error ? error.message : 'Unknown error' },
                    timestamp: new Date().toISOString()
                });
                overallStatus = 'unhealthy';
            }
        }
        return {
            status: overallStatus,
            checks: results,
            timestamp: new Date().toISOString()
        };
    }
}
export class PerformanceMonitor {
    static metrics = {
        requests: [],
        responseTimes: [],
        errors: 0,
        startTime: Date.now()
    };
    static recordRequest(responseTime, success) {
        this.metrics.requests.push(Date.now());
        this.metrics.responseTimes.push(responseTime);
        if (!success) {
            this.metrics.errors++;
        }
        // Keep only last 1000 measurements
        if (this.metrics.requests.length > 1000) {
            this.metrics.requests = this.metrics.requests.slice(-1000);
            this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
        }
    }
    static getMetrics() {
        const now = Date.now();
        const uptime = (now - this.metrics.startTime) / 1000; // seconds
        const recentRequests = this.metrics.requests.filter(time => now - time < 60000); // last minute
        const successfulRequests = this.metrics.requests.length - this.metrics.errors;
        return {
            timestamp: new Date().toISOString(),
            requests: {
                total: this.metrics.requests.length,
                successful: successfulRequests,
                failed: this.metrics.errors,
                rate: recentRequests.length / 60 // requests per second
            },
            responseTime: {
                average: this.metrics.responseTimes.length > 0
                    ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
                    : 0,
                p50: this.getPercentile(this.metrics.responseTimes, 50),
                p95: this.getPercentile(this.metrics.responseTimes, 95),
                p99: this.getPercentile(this.metrics.responseTimes, 99)
            },
            errors: {
                total: this.metrics.errors,
                rate: this.metrics.errors / uptime,
                byType: {} // Would be populated by error tracking
            },
            users: {
                active: 0, // Would be calculated from recent activity
                new: 0, // Would be calculated from user creation
                total: 0 // Would be fetched from database
            },
            videos: {
                created: 0, // Would be calculated from video creation
                processed: 0, // Would be calculated from processing completion
                failed: 0 // Would be calculated from processing failures
            }
        };
    }
    static getPercentile(values, percentile) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
}
export class VideoMonitor {
    static async trackProcessingStart(videoId, userId, fileSize) {
        try {
            await prisma.usageRecord.create({
                data: {
                    userId,
                    action: 'video_processing_started',
                    metadata: JSON.stringify({
                        videoId,
                        fileSize,
                        timestamp: new Date().toISOString()
                    })
                }
            });
        }
        catch (error) {
            console.error('Failed to track video processing start:', error);
        }
    }
    static async trackProcessingComplete(videoId, userId, duration, success) {
        try {
            await prisma.usageRecord.create({
                data: {
                    userId,
                    action: success ? 'video_processing_completed' : 'video_processing_failed',
                    metadata: JSON.stringify({
                        videoId,
                        duration,
                        timestamp: new Date().toISOString()
                    })
                }
            });
        }
        catch (error) {
            console.error('Failed to track video processing completion:', error);
        }
    }
}
export class MetricsCollector {
    static instance;
    metrics = new Map();
    counters = new Map();
    timers = new Map();
    static getInstance() {
        if (!this.instance) {
            this.instance = new MetricsCollector();
        }
        return this.instance;
    }
    incrementCounter(name, value = 1) {
        const current = this.counters.get(name) || 0;
        this.counters.set(name, current + value);
    }
    recordTimer(name, duration) {
        if (!this.timers.has(name)) {
            this.timers.set(name, []);
        }
        const timers = this.timers.get(name);
        timers.push(duration);
        // Keep only last 1000 measurements
        if (timers.length > 1000) {
            timers.splice(0, timers.length - 1000);
        }
    }
    setMetric(name, value) {
        this.metrics.set(name, value);
    }
    getCounter(name) {
        return this.counters.get(name) || 0;
    }
    getTimerStats(name) {
        const timers = this.timers.get(name) || [];
        if (timers.length === 0) {
            return { count: 0, average: 0, min: 0, max: 0 };
        }
        const sum = timers.reduce((a, b) => a + b, 0);
        return {
            count: timers.length,
            average: sum / timers.length,
            min: Math.min(...timers),
            max: Math.max(...timers)
        };
    }
    getAllMetrics() {
        const result = {};
        // Add counters
        for (const [name, value] of this.counters) {
            result[`counter.${name}`] = value;
        }
        // Add timers
        for (const [name, timers] of this.timers) {
            result[`timer.${name}`] = this.getTimerStats(name);
        }
        // Add metrics
        for (const [name, value] of this.metrics) {
            result[`metric.${name}`] = value;
        }
        return result;
    }
    reset() {
        this.metrics.clear();
        this.counters.clear();
        this.timers.clear();
    }
}
// Initialize health checks
HealthMonitor.registerCheck('database', async () => {
    const start = Date.now();
    try {
        await prisma.$queryRaw `SELECT 1`;
        return {
            service: 'database',
            status: 'healthy',
            responseTime: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            service: 'database',
            status: 'unhealthy',
            responseTime: Date.now() - start,
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: new Date().toISOString()
        };
    }
});
HealthMonitor.registerCheck('redis', async () => {
    const start = Date.now();
    try {
        // Would check Redis connection here
        return {
            service: 'redis',
            status: 'healthy',
            responseTime: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            service: 'redis',
            status: 'unhealthy',
            responseTime: Date.now() - start,
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: new Date().toISOString()
        };
    }
});
HealthMonitor.registerCheck('external_apis', async () => {
    const start = Date.now();
    try {
        // Would check external API health here (OpenAI, Stripe, etc.)
        return {
            service: 'external_apis',
            status: 'healthy',
            responseTime: Date.now() - start,
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        return {
            service: 'external_apis',
            status: 'degraded',
            responseTime: Date.now() - start,
            details: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: new Date().toISOString()
        };
    }
});
export function initializeMonitoring() {
    console.log('🔍 Initializing monitoring and health checks...');
    // Set up periodic metrics collection
    setInterval(async () => {
        try {
            const metrics = MetricsCollector.getInstance().getAllMetrics();
            console.log('📊 Current metrics:', metrics);
        }
        catch (error) {
            console.error('Failed to collect metrics:', error);
        }
    }, 60000); // Every minute
    console.log('✅ Monitoring initialized');
}
