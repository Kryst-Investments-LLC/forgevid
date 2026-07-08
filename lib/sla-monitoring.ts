interface SLATarget {
  name: string
  target: number // percentage (e.g., 99.9 for 99.9%)
  measurement: "uptime" | "response_time" | "error_rate"
  threshold?: number // for response_time (ms) or error_rate (%)
}

interface SLAMetric {
  timestamp: number
  value: number
  target: string
  status: "met" | "breached"
}

export class SLAMonitor {
  private static targets: Map<string, SLATarget> = new Map()
  private static metrics: SLAMetric[] = []
  private static alerts: Array<{
    id: string
    target: string
    timestamp: number
    severity: "warning" | "critical"
    message: string
    resolved: boolean
  }> = []

  static initialize() {
    // Define SLA targets
    this.targets.set("platform_uptime", {
      name: "Platform Uptime",
      target: 99.9, // 99.9% uptime
      measurement: "uptime",
    })

    this.targets.set("api_response_time", {
      name: "API Response Time",
      target: 95, // 95% of requests under threshold
      measurement: "response_time",
      threshold: 500, // 500ms
    })

    this.targets.set("video_processing_success", {
      name: "Video Processing Success Rate",
      target: 99.5, // 99.5% success rate
      measurement: "error_rate",
      threshold: 0.5, // 0.5% error rate
    })

    this.targets.set("ai_generation_uptime", {
      name: "AI Generation Service Uptime",
      target: 99.0, // 99.0% uptime
      measurement: "uptime",
    })

    console.log("[SLA] SLA Monitor initialized with targets:", Array.from(this.targets.keys()))
  }

