import { NextResponse } from "next/server"
import { HealthMonitor, PerformanceMonitor, MetricsCollector } from '@/lib/monitoring'
import { checkDatabaseConnection } from '@/lib/database'

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Run health checks
    const healthStatus = await HealthMonitor.runHealthChecks()
    
    // Get performance metrics
    const performanceMetrics = PerformanceMonitor.getMetrics()
    
    // Get custom metrics
    const customMetrics = MetricsCollector.getInstance().getAllMetrics()
    
    // Get database connection status
    const dbConnected = await checkDatabaseConnection()
    
    // Get system information
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      nodeEnv: process.env.NODE_ENV,
      pid: process.pid,
      cpuUsage: process.cpuUsage()
    }

    // Determine overall status
    const overallStatus = healthStatus.status === 'healthy' && dbConnected ? 'healthy' : 'unhealthy'
    const responseTime = Date.now() - startTime

    // Record this health check
    PerformanceMonitor.recordRequest(responseTime, overallStatus === 'healthy')

    const results = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      health: healthStatus,
      performance: performanceMetrics,
      metrics: customMetrics,
      system: systemInfo,
      database: {
        connected: dbConnected
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("[HEALTH CHECK ERROR]", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}