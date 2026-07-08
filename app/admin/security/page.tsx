"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Shield, AlertTriangle, CheckCircle, Lock, Eye, Database, Globe, Key } from "lucide-react"

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const securityMetrics = {
    overallScore: 94,
    vulnerabilities: {
      critical: 0,
      high: 2,
      medium: 5,
      low: 12,
    },
    compliance: {
      soc2: "Compliant",
      gdpr: "Compliant",
      hipaa: "In Progress",
      iso27001: "Compliant",
    },
  }

  const auditLogs = [
    {
      id: 1,
      timestamp: "2025-01-09 14:30:22",
  user: "admin@forgevid.com",
      action: "User login",
      ip: "192.168.1.100",
      status: "Success",
      risk: "Low",
    },
    {
      id: 2,
      timestamp: "2025-01-09 14:25:15",
      user: "john.doe@company.com",
      action: "Password change",
      ip: "10.0.0.45",
      status: "Success",
      risk: "Medium",
    },
    {
      id: 3,
      timestamp: "2025-01-09 14:20:08",
      user: "system",
      action: "Backup completed",
      ip: "internal",
      status: "Success",
      risk: "Low",
    },
    {
      id: 4,
      timestamp: "2025-01-09 14:15:33",
      user: "jane.smith@company.com",
      action: "Failed login attempt",
      ip: "203.0.113.42",
      status: "Failed",
      risk: "High",
    },
    {
      id: 5,
      timestamp: "2025-01-09 14:10:17",
      user: "system",
      action: "Security scan",
      ip: "internal",
      status: "Success",
      risk: "Low",
    },
  ]

  const threats = [
    {
      id: 1,
      type: "Brute Force",
      source: "203.0.113.42",
      severity: "High",
      status: "Blocked",
      timestamp: "2025-01-09 14:15:33",
    },
    {
      id: 2,
      type: "SQL Injection",
      source: "198.51.100.23",
      severity: "Critical",
      status: "Blocked",
      timestamp: "2025-01-09 13:45:12",
    },
    {
      id: 3,
      type: "DDoS Attempt",
      source: "Multiple IPs",
      severity: "Medium",
      status: "Mitigated",
      timestamp: "2025-01-09 12:30:45",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security & Compliance</h1>
          <p className="text-muted-foreground">Monitor security posture and compliance status</p>
        </div>
        <Button>
          <Shield className="mr-2 h-4 w-4" />
          Run Security Scan
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{securityMetrics.overallScore}%</div>
            <Progress value={securityMetrics.overallScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Excellent security posture</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{threats.length}</div>
            <p className="text-xs text-muted-foreground">All threats blocked/mitigated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {securityMetrics.vulnerabilities.high + securityMetrics.vulnerabilities.critical}
            </div>
            <p className="text-xs text-muted-foreground">High/Critical issues to address</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3/4</div>
            <p className="text-xs text-muted-foreground">Standards compliant</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      <div className="grid gap-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            2 high-priority vulnerabilities detected in third-party dependencies.
            <Button variant="link" className="p-0 h-auto ml-2">
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="threats">Threat Detection</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="encryption">Data Protection</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Security Modules Status</CardTitle>
                <CardDescription>Current status of security components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">WAF Protection</span>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm">Database Encryption</span>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="h-4 w-4" />
                    <span className="text-sm">API Rate Limiting</span>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">DDoS Protection</span>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Breakdown</CardTitle>
                <CardDescription>Security issues by severity level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Critical</span>
                  <Badge variant="destructive">{securityMetrics.vulnerabilities.critical}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">High</span>
                  <Badge variant="destructive">{securityMetrics.vulnerabilities.high}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium</span>
                  <Badge variant="secondary">{securityMetrics.vulnerabilities.medium}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Low</span>
                  <Badge variant="outline">{securityMetrics.vulnerabilities.low}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Threat Detection</CardTitle>
              <CardDescription>Active security threats and mitigation status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Threat Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {threats.map((threat) => (
                    <TableRow key={threat.id}>
                      <TableCell className="font-medium">{threat.type}</TableCell>
                      <TableCell>{threat.source}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            threat.severity === "Critical"
                              ? "destructive"
                              : threat.severity === "High"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {threat.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{threat.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{threat.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Comprehensive log of system activities and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{log.timestamp}</TableCell>
                      <TableCell className="font-medium">{log.user}</TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>{log.ip}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "Success" ? "default" : "destructive"}>{log.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.risk === "High" ? "destructive" : log.risk === "Medium" ? "secondary" : "outline"
                          }
                        >
                          {log.risk}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Standards</CardTitle>
                <CardDescription>Current compliance status across standards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SOC 2 Type II</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">GDPR</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">HIPAA</span>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">ISO 27001</span>
                  <Badge variant="default">Compliant</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Privacy Controls</CardTitle>
                <CardDescription>Privacy and data protection measures</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Retention Policy</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Right to be Forgotten</span>
                  <Badge variant="default">Implemented</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Consent Management</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data Export/Portability</span>
                  <Badge variant="default">Available</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="encryption" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Encryption Status</CardTitle>
                <CardDescription>Data protection and encryption overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data at Rest</span>
                  <Badge variant="default">AES-256 Encrypted</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Data in Transit</span>
                  <Badge variant="default">TLS 1.3</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Encryption</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backup Encryption</span>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Management</CardTitle>
                <CardDescription>Encryption key lifecycle and rotation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Key Rotation</span>
                  <Badge variant="default">Automated (90 days)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">HSM Integration</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Key Escrow</span>
                  <Badge variant="default">Configured</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Access Logging</span>
                  <Badge variant="default">Enabled</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
