interface CostCenter {
  id: string
  name: string
  budget: number
  spent: number
  period: "monthly" | "quarterly" | "yearly"
  alerts: {
    threshold: number // percentage of budget
    recipients: string[]
  }[]
}

interface CostMetric {
  timestamp: number
  service: string
  cost: number
  usage: number
  unit: string
  metadata: Record<string, any>
}

interface CostOptimization {
  id: string
  type: "rightsizing" | "scheduling" | "reserved_capacity" | "spot_instances"
  description: string
  estimatedSavings: number
  effort: "low" | "medium" | "high"
  status: "pending" | "implemented" | "dismissed"
}

export class CostManager {
  private static costCenters: Map<string, CostCenter> = new Map()
  private static metrics: CostMetric[] = []
  private static optimizations: CostOptimization[] = []
  private static budgetAlerts: Array<{
    id: string
    costCenterId: string
    threshold: number
    triggered: boolean
    timestamp: number
  }> = []

  static initialize() {
    // Initialize default cost centers
    this.costCenters.set("compute", {
      id: "compute",
      name: "Compute Resources",
      budget: 10000, // $10k/month
      spent: 0,
      period: "monthly",
      alerts: [
  { threshold: 80, recipients: ["devops@forgevid.com"] },
  { threshold: 95, recipients: ["devops@forgevid.com", "cto@forgevid.com"] },
      ],
    })

    this.costCenters.set("storage", {
      id: "storage",
      name: "Storage & CDN",
      budget: 5000, // $5k/month
      spent: 0,
      period: "monthly",
  alerts: [{ threshold: 85, recipients: ["devops@forgevid.com"] }],
    })

    this.costCenters.set("ai_services", {
      id: "ai_services",
      name: "AI & ML Services",
      budget: 15000, // $15k/month
      spent: 0,
      period: "monthly",
      alerts: [
  { threshold: 75, recipients: ["ai-team@forgevid.com"] },
  { threshold: 90, recipients: ["ai-team@forgevid.com", "cto@forgevid.com"] },
      ],
    })

    console.log("[Cost] Cost Manager initialized with cost centers:", Array.from(this.costCenters.keys()))
    this.startCostMonitoring()
  }

  static recordCost(service: string, cost: number, usage: number, unit: string, metadata: Record<string, any> = {}) {
    const metric: CostMetric = {
      timestamp: Date.now(),
      service,
      cost,
      usage,
      unit,
      metadata,
    }

    this.metrics.push(metric)

    // Keep only last 100k metrics
    if (this.metrics.length > 100000) {
      this.metrics = this.metrics.slice(-100000)
    }

    // Update cost center spending
    this.updateCostCenterSpending(service, cost)

    // Check for budget alerts
    this.checkBudgetAlerts()

    // Send to cost monitoring service
    this.sendCostMetric(metric)

    console.log(`[Cost] Recorded cost: ${service} - $${cost} for ${usage} ${unit}`)
  }

  private static updateCostCenterSpending(service: string, cost: number) {
    // Map services to cost centers
    const serviceMapping: Record<string, string> = {
      ec2: "compute",
      lambda: "compute",
      vercel: "compute",
      s3: "storage",
      cloudfront: "storage",
      openai: "ai_services",
      anthropic: "ai_services",
      replicate: "ai_services",
    }

    const costCenterId = serviceMapping[service] || "compute"
    const costCenter = this.costCenters.get(costCenterId)

    if (costCenter) {
      costCenter.spent += cost
    }
  }

  private static checkBudgetAlerts() {
    for (const [id, costCenter] of this.costCenters.entries()) {
      const utilizationPercentage = (costCenter.spent / costCenter.budget) * 100

      for (const alert of costCenter.alerts) {
        if (utilizationPercentage >= alert.threshold) {
          const alertId = `${id}_${alert.threshold}_${Date.now()}`

          // Check if alert already triggered recently
          const recentAlert = this.budgetAlerts.find(
            (a) =>
              a.costCenterId === id &&
              a.threshold === alert.threshold &&
              Date.now() - a.timestamp < 24 * 60 * 60 * 1000, // 24 hours
          )

          if (!recentAlert) {
            this.triggerBudgetAlert(alertId, costCenter, alert.threshold, utilizationPercentage, alert.recipients)
          }
        }
      }
    }
  }

  private static async triggerBudgetAlert(
    alertId: string,
    costCenter: CostCenter,
    threshold: number,
    current: number,
    recipients: string[],
  ) {
    const alert = {
      id: alertId,
      costCenterId: costCenter.id,
      threshold,
      triggered: true,
      timestamp: Date.now(),
    }

    this.budgetAlerts.push(alert)

    const message = `Budget Alert: ${costCenter.name} has reached ${current.toFixed(1)}% of budget ($${costCenter.spent.toFixed(2)} / $${costCenter.budget})`

    console.warn(`[Cost] ${message}`)

    // Send alert notifications
    await this.sendBudgetAlert({
      alertId,
      costCenter: costCenter.name,
      threshold,
      current,
      spent: costCenter.spent,
      budget: costCenter.budget,
      recipients,
      message,
    })
  }

