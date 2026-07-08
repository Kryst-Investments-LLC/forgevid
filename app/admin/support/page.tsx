"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MessageCircle,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Search,
  Filter,
  MoreHorizontal,
} from "lucide-react"

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([
    {
      id: "TK-001",
      subject: "Unable to export video in 4K",
      customer: "john.doe@company.com",
      priority: "high",
      status: "open",
      assignee: "Sarah Chen",
      created: "2025-01-09T10:30:00Z",
      updated: "2025-01-09T14:22:00Z",
      plan: "Pro",
    },
    {
      id: "TK-002",
      subject: "API rate limit questions",
      customer: "dev@startup.io",
      priority: "medium",
      status: "in-progress",
      assignee: "Mike Johnson",
      created: "2025-01-09T09:15:00Z",
      updated: "2025-01-09T13:45:00Z",
      plan: "Enterprise",
    },
    {
      id: "TK-003",
      subject: "Billing inquiry for team plan",
      customer: "billing@agency.com",
      priority: "low",
      status: "resolved",
      assignee: "Lisa Wang",
      created: "2025-01-08T16:20:00Z",
      updated: "2025-01-09T11:10:00Z",
      plan: "Enterprise",
    },
  ])

  const [metrics, setMetrics] = useState({
    totalTickets: 156,
    openTickets: 23,
    avgResponseTime: "2.4 hours",
    satisfactionScore: 4.8,
    resolvedToday: 12,
    escalatedTickets: 3,
  })

  const getStatusColor = (status: string) => {
    const colors = {
      open: "bg-red-100 text-red-800",
      "in-progress": "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    }
    return colors[status as keyof typeof colors] || colors.open
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
      urgent: "bg-purple-100 text-purple-800",
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Management</h1>
          <p className="text-gray-600 mt-2">Manage customer support tickets and SLA monitoring</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <MessageCircle className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tickets</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalTickets}</p>
              </div>
              <MessageCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Tickets</p>
                <p className="text-2xl font-bold text-red-600">{metrics.openTickets}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-green-600">{metrics.avgResponseTime}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.satisfactionScore}/5</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">{metrics.resolvedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Escalated</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.escalatedTickets}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
          <TabsTrigger value="sla">SLA Monitoring</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="team">Support Team</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>Manage and track customer support requests</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input placeholder="Search tickets..." className="pl-10 w-64" />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
                          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
                          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                          <Badge variant="outline">{ticket.plan}</Badge>
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <span className="flex items-center">
                            <User className="w-4 h-4 mr-1" />
                            {ticket.customer}
                          </span>
                          <span>ID: {ticket.id}</span>
                          <span>Assigned to: {ticket.assignee}</span>
                          <span>Updated: {new Date(ticket.updated).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>SLA Performance</CardTitle>
                <CardDescription>Service level agreement metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">First Response (Free)</span>
                  <span className="font-semibold text-green-600">4.2h / 24h target</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">First Response (Pro)</span>
                  <span className="font-semibold text-green-600">1.8h / 4h target</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">First Response (Enterprise)</span>
                  <span className="font-semibold text-green-600">0.5h / 1h target</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Resolution Time</span>
                  <span className="font-semibold text-yellow-600">18h / 24h target</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Violations</CardTitle>
                <CardDescription>Recent SLA breaches requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900">TK-045 - Enterprise Customer</p>
                      <p className="text-sm text-red-700">Response time: 2.5h (Target: 1h)</p>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Breach</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-900">TK-038 - Pro Customer</p>
                      <p className="text-sm text-yellow-700">Resolution time: 26h (Target: 24h)</p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base Management</CardTitle>
              <CardDescription>Manage help articles and documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Total Articles</h3>
                  <p className="text-3xl font-bold text-blue-600">127</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Views This Month</h3>
                  <p className="text-3xl font-bold text-green-600">15.2K</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Avg Rating</h3>
                  <p className="text-3xl font-bold text-yellow-600">4.6/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Team Performance</CardTitle>
              <CardDescription>Track team member performance and workload</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Sarah Chen", tickets: 23, avgResponse: "1.2h", satisfaction: 4.9 },
                  { name: "Mike Johnson", tickets: 18, avgResponse: "2.1h", satisfaction: 4.7 },
                  { name: "Lisa Wang", tickets: 15, avgResponse: "1.8h", satisfaction: 4.8 },
                ].map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-600">{member.tickets} active tickets</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600">Avg Response</p>
                        <p className="font-semibold">{member.avgResponse}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Satisfaction</p>
                        <p className="font-semibold">{member.satisfaction}/5</p>
                      </div>
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
