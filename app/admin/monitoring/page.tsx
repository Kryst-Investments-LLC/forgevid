"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts"
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Globe,
  HardDrive,
  MemoryStick,
  Server,
  TrendingUp,
  Users,
} from "lucide-react"

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [realTimeData, setRealTimeData] = useState({
    responseTime: 145,
    errorRate: 0.02,
    throughput: 1247,
    activeUsers: 3421,
  })

  // Mock real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData((prev) => ({
        responseTime: Math.max(50, prev.responseTime + (Math.random() - 0.5) * 20),
        errorRate: Math.max(0, Math.min(5, prev.errorRate + (Math.random() - 0.5) * 0.1)),
        throughput: Math.max(800, prev.throughput + (Math.random() - 0.5) * 100),
        activeUsers: Math.max(2000, prev.activeUsers + Math.floor((Math.random() - 0.5) * 200)),
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const performanceData = [
    { time: "00:00", responseTime: 120, errorRate: 0.1, throughput: 1200 },
    { time: "04:00", responseTime: 110, errorRate: 0.05, throughput: 1100 },
    { time: "08:00", responseTime: 180, errorRate: 0.2, throughput: 1800 },
    { time: "12:00", responseTime: 220, errorRate: 0.3, throughput: 2200 },
    { time: "16:00", responseTime: 190, errorRate: 0.15, throughput: 1900 },
    { time: "20:00", responseTime: 150, errorRate: 0.1, throughput: 1500 },
  ]

  const systemMetrics = {
    cpu: 68,
    memory: 74,
    disk: 45,
    network: 82,
  }

  const alerts = [
    {
      id: 1,
      severity: "high",
      message: "Response time exceeded 200ms threshold",
      timestamp: "2025-01-09 14:30:22",
      status: "active",
    },
    {
      id: 2,
      severity: "medium",
      message: "Memory usage above 70%",
      timestamp: "2025-01-09 14:25:15",
      status: "acknowledged",
    },
    {
      id: 3,
      severity: "low",
      message: "Scheduled maintenance window approaching",
      timestamp: "2025-01-09 14:20:08",
      status: "resolved",
    },
  ]

  const services = [
    { name: "API Gateway", status: "healthy", uptime: 99.98, responseTime: 45 },
    { name: "Video Processing", status: "healthy", uptime: 99.95, responseTime: 1200 },
    { name: "Database", status: "healthy", uptime: 99.99, responseTime: 12 },
    { name: "Authentication", status: "degraded", uptime: 99.85, responseTime: 180 },
    { name: "File Storage", status: "healthy", uptime: 99.97, responseTime: 85 },
    { name: "AI Services", status: "healthy", uptime: 99.92, responseTime: 850 },
  ]

  const errorLogs = [
    {
      id: 1,
      timestamp: "2025-01-09 14:30:22",
      level: "error",
      service: "video-processor",
      message: "Failed to process video: timeout after 30s",
      count: 3,
    },
    {
      id: 2,
      timestamp: "2025-01-09 14:25:15",
      level: "warning",
      service: "auth-service",
      message: "Rate limit exceeded for IP 192.168.1.100",
      count: 12,
    },
    {
      id: 3,
      timestamp: "2025-01-09 14:20:08",
      level: "error",
      service: "database",
      message: "Connection pool exhausted",
      count: 1,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
          <p className="text-muted-foreground">Real-time performance and health monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Activity className="mr-2 h-4 w-4" />
            Health Check
          </Button>
          <Button>
            <AlertTriangle className="mr-2 h-4 w-4" />
            View Alerts
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(realTimeData.responseTime)}ms</div>
            <p className="text-xs text-muted-foreground">
              {realTimeData.responseTime > 200 ? "Above threshold" : "Within limits"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeData.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {realTimeData.errorRate > 1 ? "Elevated errors" : "Normal levels"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(realTimeData.throughput)}</div>
            <p className="text-xs text-muted-foreground">requests/min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeData.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">concurrent sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.filter((alert) => alert.status === "active").length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Alerts</AlertTitle>
          <AlertDescription>
            {alerts.filter((alert) => alert.status === "active").length} active alerts require attention.
            <Button variant="link" className="p-0 h-auto ml-2">
              View All Alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="logs">Logs & Errors</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends (24h)</CardTitle>
                <CardDescription>Response time and throughput over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="responseTime" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current system resource utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CPU Usage</span>
                    <span className="text-sm text-muted-foreground">{systemMetrics.cpu}%</span>
                  </div>
                  <Progress value={systemMetrics.cpu} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm text-muted-foreground">{systemMetrics.memory}%</span>
                  </div>
                  <Progress value={systemMetrics.memory} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Disk Usage</span>
                    <span className="text-sm text-muted-foreground">{systemMetrics.disk}%</span>
                  </div>
                  <Progress value={systemMetrics.disk} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Network I/O</span>
                    <span className="text-sm text-muted-foreground">{systemMetrics.network}%</span>
                  </div>
                  <Progress value={systemMetrics.network} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
                <CardDescription>Detailed performance metrics over the last 24 hours</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Throughput Distribution</CardTitle>
                <CardDescription>Request volume throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="throughput" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.cpu}%</div>
                <Progress value={systemMetrics.cpu} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">{systemMetrics.cpu > 80 ? "High usage" : "Normal"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory</CardTitle>
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.memory}%</div>
                <Progress value={systemMetrics.memory} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">12.8GB / 16GB used</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disk Space</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.disk}%</div>
                <Progress value={systemMetrics.disk} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">450GB / 1TB used</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemMetrics.network}%</div>
                <Progress value={systemMetrics.network} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">820 Mbps throughput</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
              <CardDescription>Current status and performance of all microservices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <Server className="h-4 w-4" />
                          <span>{service.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            service.status === "healthy"
                              ? "default"
                              : service.status === "degraded"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {service.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{service.uptime}%</TableCell>
                      <TableCell>{service.responseTime}ms</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>Recent errors and warnings across all services</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{log.timestamp}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.level === "error" ? "destructive" : log.level === "warning" ? "secondary" : "outline"
                          }
                        >
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.service}</TableCell>
                      <TableCell className="max-w-md truncate">{log.message}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Management</CardTitle>
              <CardDescription>Configure and manage system alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge
                          variant={
                            alert.severity === "high"
                              ? "destructive"
                              : alert.severity === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{alert.message}</TableCell>
                      <TableCell className="text-sm">{alert.timestamp}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            alert.status === "active"
                              ? "destructive"
                              : alert.status === "acknowledged"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {alert.status === "active" && (
                            <Button variant="outline" size="sm">
                              Acknowledge
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            Resolve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
