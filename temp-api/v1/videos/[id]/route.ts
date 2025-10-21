import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/database"
import { z } from "zod"

const updateVideoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  metadata: z.record(z.any()).optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const video = await prisma.video.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        analytics: true,
        edits: {
          orderBy: { timestamp: 'desc' },
          take: 10
        },
        exports: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    return NextResponse.json({
      ...video,
      fileSize: video.fileSize ? Number(video.fileSize) : null,
      analytics: video.analytics || { views: 0, shares: 0, downloads: 0 }
    })
  } catch (error) {
    console.error("Video API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const updateData = updateVideoSchema.parse(body)

    // Verify video belongs to user
    const existingVideo = await prisma.video.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    const updatedVideo = await prisma.video.update({
      where: { id: params.id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        analytics: true
      }
    })

    return NextResponse.json({
      ...updatedVideo,
      fileSize: updatedVideo.fileSize ? Number(updatedVideo.fileSize) : null,
      analytics: updatedVideo.analytics || { views: 0, shares: 0, downloads: 0 }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    console.error("Video update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify video belongs to user
    const existingVideo = await prisma.video.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 })
    }

    await prisma.video.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Video deletion error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

