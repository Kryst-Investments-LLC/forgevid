interface LogEntry {
  timestamp: number
  requestId: string
  method: string
  path: string
  userAgent?: string
  ip: string
  userId?: string
  responseTime: number
  statusCode: number
  errorMessage?: string
  traceId: string
}

export class APILogger {
  private logs: LogEntry[] = []
  private maxLogs = 10000

  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  logRequest(entry: Omit<LogEntry, "timestamp">): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: Date.now(),
    }

    this.logs.push(logEntry)

    // Keep only recent logs in memory
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log to console for development
    console.log(
      `[API] ${entry.method} ${entry.path} - ${entry.statusCode} (${entry.responseTime}ms) [${entry.traceId}]`,
    )

    // In production, send to logging service (e.g., DataDog, New Relic)
    this.sendToLoggingService(logEntry)
  }

  private async sendToLoggingService(entry: LogEntry): Promise<void> {
    // Mock implementation - replace with actual logging service
    if (process.env.NODE_ENV === "production") {
      try {
        // await fetch('https://logs.datadoghq.com/v1/input/API_KEY', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(entry)
        // })
      } catch (error) {
        console.error("Failed to send log to service:", error)
      }
    }
  }

  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit)
  }

  getLogsByTraceId(traceId: string): LogEntry[] {
    return this.logs.filter((log) => log.traceId === traceId)
  }

  getErrorLogs(since?: number): LogEntry[] {
    const sinceTime = since || Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
    return this.logs.filter((log) => log.timestamp >= sinceTime && (log.statusCode >= 400 || log.errorMessage))
  }

  getMetrics(since?: number): {
    totalRequests: number
    averageResponseTime: number
    errorRate: number
    requestsByEndpoint: Record<string, number>
    statusCodeDistribution: Record<number, number>
  } {
    const sinceTime = since || Date.now() - 60 * 60 * 1000 // Last hour
    const recentLogs = this.logs.filter((log) => log.timestamp >= sinceTime)

    const totalRequests = recentLogs.length
    const averageResponseTime = recentLogs.reduce((sum, log) => sum + log.responseTime, 0) / totalRequests || 0
    const errorCount = recentLogs.filter((log) => log.statusCode >= 400).length
    const errorRate = (errorCount / totalRequests) * 100 || 0

    const requestsByEndpoint: Record<string, number> = {}
    const statusCodeDistribution: Record<number, number> = {}

    recentLogs.forEach((log) => {
      const endpoint = `${log.method} ${log.path}`
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1
      statusCodeDistribution[log.statusCode] = (statusCodeDistribution[log.statusCode] || 0) + 1
    })

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      requestsByEndpoint,
      statusCodeDistribution,
    }
  }
}

export const apiLogger = new APILogger()
