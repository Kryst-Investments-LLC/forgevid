import { type NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.role || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get("period") || "30" // days

    const revenueData = await getRevenueAnalytics(Number.parseInt(period))

    return NextResponse.json(revenueData)
  } catch (error) {
    console.error("Revenue analytics error:", error)
    return NextResponse.json({ error: "Failed to get revenue analytics" }, { status: 500 })
  }
}

async function getRevenueAnalytics(days: number) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(endDate.getDate() - days)

  // Get subscription metrics
  const subscriptions = await prisma.subscription.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      user: true,
      payments: true
    }
  })

  // Calculate MRR (Monthly Recurring Revenue) - using plan-based pricing
  const activeSubs = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE'
    }
  })

  // Define plan pricing (this should be in a config file)
  const planPricing = {
    'free': 0,
    'starter': 29,
    'pro': 99,
    'enterprise': 299
  }
  
  const mrr = activeSubs.reduce((total, sub) => {
    const monthlyAmount = planPricing[sub.plan as keyof typeof planPricing] || 0
    return total + monthlyAmount
  }, 0)

  const arr = mrr * 12 // Annual Recurring Revenue

  // Get user count per plan
  const planBreakdown = await prisma.subscription.groupBy({
    by: ['plan'],
    where: {
      status: 'ACTIVE'
    },
    _count: {
      plan: true
    }
  })

  // Calculate subscription breakdown
  const totalActiveUsers = activeSubs.length
  const subscriptionBreakdown = planBreakdown.map(plan => ({
    plan: plan.plan,
    users: plan._count.plan,
    revenue: (planPricing[plan.plan as keyof typeof planPricing] || 0) * plan._count.plan,
    percentage: totalActiveUsers > 0 ? (plan._count.plan / totalActiveUsers) * 100 : 0
  }))

  // Get monthly trends
  const monthlyTrends = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date()
    monthStart.setMonth(monthStart.getMonth() - i)
    monthStart.setDate(1)
    
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const monthSubs = await prisma.subscription.findMany({
      where: {
        createdAt: {
          gte: monthStart,
          lt: monthEnd
        }
      }
    })

    const monthRevenue = monthSubs.reduce((total, sub) => {
      return total + (planPricing[sub.plan as keyof typeof planPricing] || 0)
    }, 0)
    
    monthlyTrends.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      revenue: Math.round(monthRevenue),
      users: monthSubs.length,
      newSubscriptions: monthSubs.length
    })
  }

  // Get recent transactions
  const recentPayments = await prisma.payment.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      subscription: {
        select: {
          plan: true
        }
      }
    }
  })

  const recentTransactions = recentPayments.map(payment => ({
    id: payment.id,
    userId: payment.userId,
    userName: payment.user.name,
    userEmail: payment.user.email,
    amount: payment.amount,
    plan: payment.subscription?.plan || 'Unknown',
    status: payment.status.toLowerCase(),
    createdAt: payment.createdAt.toISOString()
  }))

  // Calculate ARPU (Average Revenue Per User)
  const totalUsers = await prisma.user.count()
  const arpu = totalUsers > 0 ? mrr / totalUsers : 0

    // Calculate churn rate (canceled subscriptions this month)
  const canceledThisMonth = await prisma.subscription.count({
    where: {
      canceledAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })
  
  const churnRate = totalActiveUsers > 0 ? (canceledThisMonth / totalActiveUsers) * 100 : 0

  // Calculate conversion rate (trial to paid conversion)
  const trialUsers = await prisma.subscription.count({
    where: {
      status: 'TRIALING',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const convertedUsers = await prisma.subscription.count({
    where: {
      status: 'ACTIVE',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  const conversionRate = trialUsers > 0 ? (convertedUsers / trialUsers) * 100 : 0

  return {
    metrics: {
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      arpu: Math.round(arpu * 100) / 100,
      ltv: Math.round(arpu * 12 * 100) / 100, // Simplified LTV calculation
      churnRate: Math.round(churnRate * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    },
    subscriptionBreakdown,
    monthlyTrends,
    recentTransactions,
    totalUsers,
    activeSubscriptions: totalActiveUsers,
    period: days
  }
}
