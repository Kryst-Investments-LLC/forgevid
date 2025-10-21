import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, dataType, reason } = await request.json()

    if (!userId || !dataType) {
      return NextResponse.json({ error: "User ID and data type are required" }, { status: 400 })
    }

    const exportId = crypto.randomUUID()
    const exportRequest = {
      id: exportId,
      userId,
      dataType,
      reason,
      status: "pending",
      requestedAt: new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    }

    // In production, this would queue the export job
    console.log(`[DATA EXPORT] Export request created: ${exportId}`)

    // Simulate export processing
    setTimeout(() => {
      console.log(`[DATA EXPORT] Processing export ${exportId}`)
      // Update status to processing, then completed
    }, 1000)

    return NextResponse.json({ exportRequest })
  } catch (error) {
    console.error("[EXPORT ERROR]", error)
    return NextResponse.json({ error: "Failed to create export request" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")

    // Mock export requests - in production, query from database
    const mockExports = [
      {
        id: "export_1",
        userId: "user_123",
        requestedBy: "john.doe@company.com",
        dataType: "user_data",
        status: "completed",
        requestDate: "2025-01-08T10:30:00Z",
        completedDate: "2025-01-08T11:15:00Z",
        downloadUrl: "/exports/user_data_123.zip",
        expiresAt: "2025-01-15T11:15:00Z",
      },
    ]

    let filteredExports = mockExports
    if (userId) {
      filteredExports = filteredExports.filter((exp) => exp.userId === userId)
    }
    if (status) {
      filteredExports = filteredExports.filter((exp) => exp.status === status)
    }

    return NextResponse.json({ exports: filteredExports })
  } catch (error) {
    console.error("[EXPORT QUERY ERROR]", error)
    return NextResponse.json({ error: "Failed to retrieve exports" }, { status: 500 })
  }
}
