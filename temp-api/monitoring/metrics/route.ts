import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("timeRange") || "24h"
    const metric = searchParams.get("metric")

    // Mock metrics data - in production, this would query from monitoring systems
    const metrics = {
      responseTime: generateTimeSeriesData("responseTime", timeRange),
      errorRate: generateTimeSeriesData("errorRate", timeRange),
      throughput: generateTimeSeriesData("throughput", timeRange),
      activeUsers: generateTimeSeriesData("activeUsers", timeRange),
      systemHealth: {
        cpu: Math.floor(Math.random() * 30) + 50,
        memory: Math.floor(Math.random() * 20) + 60,
        disk: Math.floor(Math.random() * 30) + 30,
        network: Math.floor(Math.random() * 40) + 40,
      },
    }

    if (metric && metrics[metric as keyof typeof metrics]) {
      return NextResponse.json({ [metric]: metrics[metric as keyof typeof metrics] })
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error("[METRICS ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 })
  }
}

function generateTimeSeriesData(metric: string, timeRange: string) {
  const points = timeRange === "1h" ? 12 : timeRange === "24h" ? 24 : 168
  const data = []

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(Date.now() - (points - i) * (timeRange === "1h" ? 5 * 60 * 1000 : 60 * 60 * 1000))

    let value: number
    switch (metric) {
      case "responseTime":
        value = Math.floor(Math.random() * 100) + 100
        break
      case "errorRate":
        value = Math.random() * 2
        break
      case "throughput":
        value = Math.floor(Math.random() * 500) + 1000
        break
      case "activeUsers":
        value = Math.floor(Math.random() * 1000) + 2000
        break
      default:
        value = Math.random() * 100
    }

    data.push({
      timestamp: timestamp.toISOString(),
      value,
    })
  }

  return data
}
