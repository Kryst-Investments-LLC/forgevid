import { type NextRequest, NextResponse } from "next/server"
import { prisma } from '@/lib/prisma'
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  try {
    const user = await getFreshSessionUser()
    if (!user || !isAdminRole(user.role)) {
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

  const planPricing: Record<string, number> = {
    'free': 0,
    'starter': 29,
    'pro': 99,
    'enterprise': 299
  }

  // Build month boundaries for trends (avoid N+1 loop)
  const monthBoundaries: { start: Date; end: Date; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date()
    monthStart.setMonth(monthStart.getMonth() - i)
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthBoundaries.push({
      start: monthStart,
      end: monthEnd,
      label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  const oldestMonth = monthBoundaries[0].start

  // Run ALL queries in parallel
  const [
    planBreakdown,
    allMonthSubs,
    recentPayments,
    totalUsers,
    canceledThisMonth,
    trialUsers,
    convertedUsers,
  ] = await Promise.all([
    prisma.subscription.groupBy({
      by: ['plan'],
      where: { status: 'ACTIVE' },
      _count: { plan: true },
    }),
    // Single query for all 6 months of trends (replaces 6 separate queries)
    prisma.subscription.findMany({
      where: { createdAt: { gte: oldestMonth } },
      select: { plan: true, createdAt: true },
    }),
    prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        subscription: { select: { plan: true } },
      },
    }),
    prisma.user.count(),
    prisma.subscription.count({
      where: { canceledAt: { gte: startDate, lte: endDate } },
    }),
    prisma.subscription.count({
      where: { status: 'TRIALING', createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.subscription.count({
      where: { status: 'ACTIVE', createdAt: { gte: startDate, lte: endDate } },
    }),
  ])

  // AI unit-cost side of the ledger: what this month's generations cost US.
  // Revenue without this number cannot tell you whether a plan is profitable.
  const [aiCostMonth, aiCostAll] = await Promise.all([
    prisma.aIGeneration.aggregate({
      _sum: { cost: true },
      _count: { id: true },
      where: { createdAt: { gte: startDate, lte: endDate } },
    }),
    prisma.aIGeneration.aggregate({ _sum: { cost: true }, _count: { id: true } }),
  ])

  // Calculate MRR from groupBy instead of fetching all active subs
  const mrr = planBreakdown.reduce((total, plan) => {
    return total + (planPricing[plan.plan] || 0) * plan._count.plan
  }, 0)
  const arr = mrr * 12
  const totalActiveUsers = planBreakdown.reduce((sum, p) => sum + p._count.plan, 0)

  const subscriptionBreakdown = planBreakdown.map(plan => ({
    plan: plan.plan,
    users: plan._count.plan,
    revenue: (planPricing[plan.plan] || 0) * plan._count.plan,
    percentage: totalActiveUsers > 0 ? (plan._count.plan / totalActiveUsers) * 100 : 0
  }))

  // Build monthly trends from the single query result (no N+1)
  const monthlyTrends = monthBoundaries.map(({ start, end, label }) => {
    const monthSubs = allMonthSubs.filter(
      s => s.createdAt >= start && s.createdAt < end
    )
    const monthRevenue = monthSubs.reduce(
      (total, sub) => total + (planPricing[sub.plan] || 0), 0
    )
    return {
      month: label,
      revenue: Math.round(monthRevenue),
      users: monthSubs.length,
      newSubscriptions: monthSubs.length,
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

  const arpu = totalUsers > 0 ? mrr / totalUsers : 0
  const churnRate = totalActiveUsers > 0 ? (canceledThisMonth / totalActiveUsers) * 100 : 0
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
    period: days,
    // Unit economics: estimated AI/render spend vs the MRR above.
    aiCosts: {
      periodUsd: Number(aiCostMonth._sum.cost ?? 0),
      periodGenerations: aiCostMonth._count.id,
      allTimeUsd: Number(aiCostAll._sum.cost ?? 0),
      allTimeGenerations: aiCostAll._count.id,
      grossMarginUsd: Math.round((mrr - Number(aiCostMonth._sum.cost ?? 0)) * 100) / 100,
    },
  }
}
