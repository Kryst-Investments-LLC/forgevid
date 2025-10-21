import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period") || "30" // days

    const analytics = await generateAnalytics(session.user.id, Number.parseInt(period))

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to get analytics" }, { status: 500 })
  }
}

async function generateAnalytics(userId: string, days: number) {
  // Replace with real database queries
  const endDate = new Date()
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Get user's subscription for limits
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })

  // Get usage records
  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  // Get videos created in period
  const videos = await prisma.video.findMany({
    where: {
      userId: userId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  // Calculate totals based on usage records and actual data
  const videoMinutesRecords = usageRecords.filter(r => r.action === 'video_created')
  const exportRecords = usageRecords.filter(r => r.action === 'export')
  const totalVideoMinutes = videos.reduce((sum, video) => sum + (video.duration || 0), 0) / 60 // convert to minutes
  const totalExports = exportRecords.reduce((sum, record) => sum + record.quantity, 0)
  const totalStorageBytes = videos.reduce((sum, video) => sum + Number(video.fileSize || 0), 0)

  // Get collaboration members count
  const collaborationRooms = await prisma.collaborationRoom.findMany({
    where: { createdById: userId },
    include: { members: true }
  })
  const totalCollaborators = collaborationRooms.reduce((sum, room) => sum + room.members.length, 0)

  // Set limits based on subscription plan
  const limits = {
    free: { videoMinutes: 10, exports: 5, storage: 1, collaborators: 1 },
    starter: { videoMinutes: 100, exports: 25, storage: 10, collaborators: 3 },
    pro: { videoMinutes: 500, exports: 100, storage: 50, collaborators: 10 },
    enterprise: { videoMinutes: -1, exports: -1, storage: -1, collaborators: -1 } // unlimited
  }

  const planLimits = limits[subscription?.plan as keyof typeof limits] || limits.free

  const analytics = {
    usage: {
      videoMinutes: { 
        used: totalVideoMinutes, 
        limit: planLimits.videoMinutes,
        percentage: planLimits.videoMinutes > 0 ? (totalVideoMinutes / planLimits.videoMinutes) * 100 : 0
      },
      exports: { 
        used: totalExports, 
        limit: planLimits.exports,
        percentage: planLimits.exports > 0 ? (totalExports / planLimits.exports) * 100 : 0
      },
      storage: { 
        used: Number((totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2)), // GB
        limit: planLimits.storage,
        percentage: planLimits.storage > 0 ? (totalStorageBytes / (planLimits.storage * 1024 * 1024 * 1024)) * 100 : 0
      },
      collaborators: { 
        used: totalCollaborators,
        limit: planLimits.collaborators,
        percentage: planLimits.collaborators > 0 ? (totalCollaborators / planLimits.collaborators) * 100 : 0
      },
    },
    performance: {
      averageExportTime: 2.3,
      successRate: 98.5,
      aiGenerationSpeed: 45,
    },
    engagement: {
      averageViewDuration: 105, // seconds
      completionRate: 78,
      engagementScore: "high",
      socialReach: {
        youtube: 2400,
        instagram: 1800,
        tiktok: 3200,
      },
    },
    trends: {
      monthlyStats: [
        { month: "Jan", videos: 12, exports: 45, minutes: 180 },
        { month: "Feb", videos: 18, exports: 62, minutes: 240 },
        { month: "Mar", videos: 25, exports: 89, minutes: 320 },
        { month: "Apr", videos: 32, exports: 124, minutes: 450 },
        { month: "May", videos: 28, exports: 98, minutes: 380 },
        { month: "Jun", videos: 35, exports: 142, minutes: 520 },
      ],
      topTemplates: [
        { name: "Modern Product Showcase", uses: 45, category: "Business" },
        { name: "Social Media Story", uses: 38, category: "Social" },
        { name: "YouTube Intro", uses: 32, category: "Entertainment" },
        { name: "Corporate Presentation", uses: 28, category: "Business" },
        { name: "Marketing Campaign", uses: 24, category: "Marketing" },
      ],
    },
    insights: {
      recommendations: [
        {
          type: "optimal_length",
          title: "Optimal Video Length",
          description: "Your audience engages best with 60-90 second videos",
          impact: "high",
        },
        {
          type: "upload_time",
          title: "Best Upload Time",
          description: "Tuesday 2-4 PM shows highest engagement",
          impact: "medium",
        },
        {
          type: "content_style",
          title: "Content Style",
          description: "Modern, energetic styles perform 40% better",
          impact: "high",
        },
      ],
      opportunities: [
        { action: "Add Captions", benefit: "+25% reach", priority: "high" },
        { action: "Use Trending Music", benefit: "+40% views", priority: "medium" },
        { action: "Consistent Branding", benefit: "+15% retention", priority: "low" },
      ],
    },
  }

  return analytics
}
