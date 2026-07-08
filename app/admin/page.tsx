"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import {
  Users,
  Video,
  TrendingUp,
  DollarSign,
  Search,
  MoreHorizontal,
  Shield,
  Ban,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Download,
  CreditCard,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { useState } from "react"

// Mock data for admin dashboard
const stats = [
  { title: "Total Users", value: "12,543", change: "+12%", icon: Users },
  { title: "Videos Created", value: "45,231", change: "+18%", icon: Video },
  { title: "Monthly Revenue", value: "$89,432", change: "+25%", icon: DollarSign },
  { title: "Active Sessions", value: "2,847", change: "+8%", icon: TrendingUp },
]

const revenueStats = [
  { title: "Monthly Recurring Revenue", value: "$89,432", change: "+25%", trend: "up" },
  { title: "Annual Recurring Revenue", value: "$1,073,184", change: "+32%", trend: "up" },
  { title: "Average Revenue Per User", value: "$47.23", change: "+8%", trend: "up" },
  { title: "Customer Lifetime Value", value: "$284.50", change: "+15%", trend: "up" },
  { title: "Churn Rate", value: "3.2%", change: "-0.8%", trend: "down" },
  { title: "Conversion Rate", value: "12.4%", change: "+2.1%", trend: "up" },
]

const subscriptionBreakdown = [
  { plan: "Free", users: 8234, revenue: 0, percentage: 65.6 },
  { plan: "Starter", users: 2845, revenue: 42675, percentage: 22.7 },
  { plan: "Pro", users: 1234, revenue: 43190, percentage: 9.8 },
  { plan: "Enterprise", users: 230, revenue: 22770, percentage: 1.8 },
]

const recentTransactions = [
  {
    id: "txn_001",
    user: "John Doe",
    plan: "Pro",
    amount: "$35.00",
    status: "completed",
    date: "2025-01-15",
    method: "card",
  },
  {
    id: "txn_002",
    user: "Sarah Wilson",
    plan: "Enterprise",
    amount: "$99.00",
    status: "completed",
    date: "2025-01-15",
    method: "card",
  },
  {
    id: "txn_003",
    user: "Mike Johnson",
    plan: "Starter",
    amount: "$15.00",
    status: "failed",
    date: "2025-01-14",
    method: "card",
  },
  {
    id: "txn_004",
    user: "Emily Chen",
    plan: "Pro",
    amount: "$35.00",
    status: "pending",
    date: "2025-01-14",
    method: "bank",
  },
]

const monthlyRevenueData = [
  { month: "Jul", revenue: 45200, users: 8900 },
  { month: "Aug", revenue: 52300, users: 9800 },
  { month: "Sep", revenue: 61400, users: 10900 },
  { month: "Oct", revenue: 68900, users: 11600 },
  { month: "Nov", revenue: 76500, users: 12100 },
  { month: "Dec", revenue: 89432, users: 12543 },
]

const recentUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    plan: "Pro",
    status: "active",
    joinDate: "2024-01-15",
    videosCreated: 23,
    avatar: "/placeholder.svg?key=user1",
  },
  {
    id: 2,
    name: "Sarah Wilson",
    email: "sarah@example.com",
    plan: "Enterprise",
    status: "active",
    joinDate: "2024-01-10",
    videosCreated: 67,
    avatar: "/placeholder.svg?key=user2",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@example.com",
    plan: "Starter",
    status: "suspended",
    joinDate: "2024-01-08",
    videosCreated: 5,
    avatar: "/placeholder.svg?key=user3",
  },
  {
    id: 4,
    name: "Emily Chen",
    email: "emily@example.com",
    plan: "Pro",
    status: "active",
    joinDate: "2024-01-05",
    videosCreated: 34,
    avatar: "/placeholder.svg?key=user4",
  },
]

