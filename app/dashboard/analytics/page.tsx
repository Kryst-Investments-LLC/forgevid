"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, Users, Play, Download, Zap, AlertTriangle } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription-simple"

export default function AnalyticsPage() {
  const { subscription } = useSubscription()

  // Mock usage data - replace with real API calls
  const usageData = {
    videoMinutes: { used: 45, limit: subscription?.plan === "pro" ? -1 : 50, percentage: 90 },
    exports: { used: 15, limit: subscription?.plan === "pro" ? -1 : 20, percentage: 75 },
    storage: { used: 12.5, limit: subscription?.plan === "pro" ? 100 : 20, percentage: 62.5 },
    collaborators: { used: 3, limit: subscription?.plan === "pro" ? -1 : 1, percentage: 100 },
  }

  const monthlyStats = [
    { month: "Jan", videos: 12, exports: 45, minutes: 180 },
    { month: "Feb", videos: 18, exports: 62, minutes: 240 },
    { month: "Mar", videos: 25, exports: 89, minutes: 320 },
    { month: "Apr", videos: 32, exports: 124, minutes: 450 },
    { month: "May", videos: 28, exports: 98, minutes: 380 },
    { month: "Jun", videos: 35, exports: 142, minutes: 520 },
  ]

  const topTemplates = [
    { name: "Modern Product Showcase", uses: 45, category: "Business" },
    { name: "Social Media Story", uses: 38, category: "Social" },
    { name: "YouTube Intro", uses: 32, category: "Entertainment" },
    { name: "Corporate Presentation", uses: 28, category: "Business" },
    { name: "Marketing Campaign", uses: 24, category: "Marketing" },
  ]

  return (
  <div className="min-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">Track your usage, performance, and growth metrics</p>
            </div>

            <div className="flex items-center gap-4">
              <select className="border rounded px-3 py-2 text-sm">
                <option value="30">Last 30 days</option>
                <option value="7">Last 7 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <Button variant="outline" className="bg-transparent">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          <Tabs defaultValue="usage" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="usage">Usage & Limits</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="space-y-6">
              {/* Usage Overview Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Video Minutes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{usageData.videoMinutes.used}</span>
                        <Badge variant={usageData.videoMinutes.percentage > 80 ? "destructive" : "secondary"}>
                          {usageData.videoMinutes.limit === -1 ? "Unlimited" : `/${usageData.videoMinutes.limit}`}
                        </Badge>
                      </div>
                      {usageData.videoMinutes.limit !== -1 && (
                        <Progress value={usageData.videoMinutes.percentage} className="h-2" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {usageData.videoMinutes.percentage > 80 ? "Approaching limit" : "Within limits"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Exports Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{usageData.exports.used}</span>
                        <Badge variant={usageData.exports.percentage > 80 ? "destructive" : "secondary"}>
                          {usageData.exports.limit === -1 ? "Unlimited" : `/${usageData.exports.limit}`}
                        </Badge>
                      </div>
                      {usageData.exports.limit !== -1 && (
                        <Progress value={usageData.exports.percentage} className="h-2" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {usageData.exports.percentage > 80 ? "Consider upgrading" : "Good usage"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Storage Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{usageData.storage.used}GB</span>
                        <Badge variant="secondary">
                          {usageData.storage.limit === -1 ? "Unlimited" : `/${usageData.storage.limit}GB`}
                        </Badge>
                      </div>
                      <Progress value={usageData.storage.percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">Efficient storage usage</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Collaborators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{usageData.collaborators.used}</span>
                        <Badge variant="secondary">
                          {usageData.collaborators.limit === -1 ? "Unlimited" : `/${usageData.collaborators.limit}`}
                        </Badge>
                      </div>
                      {usageData.collaborators.limit !== -1 && (
                        <Progress value={usageData.collaborators.percentage} className="h-2" />
                      )}
                      <p className="text-xs text-muted-foreground">
                        {subscription?.plan === "pro" ? "Unlimited team size" : "Upgrade for more"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Usage Warnings */}
              {Object.values(usageData).some((usage) => usage.percentage > 80) && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                      <AlertTriangle className="h-4 w-4" />
                      Usage Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {usageData.videoMinutes.percentage > 80 && (
                        <p className="text-sm text-orange-700">
                          You've used {usageData.videoMinutes.percentage}% of your video minutes this month.
                        </p>
                      )}
                      {usageData.exports.percentage > 80 && (
                        <p className="text-sm text-orange-700">
                          You've used {usageData.exports.percentage}% of your export limit.
                        </p>
                      )}
                      <Button size="sm" className="mt-3">
                        Upgrade Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Monthly Usage Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Usage Trends</CardTitle>
                  <CardDescription>Track your video creation activity over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-4">
                      {monthlyStats.map((month, index) => (
                        <div key={month.month} className="text-center">
                          <div className="space-y-2">
                            <div className="h-20 bg-muted rounded flex items-end justify-center p-2">
                              <div
                                className="bg-primary rounded-t w-full"
                                style={{ height: `${(month.videos / 40) * 100}%` }}
                              />
                            </div>
                            <div className="text-xs">
                              <div className="font-medium">{month.month}</div>
                              <div className="text-muted-foreground">{month.videos} videos</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {/* Performance Metrics */}
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Average Export Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">2.3 min</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      15% faster than last month
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">98.5%</div>
                    <p className="text-xs text-muted-foreground">Exports completed successfully</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">AI Generation Speed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">45 sec</div>
                    <p className="text-xs text-muted-foreground">Average AI video generation</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Most Used Templates</CardTitle>
                  <CardDescription>Your favorite templates this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topTemplates.map((template, index) => (
                      <div key={template.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{template.name}</div>
                            <div className="text-xs text-muted-foreground">{template.category}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-sm">{template.uses} uses</div>
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${(template.uses / 50) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Video Performance</CardTitle>
                    <CardDescription>How your videos are performing</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Average View Duration</span>
                        <span className="font-medium">1:45</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Completion Rate</span>
                        <span className="font-medium">78%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Engagement Score</span>
                        <Badge>High</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Social Media Reach</CardTitle>
                    <CardDescription>Cross-platform performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">YouTube</span>
                        <span className="font-medium">2.4K views</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Instagram</span>
                        <span className="font-medium">1.8K views</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">TikTok</span>
                        <span className="font-medium">3.2K views</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendations</CardTitle>
                    <CardDescription>Personalized suggestions to improve your content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="font-medium text-sm text-blue-800">Optimal Video Length</div>
                        <div className="text-xs text-blue-600 bg-white px-1 rounded">Your audience engages best with 60-90 second videos</div>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="font-medium text-sm text-green-800">Best Upload Time</div>
                        <div className="text-xs text-green-600">Tuesday 2-4 PM shows highest engagement</div>
                      </div>
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="font-medium text-sm text-purple-800">Content Style</div>
                        <div className="text-xs text-purple-600">Modern, energetic styles perform 40% better</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Growth Opportunities</CardTitle>
                    <CardDescription>Areas to focus on for better results</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Add Captions</div>
                          <div className="text-xs text-muted-foreground">Increase accessibility</div>
                        </div>
                        <Badge variant="outline">+25% reach</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Use Trending Music</div>
                          <div className="text-xs text-muted-foreground">Boost algorithm visibility</div>
                        </div>
                        <Badge variant="outline">+40% views</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">Consistent Branding</div>
                          <div className="text-xs text-muted-foreground">Build recognition</div>
                        </div>
                        <Badge variant="outline">+15% retention</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
  </div>
  )
}