  private static async sendBudgetAlert(alertData: any) {
    try {
      await fetch("/api/alerts/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertData),
      })
    } catch (error) {
      console.error("[Cost] Failed to send budget alert:", error)
    }
  }

  private static async sendCostMetric(metric: CostMetric) {
    try {
      await fetch("/api/monitoring/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metric),
      })
    } catch (error) {
      console.warn("[Cost] Failed to send cost metric:", error)
    }
  }

  private static startCostMonitoring() {
    // Monitor costs every hour
    setInterval(
      () => {
        this.analyzeCostTrends()
        this.generateOptimizationRecommendations()
      },
      60 * 60 * 1000,
    )
  }

  private static analyzeCostTrends() {
    const now = Date.now()
    const last24Hours = now - 24 * 60 * 60 * 1000
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= last24Hours)

    // Group by service
    const serviceSpending = recentMetrics.reduce(
      (acc, metric) => {
        acc[metric.service] = (acc[metric.service] || 0) + metric.cost
        return acc
      },
      {} as Record<string, number>,
    )

    // Identify top spending services
    const topSpenders = Object.entries(serviceSpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    console.log("[Cost] Top spending services (24h):", topSpenders)

    // Check for unusual spending patterns
    this.detectAnomalousSpending(serviceSpending)
  }

  private static detectAnomalousSpending(currentSpending: Record<string, number>) {
    // Compare with historical averages (simplified)
    const historicalAverages: Record<string, number> = {
      openai: 500,
      vercel: 200,
      s3: 150,
      cloudfront: 100,
    }

    for (const [service, current] of Object.entries(currentSpending)) {
      const historical = historicalAverages[service]
      if (historical && current > historical * 1.5) {
        console.warn(`[Cost] Anomalous spending detected for ${service}: $${current} vs avg $${historical}`)
        this.createCostAlert(service, current, historical)
      }
    }
  }

  private static async createCostAlert(service: string, current: number, expected: number) {
    const alert = {
      type: "anomalous_spending",
      service,
      current,
      expected,
      increase: (((current - expected) / expected) * 100).toFixed(1),
      timestamp: Date.now(),
    }

    try {
      await fetch("/api/alerts/cost-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alert),
      })
    } catch (error) {
      console.error("[Cost] Failed to send cost anomaly alert:", error)
    }
  }

  private static generateOptimizationRecommendations() {
    // Analyze usage patterns and generate recommendations
    const recommendations: CostOptimization[] = []

    // Check for underutilized resources
    const computeMetrics = this.metrics.filter((m) => m.service === "ec2" || m.service === "vercel")
    if (computeMetrics.length > 0) {
      const avgUtilization =
        computeMetrics.reduce((sum, m) => sum + (m.metadata.utilization || 0), 0) / computeMetrics.length

      if (avgUtilization < 30) {
        recommendations.push({
          id: `rightsizing_${Date.now()}`,
          type: "rightsizing",
          description: "Consider downsizing compute instances due to low utilization",
          estimatedSavings: 2000,
          effort: "medium",
          status: "pending",
        })
      }
    }

    // Check for opportunities to use reserved capacity
    const monthlyComputeCost = this.getCostCenterSpending("compute")
    if (monthlyComputeCost > 5000) {
      recommendations.push({
        id: `reserved_${Date.now()}`,
        type: "reserved_capacity",
        description: "Switch to reserved instances for predictable workloads",
        estimatedSavings: monthlyComputeCost * 0.3, // 30% savings
        effort: "low",
        status: "pending",
      })
    }

    // Add new recommendations
    recommendations.forEach((rec) => {
      if (!this.optimizations.find((opt) => opt.description === rec.description)) {
        this.optimizations.push(rec)
      }
    })
  }

  static getCostReport(period: "day" | "week" | "month" = "month"): {
    totalCost: number
    costByService: Record<string, number>
    costByCenter: Record<string, { spent: number; budget: number; utilization: number }>
    trends: { service: string; change: number }[]
    optimizations: CostOptimization[]
  } {
    const now = Date.now()
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    }[period]

    const cutoff = now - periodMs
    const periodMetrics = this.metrics.filter((m) => m.timestamp >= cutoff)

    const totalCost = periodMetrics.reduce((sum, m) => sum + m.cost, 0)

    const costByService = periodMetrics.reduce(
      (acc, m) => {
        acc[m.service] = (acc[m.service] || 0) + m.cost
        return acc
      },
      {} as Record<string, number>,
    )

    const costByCenter: Record<string, { spent: number; budget: number; utilization: number }> = {}
    for (const [id, center] of this.costCenters.entries()) {
      costByCenter[center.name] = {
        spent: center.spent,
        budget: center.budget,
        utilization: (center.spent / center.budget) * 100,
      }
    }

    // Calculate trends (simplified)
    const trends = Object.entries(costByService).map(([service, cost]) => ({
      service,
      change: Math.random() * 20 - 10, // Mock trend data
    }))

    return {
      totalCost,
      costByService,
      costByCenter,
      trends,
      optimizations: this.optimizations.filter((opt) => opt.status === "pending"),
    }
  }

  static getCostCenterSpending(costCenterId: string): number {
    const costCenter = this.costCenters.get(costCenterId)
    return costCenter ? costCenter.spent : 0
  }

  static updateBudget(costCenterId: string, newBudget: number) {
    const costCenter = this.costCenters.get(costCenterId)
    if (costCenter) {
      costCenter.budget = newBudget
      console.log(`[Cost] Updated budget for ${costCenter.name}: $${newBudget}`)
    }
  }

  static implementOptimization(optimizationId: string) {
    const optimization = this.optimizations.find((opt) => opt.id === optimizationId)
    if (optimization) {
      optimization.status = "implemented"
      console.log(`[Cost] Implemented optimization: ${optimization.description}`)
    }
  }

  static dismissOptimization(optimizationId: string) {
    const optimization = this.optimizations.find((opt) => opt.id === optimizationId)
    if (optimization) {
      optimization.status = "dismissed"
      console.log(`[Cost] Dismissed optimization: ${optimization.description}`)
    }
  }
}