const systemAlerts = [
  {
    id: 1,
    type: "warning",
    message: "High server load detected on AI processing cluster",
    timestamp: "2 minutes ago",
  },
  {
    id: 2,
    type: "info",
    message: "Scheduled maintenance completed successfully",
    timestamp: "1 hour ago",
  },
  {
    id: 3,
    type: "error",
    message: "Payment processing error for user ID 12543",
    timestamp: "3 hours ago",
  },
]

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      case "suspended":
        return (
          <Badge variant="destructive">
            <Ban className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Completed</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Manage users, monitor system performance, and view analytics</p>
          </div>

          <div className="flex items-center gap-4">
            <Button asChild variant="outline" className="bg-transparent">
              <Link href="/admin/beta">
                <Shield className="h-4 w-4 mr-2" />
                Beta Access
              </Link>
            </Button>
            <Button variant="outline" className="bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Maintenance
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="revenue">Revenue Dashboard</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
            <TabsTrigger value="beta">Beta Access</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Revenue Dashboard Tab */}
          <TabsContent value="revenue" className="space-y-6">
            {/* Revenue Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {revenueStats.map((stat) => (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      <span className={stat.trend === "up" ? "text-green-600" : "text-red-600"}>{stat.change}</span>{" "}
                      from last month
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Subscription Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Breakdown</CardTitle>
                  <CardDescription>Revenue distribution by plan tier</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionBreakdown.map((plan) => (
                    <div key={plan.plan} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={plan.plan === "Enterprise" ? "default" : "outline"}>{plan.plan}</Badge>
                          <span className="text-sm text-muted-foreground">{plan.users.toLocaleString()} users</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${plan.revenue.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{plan.percentage}%</div>
                        </div>
                      </div>
                      <Progress value={plan.percentage} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Monthly Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Growth</CardTitle>
                  <CardDescription>Monthly revenue and user growth trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-2">
                      {monthlyRevenueData.map((month, index) => (
                        <div key={month.month} className="text-center">
                          <div className="space-y-2">
                            <div className="h-20 bg-muted rounded flex items-end justify-center p-1">
                              <div
                                className="bg-primary rounded-t w-full"
                                style={{ height: `${(month.revenue / 100000) * 100}%` }}
                              />
                            </div>
                            <div className="text-xs">
                              <div className="font-medium">{month.month}</div>
                              <div className="text-muted-foreground">${(month.revenue / 1000).toFixed(0)}K</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Latest payment transactions and subscription changes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                        <TableCell className="font-medium">{transaction.user}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.plan}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{transaction.amount}</TableCell>
                        <TableCell>{getTransactionStatusBadge(transaction.status)}</TableCell>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Refund</DropdownMenuItem>
                              <DropdownMenuItem>Download Invoice</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Revenue Forecasting */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Revenue Targets
                  </CardTitle>
                  <CardDescription>Monthly and quarterly revenue goals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">January Target</span>
                        <span className="text-sm text-muted-foreground">$89,432 / $95,000</span>
                      </div>
                      <Progress value={94.1} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">94.1% of monthly target achieved</p>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Q1 Target</span>
                        <span className="text-sm text-muted-foreground">$89,432 / $280,000</span>
                      </div>
                      <Progress value={31.9} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">31.9% of quarterly target achieved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>Important business indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">$47.23</div>
                      <div className="text-xs text-muted-foreground">ARPU</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">3.2%</div>
                      <div className="text-xs text-muted-foreground">Churn Rate</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">12.4%</div>
                      <div className="text-xs text-muted-foreground">Conversion</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">$284.50</div>
                      <div className="text-xs text-muted-foreground">LTV</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts, subscriptions, and permissions</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="pl-10 w-64"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Videos</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || "/placeholder.svg"} />
                              <AvatarFallback>
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.plan}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>{user.videosCreated}</TableCell>
                        <TableCell>{user.joinDate}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Edit User</DropdownMenuItem>
                              <DropdownMenuItem>Reset Password</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Suspend User</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>Monthly user registration trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                      <p>Analytics Chart Placeholder</p>
                      <p className="text-sm">Integration with charting library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Monthly recurring revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-2" />
                      <p>Revenue Chart Placeholder</p>
                      <p className="text-sm">Integration with charting library needed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Platform usage metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">156,432</div>
                    <p className="text-sm text-muted-foreground">Total Videos Created</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">2.3M</div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">89.2%</div>
                    <p className="text-sm text-muted-foreground">User Satisfaction</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Alerts</CardTitle>
                  <CardDescription>Recent system notifications and alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{alert.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Server Status</CardTitle>
                  <CardDescription>Current system performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "API Server", status: "healthy", uptime: "99.9%" },
                    { name: "AI Processing", status: "warning", uptime: "98.2%" },
                    { name: "Database", status: "healthy", uptime: "99.8%" },
                    { name: "File Storage", status: "healthy", uptime: "99.9%" },
                  ].map((service) => (
                    <div key={service.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            service.status === "healthy"
                              ? "bg-green-500"
                              : service.status === "warning"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                        />
                        <span className="font-medium">{service.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{service.uptime} uptime</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure global platform settings and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">User Registration</h4>
                      <p className="text-sm text-muted-foreground">Allow new users to register</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">AI Features</h4>
                      <p className="text-sm text-muted-foreground">Enable AI-powered video generation</p>
                    </div>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Maintenance Mode</h4>
                      <p className="text-sm text-muted-foreground">Put platform in maintenance mode</p>
                    </div>
                    <input type="checkbox" className="rounded" />
                  </div>
                </div>

                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Beta Access Tab */}
          <TabsContent value="beta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Private Beta Access</CardTitle>
                <CardDescription>
                  Manage invited emails and invite codes from the admin UI without editing environment variables.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium">Beta Gate</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Keep registration private during beta while preserving the final Vercel + Railway topology.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium">Invited Emails</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Approve testers by email so Google sign-in and direct signup both respect the same allowlist.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium">Invite Codes</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Create reusable invite codes for external testers without redeploying or editing env vars.
                    </p>
                  </div>
                </div>

                <Button asChild>
                  <Link href="/admin/beta">
                    <Shield className="h-4 w-4 mr-2" />
                    Open Beta Access Manager
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