  static recordMetric(targetName: string, value: number) {
    const target = this.targets.get(targetName)
    if (!target) {
      console.warn(`[SLA] Unknown SLA target: ${targetName}`)
      return
    }

    const status = this.evaluateMetric(target, value)
    const metric: SLAMetric = {
      timestamp: Date.now(),
      value,
      target: targetName,
      status,
    }

    this.metrics.push(metric)

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000)
    }

    // Check for SLA breaches
    if (status === "breached") {
      this.handleSLABreach(target, value)
    }

    // Send to monitoring system
    this.sendMetricToMonitoring(metric)
  }

  private static evaluateMetric(target: SLATarget, value: number): "met" | "breached" {
    switch (target.measurement) {
      case "uptime":
        return value >= target.target ? "met" : "breached"
      case "response_time":
        // For response time, value is the percentage of requests under threshold
        return value >= target.target ? "met" : "breached"
      case "error_rate":
        // For error rate, value is the actual error rate
        return value <= (target.threshold || 0) ? "met" : "breached"
      default:
        return "met"
    }
  }

  private static handleSLABreach(target: SLATarget, value: number) {
    const alertId = `sla_breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const alert = {
      id: alertId,
      target: target.name,
      timestamp: Date.now(),
      severity: this.determineSeverity(target, value),
      message: this.generateAlertMessage(target, value),
      resolved: false,
    }

    this.alerts.push(alert)
    console.error(`[SLA] SLA BREACH: ${alert.message}`)

    // Send immediate alert
    this.sendAlert(alert)

    // Trigger incident response if critical
    if (alert.severity === "critical") {
      this.triggerIncidentResponse(alert)
    }
  }

  private static determineSeverity(target: SLATarget, value: number): "warning" | "critical" {
    const deviation = Math.abs(value - target.target)

    // Critical if deviation is more than 1% from target
    if (deviation > 1.0) {
      return "critical"
    }

    return "warning"
  }

  private static generateAlertMessage(target: SLATarget, value: number): string {
    switch (target.measurement) {
      case "uptime":
        return `${target.name} is at ${value.toFixed(2)}% (target: ${target.target}%)`
      case "response_time":
        return `${target.name}: ${value.toFixed(2)}% of requests under ${target.threshold}ms (target: ${target.target}%)`
      case "error_rate":
        return `${target.name}: ${value.toFixed(2)}% error rate (target: ≤${target.threshold}%)`
      default:
        return `${target.name} SLA breach: ${value} (target: ${target.target})`
    }
  }

  private static async sendAlert(alert: any) {
    try {
      await fetch("/api/alerts/sla-breach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alert),
      })
    } catch (error) {
      console.error("[SLA] Failed to send SLA breach alert:", error)
    }
  }

  private static async triggerIncidentResponse(alert: any) {
    console.log(`[SLA] Triggering incident response for critical SLA breach: ${alert.id}`)

    try {
      // Create incident in incident management system
      await fetch("/api/incidents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Critical SLA Breach: ${alert.target}`,
          description: alert.message,
          severity: "critical",
          source: "sla_monitor",
          alertId: alert.id,
        }),
      })

      // Page on-call engineer
      await fetch("/api/alerts/page-oncall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `CRITICAL SLA BREACH: ${alert.message}`,
          alertId: alert.id,
        }),
      })
    } catch (error) {
      console.error("[SLA] Failed to trigger incident response:", error)
    }
  }

  private static async sendMetricToMonitoring(metric: SLAMetric) {
    try {
      await fetch("/api/monitoring/sla-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metric),
      })
    } catch (error) {
      console.warn("[SLA] Failed to send metric to monitoring:", error)
    }
  }

  static getSLAReport(period: "hour" | "day" | "week" | "month" = "day"): {
    target: string
    current: number
    target_value: number
    status: "met" | "at_risk" | "breached"
    trend: "improving" | "stable" | "degrading"
  }[] {
    const now = Date.now()
    const periodMs = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    }[period]

    const cutoff = now - periodMs
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoff)

    return Array.from(this.targets.entries()).map(([targetName, target]) => {
      const targetMetrics = recentMetrics.filter((m) => m.target === targetName)

      if (targetMetrics.length === 0) {
        return {
          target: target.name,
          current: 0,
          target_value: target.target,
          status: "breached" as const,
          trend: "stable" as const,
        }
      }

      // Calculate current performance
      const current = this.calculateCurrentPerformance(target, targetMetrics)

      // Determine status
      let status: "met" | "at_risk" | "breached"
      if (current >= target.target) {
        status = "met"
      } else if (current >= target.target - 0.5) {
        status = "at_risk"
      } else {
        status = "breached"
      }

      // Calculate trend
      const trend = this.calculateTrend(targetMetrics)

      return {
        target: target.name,
        current,
        target_value: target.target,
        status,
        trend,
      }
    })
  }

  private static calculateCurrentPerformance(target: SLATarget, metrics: SLAMetric[]): number {
    if (metrics.length === 0) return 0

    switch (target.measurement) {
      case "uptime":
        const uptimeMetrics = metrics.filter((m) => m.status === "met")
        return (uptimeMetrics.length / metrics.length) * 100

      case "response_time":
      case "error_rate":
        // Average the values
        const sum = metrics.reduce((acc, m) => acc + m.value, 0)
        return sum / metrics.length

      default:
        return 0
    }
  }

  private static calculateTrend(metrics: SLAMetric[]): "improving" | "stable" | "degrading" {
    if (metrics.length < 2) return "stable"

    const sortedMetrics = metrics.sort((a, b) => a.timestamp - b.timestamp)
    const firstHalf = sortedMetrics.slice(0, Math.floor(sortedMetrics.length / 2))
    const secondHalf = sortedMetrics.slice(Math.floor(sortedMetrics.length / 2))

    const firstAvg = firstHalf.reduce((acc, m) => acc + m.value, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((acc, m) => acc + m.value, 0) / secondHalf.length

    const difference = secondAvg - firstAvg

    if (Math.abs(difference) < 0.1) return "stable"
    return difference > 0 ? "improving" : "degrading"
  }

  static getActiveAlerts() {
    return this.alerts.filter((alert) => !alert.resolved)
  }

  static resolveAlert(alertId: string) {
    const alert = this.alerts.find((a) => a.id === alertId)
    if (alert) {
      alert.resolved = true
      console.log(`[SLA] Alert resolved: ${alertId}`)
    }
  }

  static getUptimeStats(period: "day" | "week" | "month" = "day"): {
    uptime: number
    downtime: number
    incidents: number
    mttr: number // Mean Time To Recovery in minutes
  } {
    // Mock implementation - replace with actual uptime calculation
    const uptimePercentage = {
      day: 99.95,
      week: 99.92,
      month: 99.89,
    }[period]

    const totalMinutes = {
      day: 24 * 60,
      week: 7 * 24 * 60,
      month: 30 * 24 * 60,
    }[period]

    const downtime = (totalMinutes * (100 - uptimePercentage)) / 100

    return {
      uptime: uptimePercentage,
      downtime,
      incidents: Math.floor(downtime / 15), // Assume average incident is 15 minutes
      mttr: 12, // 12 minutes average recovery time
    }
  }
}
