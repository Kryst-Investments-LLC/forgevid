import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, action, resource, ip, userAgent, metadata } = await request.json()

    const auditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      ip: ip || request.ip || "unknown",
      userAgent: userAgent || request.headers.get("user-agent") || "unknown",
      metadata: metadata || {},
      severity: calculateSeverity(action),
      status: "logged",
    }

    // In production, this would write to a secure audit database
    console.log("[AUDIT]", JSON.stringify(auditEntry))

    return NextResponse.json({ success: true, auditId: auditEntry.id })
  } catch (error) {
    console.error("[AUDIT ERROR]", error)
    return NextResponse.json({ error: "Audit logging failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")
    const severity = searchParams.get("severity")
    const userId = searchParams.get("userId")

    // Mock audit logs for demo - in production, query from secure database
    const mockAuditLogs = [
      {
        id: "1",
        timestamp: "2025-01-09T14:30:22Z",
        userId: "admin@vidforge.ai",
        action: "user.login",
        resource: "/auth/login",
        ip: "192.168.1.100",
        userAgent: "Mozilla/5.0...",
        severity: "low",
        status: "success",
      },
      {
        id: "2",
        timestamp: "2025-01-09T14:25:15Z",
        userId: "john.doe@company.com",
        action: "user.password_change",
        resource: "/auth/password",
        ip: "10.0.0.45",
        userAgent: "Mozilla/5.0...",
        severity: "medium",
        status: "success",
      },
    ]

    let filteredLogs = mockAuditLogs
    if (severity) {
      filteredLogs = filteredLogs.filter((log) => log.severity === severity)
    }
    if (userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === userId)
    }

    const paginatedLogs = filteredLogs.slice(offset, offset + limit)

    return NextResponse.json({
      logs: paginatedLogs,
      total: filteredLogs.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error("[AUDIT QUERY ERROR]", error)
    return NextResponse.json({ error: "Failed to retrieve audit logs" }, { status: 500 })
  }
}

function calculateSeverity(action: string): "low" | "medium" | "high" | "critical" {
  const highRiskActions = ["user.delete", "admin.privilege_escalation", "system.config_change"]
  const mediumRiskActions = ["user.password_change", "user.email_change", "data.export"]
  const criticalActions = ["security.breach_detected", "system.unauthorized_access"]

  if (criticalActions.some((a) => action.includes(a))) return "critical"
  if (highRiskActions.some((a) => action.includes(a))) return "high"
  if (mediumRiskActions.some((a) => action.includes(a))) return "medium"
  return "low"
}
