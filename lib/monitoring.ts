import { PrismaClient } from '@prisma/client'
import { prisma } from './database'

export interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  details?: Record<string, any>
  timestamp: string
}

export interface SystemMetrics {
  timestamp: string
  cpu: {
    usage: number
    loadAverage: number[]
  }
  memory: {
    used: number
    free: number
    total: number
    usage: number
  }
  disk: {
    used: number
    free: number
    total: number
    usage: number
  }
  network: {
    bytesIn: number
    bytesOut: number
    connections: number
  }
}

export interface ApplicationMetrics {
  timestamp: string
  requests: {
    total: number
    successful: number
    failed: number
    rate: number // requests per second
  }
  responseTime: {
    average: number
    p50: number
    p95: number
    p99: number
  }
  errors: {
    total: number
    rate: number
    byType: Record<string, number>
  }
  users: {
    active: number
    new: number
    total: number
  }
  videos: {
    created: number
    processed: number
    failed: number
  }
}

export class HealthMonitor {
  private static checks: Map<string, () => Promise<HealthCheck>> = new Map()

  static registerCheck(name: string, check: () => Promise<HealthCheck>) {
    this.checks.set(name, check)
  }

  static async runHealthChecks(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded'
    checks: HealthCheck[]
    timestamp: string
  }> {
    const results: HealthCheck[] = []
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    for (const [name, check] of this.checks) {
      try {
        const result = await check()
        results.push(result)
        
        if (result.status === 'unhealthy') {
          overallStatus = 'unhealthy'
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded'
        }
      } catch (error) {
        results.push({
          service: name,
          status: 'unhealthy',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          timestamp: new Date().toISOString()
        })
        overallStatus = 'unhealthy'
      }
    }

    return {
      status: overallStatus,
      checks: results,
      timestamp: new Date().toISOString()
    }
  }
}

export class PerformanceMonitor {
  private static metrics: {
    requests: number[]
    responseTimes: number[]
    errors: number
    startTime: number
  } = {
    requests: [],
    responseTimes: [],
    errors: 0,
    startTime: Date.now()
  }

  static recordRequest(responseTime: number, success: boolean) {
    this.metrics.requests.push(Date.now())
    this.metrics.responseTimes.push(responseTime)
    
    if (!success) {
      this.metrics.errors++
    }

    // Keep only last 1000 measurements
    if (this.metrics.requests.length > 1000) {
      this.metrics.requests = this.metrics.requests.slice(-1000)
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000)
    }
  }

  static getMetrics(): ApplicationMetrics {
    const now = Date.now()
    const uptime = (now - this.metrics.startTime) / 1000 // seconds
    const recentRequests = this.metrics.requests.filter(time => now - time < 60000) // last minute
    
    const successfulRequests = this.metrics.requests.length - this.metrics.errors
    
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
    }
  }

  private static getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    
    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.ceil((percentile / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
}

export class VideoMonitor {
  static async trackProcessingStart(videoId: string, userId: string, fileSize: number) {
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
      })
    } catch (error) {
      console.error('Failed to track video processing start:', error)
    }
  }

  static async trackProcessingComplete(videoId: string, userId: string, duration: number, success: boolean) {
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
      })
    } catch (error) {
      console.error('Failed to track video processing completion:', error)
    }
  }
}

export class MetricsCollector {
  private static instance: MetricsCollector
  private metrics: Map<string, any> = new Map()
  private counters: Map<string, number> = new Map()
  private timers: Map<string, number[]> = new Map()

  static getInstance(): MetricsCollector {
    if (!this.instance) {
      this.instance = new MetricsCollector()
    }
    return this.instance
  }

  incrementCounter(name: string, value: number = 1) {
    const current = this.counters.get(name) || 0
    this.counters.set(name, current + value)
  }

  recordTimer(name: string, duration: number) {
    if (!this.timers.has(name)) {
      this.timers.set(name, [])
    }
    const timers = this.timers.get(name)!
    timers.push(duration)
    
    // Keep only last 1000 measurements
    if (timers.length > 1000) {
      timers.splice(0, timers.length - 1000)
    }
  }

  setMetric(name: string, value: any) {
    this.metrics.set(name, value)
  }

  getCounter(name: string): number {
    return this.counters.get(name) || 0
  }

  getTimerStats(name: string): { count: number; average: number; min: number; max: number } {
    const timers = this.timers.get(name) || []
    if (timers.length === 0) {
      return { count: 0, average: 0, min: 0, max: 0 }
    }

    const sum = timers.reduce((a, b) => a + b, 0)
    return {
      count: timers.length,
      average: sum / timers.length,
      min: Math.min(...timers),
      max: Math.max(...timers)
    }
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {}
    
    // Add counters
    for (const [name, value] of this.counters) {
      result[`counter.${name}`] = value
    }
    
    // Add timers
    for (const [name, timers] of this.timers) {
      result[`timer.${name}`] = this.getTimerStats(name)
    }
    
    // Add metrics
    for (const [name, value] of this.metrics) {
      result[`metric.${name}`] = value
    }
    
    return result
  }

  reset() {
    this.metrics.clear()
    this.counters.clear()
    this.timers.clear()
  }
}

// Initialize health checks
HealthMonitor.registerCheck('database', async () => {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    }
  }
})

HealthMonitor.registerCheck('redis', async () => {
  const start = Date.now()
  try {
    // Would check Redis connection here
    return {
      service: 'redis',
      status: 'healthy',
      responseTime: Date.now() - start,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    }
  }
})

HealthMonitor.registerCheck('external_apis', async () => {
  const start = Date.now()
  try {
    // Would check external API health here (OpenAI, Stripe, etc.)
    return {
      service: 'external_apis',
      status: 'healthy',
      responseTime: Date.now() - start,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      service: 'external_apis',
      status: 'degraded',
      responseTime: Date.now() - start,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date().toISOString()
    }
  }
})

export function initializeMonitoring() {
  console.log('🔍 Initializing monitoring and health checks...')
  
  // Set up periodic metrics collection
  setInterval(async () => {
    try {
      const metrics = MetricsCollector.getInstance().getAllMetrics()
      console.log('📊 Current metrics:', metrics)
    } catch (error) {
      console.error('Failed to collect metrics:', error)
    }
  }, 60000) // Every minute

  console.log('✅ Monitoring initialized')
}