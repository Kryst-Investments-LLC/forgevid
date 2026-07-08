"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Zap, Database, Globe, Server, BarChart3, TrendingUp, Cpu, HardDrive, Network } from "lucide-react"

export default function PerformancePage() {
  const [metrics, setMetrics] = useState({
    coreWebVitals: {
      lcp: 1.2, // Largest Contentful Paint
      fid: 45, // First Input Delay
      cls: 0.08, // Cumulative Layout Shift
    },
    serverMetrics: {
      responseTime: 120,
      throughput: 1250,
      errorRate: 0.02,
      uptime: 99.98,
    },
    cacheMetrics: {
      hitRate: 94.5,
      missRate: 5.5,
      size: 2.4, // GB
      evictions: 12,
    },
    cdnMetrics: {
      bandwidth: 45.2, // GB
      requests: 125000,
      cacheRatio: 92.1,
      edgeLocations: 28,
    },
  })

  const [optimizations, setOptimizations] = useState([
    { id: 1, name: "Image Compression", status: "active", impact: "high", savings: "45% size reduction" },
    { id: 2, name: "Code Splitting", status: "active", impact: "medium", savings: "30% faster load" },
    { id: 3, name: "CDN Caching", status: "active", impact: "high", savings: "60% faster delivery" },
    { id: 4, name: "Database Indexing", status: "active", impact: "high", savings: "80% query speed" },
    { id: 5, name: "Lazy Loading", status: "pending", impact: "medium", savings: "25% initial load" },
    { id: 6, name: "Service Worker", status: "pending", impact: "medium", savings: "Offline capability" },
  ])

  const getScoreColor = (score: number, type: string) => {
    if (type === "lcp") return score < 2.5 ? "text-green-600" : score < 4 ? "text-yellow-600" : "text-red-600"
    if (type === "fid") return score < 100 ? "text-green-600" : score < 300 ? "text-yellow-600" : "text-red-600"
    if (type === "cls") return score < 0.1 ? "text-green-600" : score < 0.25 ? "text-yellow-600" : "text-red-600"
    return "text-gray-600"
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      disabled: "bg-gray-100 text-gray-800",
    }
    return variants[status as keyof typeof variants] || variants.disabled
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance & Scalability</h1>
          <p className="text-gray-600 mt-2">Monitor and optimize platform performance metrics</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Zap className="w-4 h-4 mr-2" />
          Run Performance Audit
        </Button>
      </div>

      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Core Metrics</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="scaling">Auto Scaling</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-blue-600" />
                  Core Web Vitals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">LCP (Largest Contentful Paint)</span>
                    <span className={`font-semibold ${getScoreColor(metrics.coreWebVitals.lcp, "lcp")}`}>
                      {metrics.coreWebVitals.lcp}s
                    </span>
                  </div>
                  <Progress value={Math.max(0, 100 - (metrics.coreWebVitals.lcp / 4) * 100)} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">FID (First Input Delay)</span>
                    <span className={`font-semibold ${getScoreColor(metrics.coreWebVitals.fid, "fid")}`}>
                      {metrics.coreWebVitals.fid}ms
                    </span>
                  </div>
                  <Progress value={Math.max(0, 100 - (metrics.coreWebVitals.fid / 300) * 100)} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">CLS (Cumulative Layout Shift)</span>
                    <span className={`font-semibold ${getScoreColor(metrics.coreWebVitals.cls, "cls")}`}>
                      {metrics.coreWebVitals.cls}
                    </span>
                  </div>
                  <Progress value={Math.max(0, 100 - (metrics.coreWebVitals.cls / 0.25) * 100)} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Server className="w-4 h-4 mr-2 text-green-600" />
                  Server Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Response Time</span>
                  <span className="font-semibold text-green-600">{metrics.serverMetrics.responseTime}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Throughput</span>
                  <span className="font-semibold">{metrics.serverMetrics.throughput} req/min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="font-semibold text-green-600">{metrics.serverMetrics.errorRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="font-semibold text-green-600">{metrics.serverMetrics.uptime}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Globe className="w-4 h-4 mr-2 text-purple-600" />
                  CDN Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bandwidth Used</span>
                  <span className="font-semibold">{metrics.cdnMetrics.bandwidth} GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Requests</span>
                  <span className="font-semibold">{metrics.cdnMetrics.requests.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cache Hit Ratio</span>
                  <span className="font-semibold text-green-600">{metrics.cdnMetrics.cacheRatio}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Edge Locations</span>
                  <span className="font-semibold">{metrics.cdnMetrics.edgeLocations}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Optimizations</CardTitle>
              <CardDescription>Active and pending performance improvements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div>
                        <h4 className="font-medium">{opt.name}</h4>
                        <p className="text-sm text-gray-600">{opt.savings}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusBadge(opt.status)}>{opt.status}</Badge>
                      <Badge
                        variant="outline"
                        className={
                          opt.impact === "high"
                            ? "border-red-200 text-red-700"
                            : opt.impact === "medium"
                              ? "border-yellow-200 text-yellow-700"
                              : "border-green-200 text-green-700"
                        }
                      >
                        {opt.impact} impact
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caching" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2 text-blue-600" />
                  Cache Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Hit Rate</span>
                    <span className="font-semibold text-green-600">{metrics.cacheMetrics.hitRate}%</span>
                  </div>
                  <Progress value={metrics.cacheMetrics.hitRate} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Cache Size</span>
                    <span className="font-semibold">{metrics.cacheMetrics.size} GB</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Evictions (24h)</span>
                  <span className="font-semibold">{metrics.cacheMetrics.evictions}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Clear Application Cache
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Network className="w-4 h-4 mr-2" />
                  Purge CDN Cache
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Database className="w-4 h-4 mr-2" />
                  Optimize Database Cache
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Cache Analytics Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scaling" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Auto Scaling Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Instances</span>
                  <span className="font-semibold">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Target CPU Usage</span>
                  <span className="font-semibold">70%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Scale Up Threshold</span>
                  <span className="font-semibold">80%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Scale Down Threshold</span>
                  <span className="font-semibold">30%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <Cpu className="w-4 h-4 mr-1" />
                      CPU Usage
                    </span>
                    <span className="font-semibold">65%</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <HardDrive className="w-4 h-4 mr-1" />
                      Memory Usage
                    </span>
                    <span className="font-semibold">72%</span>
                  </div>
                  <Progress value={72} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 flex items-center">
                      <Network className="w-4 h-4 mr-1" />
                      Network I/O
                    </span>
                    <span className="font-semibold">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
