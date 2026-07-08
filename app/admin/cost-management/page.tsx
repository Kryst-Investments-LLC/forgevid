"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Target,
} from "lucide-react"

interface CostCenter {
  name: string
  spent: number
  budget: number
  utilization: number
}

interface CostOptimization {
  id: string
  type: string
  description: string
  estimatedSavings: number
  effort: string
  status: string
}

export default function CostManagementPage() {
  const [costData, setCostData] = useState<{
    totalCost: number
    costByService: Record<string, number>
    costByCenter: Record<string, CostCenter>
    trends: { service: string; change: number }[]
    optimizations: CostOptimization[]
  }>({
    totalCost: 0,
    costByService: {},
    costByCenter: {},
    trends: [],
    optimizations: [],
  })

  const [budgetAlerts, setBudgetAlerts] = useState([
    {
      id: "1",
      costCenter: "AI Services",
      threshold: 85,
      current: 92.5,
      severity: "warning" as const,
    },
    {
      id: "2",
      costCenter: "Compute Resources",
      threshold: 95,
      current: 97.2,
      severity: "critical" as const,
    },
  ])

  useEffect(() => {
    // Mock data - replace with actual API call
    setCostData({
      totalCost: 28450.75,
      costByService: {
        OpenAI: 12500,
        Vercel: 4200,
        "AWS S3": 3100,
        CloudFront: 2800,
        Anthropic: 2650,
        Replicate: 2200,
        Other: 1000,
      },
      costByCenter: {
        "AI Services": { name: "AI Services", spent: 15150, budget: 15000, utilization: 101 },
        "Compute Resources": { name: "Compute Resources", spent: 9720, budget: 10000, utilization: 97.2 },
        "Storage & CDN": { name: "Storage & CDN", spent: 3580, budget: 5000, utilization: 71.6 },
      },
      trends: [
        { service: "OpenAI", change: 15.2 },
        { service: "Vercel", change: -5.1 },
        { service: "AWS S3", change: 8.7 },
        { service: "CloudFront", change: 2.3 },
      ],
      optimizations: [
        {
          id: "1",
          type: "rightsizing",
          description: "Downsize underutilized compute instances",
          estimatedSavings: 1200,
          effort: "medium",
          status: "pending",
        },
        {
          id: "2",
          type: "reserved_capacity",
          description: "Switch to reserved instances for predictable workloads",
          estimatedSavings: 2800,
          effort: "low",
          status: "pending",
        },
        {
          id: "3",
          type: "scheduling",
          description: "Schedule non-critical batch jobs during off-peak hours",
          estimatedSavings: 800,
          effort: "high",
          status: "pending",
        },
      ],
    })
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 95) return "text-red-600"
    if (utilization >= 85) return "text-yellow-600"
    return "text-green-600"
  }

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization >= 95) return "bg-red-100"
    if (utilization >= 85) return "bg-yellow-100"
    return "bg-green-100"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Cost Management</h1>
        <p className="text-slate-600 mt-2">Monitor spending, optimize costs, and manage budgets</p>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="space-y-3">
          {budgetAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.severity === "critical" ? "bg-red-50 border-red-500" : "bg-yellow-50 border-yellow-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle
                    className={`h-5 w-5 ${alert.severity === "critical" ? "text-red-600" : "text-yellow-600"}`}
                  />
                  <div>
                    <p className="font-medium">Budget Alert: {alert.costCenter}</p>
                    <p className="text-sm text-slate-600">
                      {alert.current}% of budget used (threshold: {alert.threshold}%)
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Acknowledge
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costData.totalCost)}</div>
            <p className="text-xs text-slate-600">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
            <Target className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89.2%</div>
            <p className="text-xs text-slate-600">Across all cost centers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <Lightbulb className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(4800)}</div>
            <p className="text-xs text-slate-600">From optimization recommendations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+8.5%</div>
            <p className="text-xs text-slate-600">Month over month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cost-centers">Cost Centers</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="budgets">Budget Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost by Service</CardTitle>
                <CardDescription>Monthly spending breakdown by service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(costData.costByService).map(([service, cost]) => {
                    const percentage = (cost / costData.totalCost) * 100
                    return (
                      <div key={service} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                          <span className="font-medium">{service}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(cost)}</div>
                          <div className="text-sm text-slate-600">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Trends</CardTitle>
                <CardDescription>Month-over-month change by service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costData.trends.map((trend) => (
                    <div key={trend.service} className="flex items-center justify-between">
                      <span className="font-medium">{trend.service}</span>
                      <div className="flex items-center space-x-2">
                        {trend.change > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className={`font-medium ${trend.change > 0 ? "text-red-600" : "text-green-600"}`}>
                          {trend.change > 0 ? "+" : ""}
                          {trend.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {Object.values(costData.costByCenter).map((center) => (
              <Card key={center.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{center.name}</CardTitle>
                    <Badge
                      variant={
                        center.utilization >= 95 ? "destructive" : center.utilization >= 85 ? "secondary" : "default"
                      }
                      className={getUtilizationBgColor(center.utilization)}
                    >
                      {center.utilization.toFixed(1)}% utilized
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatCurrency(center.spent)} of {formatCurrency(center.budget)} budget
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={center.utilization} className="h-2" />
                    <div className="flex justify-between text-sm">
                      <span>Spent: {formatCurrency(center.spent)}</span>
                      <span>Remaining: {formatCurrency(center.budget - center.spent)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cost Optimization Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions to reduce your cloud spending</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costData.optimizations.map((optimization) => (
                  <div key={optimization.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{optimization.type.replace("_", " ")}</Badge>
                          <Badge
                            variant={
                              optimization.effort === "low"
                                ? "default"
                                : optimization.effort === "medium"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {optimization.effort} effort
                          </Badge>
                        </div>
                        <p className="font-medium">{optimization.description}</p>
                        <p className="text-sm text-slate-600">
                          Estimated savings: {formatCurrency(optimization.estimatedSavings)}/month
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                        <Button size="sm">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Implement
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget Management</CardTitle>
              <CardDescription>Set and manage budgets for different cost centers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.values(costData.costByCenter).map((center) => (
                  <div key={center.name} className="space-y-3">
                    <Label htmlFor={`budget-${center.name}`}>{center.name} Budget</Label>
                    <div className="flex items-center space-x-4">
                      <Input id={`budget-${center.name}`} type="number" value={center.budget} className="max-w-xs" />
                      <Button variant="outline" size="sm">
                        Update
                      </Button>
                    </div>
                    <div className="text-sm text-slate-600">
                      Current spending: {formatCurrency(center.spent)} ({center.utilization.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