export class UsageBasedBilling {
  private static pricingTiers = {
    video_generation: {
      unit: "seconds",
      tiers: [
        { min: 0, max: 300, price: 0.1 }, // First 5 minutes free
        { min: 300, max: 1800, price: 0.05 }, // Next 25 minutes at $0.05/sec
        { min: 1800, max: Number.POSITIVE_INFINITY, price: 0.03 }, // Beyond 30 minutes at $0.03/sec
      ],
    },
    ai_generation: {
      unit: "requests",
      tiers: [
        { min: 0, max: 100, price: 0 }, // First 100 requests free
        { min: 100, max: 1000, price: 0.1 }, // Next 900 at $0.10/request
        { min: 1000, max: Number.POSITIVE_INFINITY, price: 0.05 }, // Beyond 1000 at $0.05/request
      ],
    },
    storage: {
      unit: "gb_hours",
      tiers: [
        { min: 0, max: 10, price: 0 }, // First 10GB free
        { min: 10, max: 100, price: 0.02 }, // Next 90GB at $0.02/GB/hour
        { min: 100, max: Number.POSITIVE_INFINITY, price: 0.01 }, // Beyond 100GB at $0.01/GB/hour
      ],
    },
  }

  static calculateUsageCost(service: keyof typeof this.pricingTiers, usage: number): number {
    const pricing = this.pricingTiers[service]
    if (!pricing) return 0

    let totalCost = 0
    let remainingUsage = usage

    for (const tier of pricing.tiers) {
      if (remainingUsage <= 0) break

      const tierUsage = Math.min(remainingUsage, tier.max - tier.min)
      const tierCost = tierUsage * tier.price

      totalCost += tierCost
      remainingUsage -= tierUsage

      if (tier.max === Number.POSITIVE_INFINITY) break
    }

    return totalCost
  }

  static generateInvoice(
    userId: string,
    period: { start: number; end: number },
  ): {
    userId: string
    period: { start: number; end: number }
    lineItems: Array<{
      service: string
      usage: number
      unit: string
      cost: number
      description: string
    }>
    subtotal: number
    tax: number
    total: number
  } {
    // Mock usage data - replace with actual usage tracking
    const usageData = {
      video_generation: 1500, // seconds
      ai_generation: 250, // requests
      storage: 45, // gb_hours
    }

    const lineItems = Object.entries(usageData).map(([service, usage]) => {
      const cost = this.calculateUsageCost(service as keyof typeof this.pricingTiers, usage)
      const pricing = this.pricingTiers[service as keyof typeof this.pricingTiers]

      return {
        service,
        usage,
        unit: pricing.unit,
        cost,
        description: `${service.replace("_", " ")} usage`,
      }
    })

    const subtotal = lineItems.reduce((sum, item) => sum + item.cost, 0)
    const tax = subtotal * 0.08 // 8% tax
    const total = subtotal + tax

    return {
      userId,
      period,
      lineItems,
      subtotal,
      tax,
      total,
    }
  }
}
