"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Activity, Zap, AlertTriangle, Clock, Key } from "lucide-react";
export default function APIManagementPage() {
    const [endpoints, setEndpoints] = useState([
        {
            path: "/api/v1/videos",
            method: "GET",
            status: "active",
            rateLimit: 1000,
            requests24h: 15420,
            avgResponseTime: 245,
            errorRate: 0.2,
        },
        {
            path: "/api/v1/videos",
            method: "POST",
            status: "active",
            rateLimit: 100,
            requests24h: 3240,
            avgResponseTime: 1200,
            errorRate: 1.5,
        },
        {
            path: "/api/v1/ai/generate",
            method: "POST",
            status: "active",
            rateLimit: 50,
            requests24h: 8950,
            avgResponseTime: 3500,
            errorRate: 2.1,
        },
    ]);
    const [apiKeys, setApiKeys] = useState([
        {
            id: "1",
            name: "Production App",
            key: "vf_live_sk_1234567890abcdef",
            permissions: ["videos.read", "videos.write", "ai.generate"],
            rateLimit: 1000,
            lastUsed: "2025-01-09T14:30:00Z",
            status: "active",
        },
        {
            id: "2",
            name: "Mobile App",
            key: "vf_live_sk_abcdef1234567890",
            permissions: ["videos.read", "videos.write"],
            rateLimit: 500,
            lastUsed: "2025-01-09T12:15:00Z",
            status: "active",
        },
    ]);
    const [rateLimitConfig, setRateLimitConfig] = useState({
        globalEnabled: true,
        defaultLimit: 1000,
        burstLimit: 100,
        windowSize: 3600,
    });
    return (<div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">API Gateway & Rate Limiting</h1>
        <p className="text-slate-600 mt-2">Manage API endpoints, rate limiting, and access control</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-slate-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4M</div>
            <p className="text-xs text-slate-600">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Endpoints</CardTitle>
            <Zap className="h-4 w-4 text-slate-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-slate-600">3 deprecated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-slate-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245ms</div>
            <p className="text-xs text-slate-600">-15ms from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-600"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.8%</div>
            <p className="text-xs text-slate-600">Within SLA limits</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>Monitor and manage all API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endpoints.map((endpoint, index) => (<div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant={endpoint.method === "GET" ? "secondary" : "default"}>{endpoint.method}</Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                      <Badge variant={endpoint.status === "active"
                ? "default"
                : endpoint.status === "deprecated"
                    ? "destructive"
                    : "secondary"}>
                        {endpoint.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-600">
                      <div>
                        <span className="font-medium">{endpoint.requests24h.toLocaleString()}</span>
                        <span className="ml-1">requests/24h</span>
                      </div>
                      <div>
                        <span className="font-medium">{endpoint.avgResponseTime}ms</span>
                        <span className="ml-1">avg</span>
                      </div>
                      <div>
                        <span className="font-medium">{endpoint.errorRate}%</span>
                        <span className="ml-1">errors</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keys" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API keys and access permissions</CardDescription>
              </div>
              <Button>
                <Key className="h-4 w-4 mr-2"/>
                Generate New Key
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (<div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{key.name}</span>
                        <Badge variant={key.status === "active" ? "default" : "destructive"}>{key.status}</Badge>
                      </div>
                      <code className="text-sm text-slate-600">{key.key}</code>
                      <div className="text-xs text-slate-500">
                        Last used: {new Date(key.lastUsed).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-slate-600">
                        <div>{key.rateLimit}/hour limit</div>
                        <div>{key.permissions.length} permissions</div>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Revoke
                      </Button>
                    </div>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limiting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Configuration</CardTitle>
              <CardDescription>Configure global and endpoint-specific rate limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="global-rate-limiting">Global Rate Limiting</Label>
                  <p className="text-sm text-slate-600">Enable rate limiting across all endpoints</p>
                </div>
                <Switch id="global-rate-limiting" checked={rateLimitConfig.globalEnabled} onCheckedChange={(checked) => setRateLimitConfig((prev) => ({ ...prev, globalEnabled: checked }))}/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-limit">Default Rate Limit (requests/hour)</Label>
                  <Input id="default-limit" type="number" value={rateLimitConfig.defaultLimit} onChange={(e) => setRateLimitConfig((prev) => ({ ...prev, defaultLimit: Number.parseInt(e.target.value) }))}/>
                </div>
                <div>
                  <Label htmlFor="burst-limit">Burst Limit (requests/minute)</Label>
                  <Input id="burst-limit" type="number" value={rateLimitConfig.burstLimit} onChange={(e) => setRateLimitConfig((prev) => ({ ...prev, burstLimit: Number.parseInt(e.target.value) }))}/>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Subscription Tier Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
            { tier: "Free", limit: "100/hour", color: "bg-slate-100" },
            { tier: "Starter", limit: "500/hour", color: "bg-blue-100" },
            { tier: "Pro", limit: "2,000/hour", color: "bg-emerald-100" },
            { tier: "Enterprise", limit: "10,000/hour", color: "bg-purple-100" },
        ].map((tier) => (<div key={tier.tier} className={`p-4 rounded-lg ${tier.color}`}>
                      <div className="font-medium">{tier.tier}</div>
                      <div className="text-sm text-slate-600">{tier.limit}</div>
                    </div>))}
                </div>
              </div>

              <Button>Save Configuration</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Analytics</CardTitle>
              <CardDescription>Detailed analytics and usage patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Top Endpoints by Usage</h4>
                  <div className="space-y-2">
                    {[
            { endpoint: "/api/v1/videos", requests: 15420, percentage: 45 },
            { endpoint: "/api/v1/ai/generate", requests: 8950, percentage: 26 },
            { endpoint: "/api/v1/templates", requests: 5680, percentage: 17 },
            { endpoint: "/api/v1/media", requests: 4120, percentage: 12 },
        ].map((item) => (<div key={item.endpoint} className="flex items-center justify-between">
                        <code className="text-sm">{item.endpoint}</code>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-200 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }}/>
                          </div>
                          <span className="text-sm font-medium">{item.requests.toLocaleString()}</span>
                        </div>
                      </div>))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Response Time Distribution</h4>
                  <div className="space-y-2">
                    {[
            { range: "< 100ms", percentage: 65, color: "bg-green-500" },
            { range: "100-500ms", percentage: 25, color: "bg-yellow-500" },
            { range: "500ms-1s", percentage: 8, color: "bg-orange-500" },
            { range: "> 1s", percentage: 2, color: "bg-red-500" },
        ].map((item) => (<div key={item.range} className="flex items-center justify-between">
                        <span className="text-sm">{item.range}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-200 rounded-full h-2">
                            <div className={`${item.color} h-2 rounded-full`} style={{ width: `${item.percentage}%` }}/>
                          </div>
                          <span className="text-sm font-medium">{item.percentage}%</span>
                        </div>
                      </div>))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
}
