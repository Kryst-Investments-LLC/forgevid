import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Get user ID from authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    if (!subscription) {
      return NextResponse.json({ subscription: null })
    }

    return NextResponse.json({ 
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        metadata: subscription.metadata ? JSON.parse(subscription.metadata) : null,
      }
    })
  } catch (error) {
    console.error("Get subscription error:", error)
    return NextResponse.json({ error: "Failed to get subscription" }, { status: 500 })
  }
}
