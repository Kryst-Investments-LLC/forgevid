"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Database,
  Download,
  Upload,
  Archive,
  Trash2,
  Shield,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Settings,
} from "lucide-react"

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState("overview")

  const backups = [
    {
      id: "backup_1",
      name: "Daily Full Backup",
      type: "full",
      status: "completed",
      size: "2.4 GB",
      duration: "45 minutes",
      timestamp: "2025-01-09 02:00:00",
      retention: "30 days",
    },
    {
      id: "backup_2",
      name: "Incremental Backup",
      type: "incremental",
      status: "completed",
      size: "156 MB",
      duration: "8 minutes",
      timestamp: "2025-01-09 14:00:00",
      retention: "7 days",
    },
    {
      id: "backup_3",
      name: "Weekly Archive",
      type: "archive",
      status: "in_progress",
      size: "1.8 GB",
      duration: "32 minutes",
      timestamp: "2025-01-09 15:30:00",
      retention: "1 year",
      progress: 67,
    },
  ]

  const dataRetentionPolicies = [
    {
      id: "policy_1",
      name: "User Videos",
      dataType: "videos",
      retention: "2 years",
      autoDelete: true,
      status: "active",
      lastRun: "2025-01-09 01:00:00",
      itemsProcessed: 1247,
    },
    {
      id: "policy_2",
      name: "Audit Logs",
      dataType: "logs",
      retention: "7 years",
      autoDelete: false,
      status: "active",
      lastRun: "2025-01-08 23:00:00",
      itemsProcessed: 5632,
    },
    {
      id: "policy_3",
      name: "Temporary Files",
      dataType: "temp_files",
      retention: "7 days",
      autoDelete: true,
      status: "active",
      lastRun: "2025-01-09 12:00:00",
      itemsProcessed: 892,
    },
  ]

  const exportRequests = [
    {
      id: "export_1",
      requestedBy: "john.doe@company.com",
      dataType: "user_data",
      status: "completed",
      requestDate: "2025-01-08 10:30:00",
      completedDate: "2025-01-08 11:15:00",
      downloadUrl: "/exports/user_data_123.zip",
      expiresAt: "2025-01-15 11:15:00",
    },
    {
      id: "export_2",
      requestedBy: "jane.smith@company.com",
      dataType: "organization_data",
      status: "processing",
      requestDate: "2025-01-09 14:20:00",
      progress: 45,
    },
    {
      id: "export_3",
      requestedBy: "admin@vidforge.ai",
      dataType: "system_logs",
      status: "pending",
      requestDate: "2025-01-09 15:00:00",
    },
  ]

  const storageMetrics = {
    total: 500, // GB
    used: 342,
    available: 158,
    databases: 145,
    files: 187,
    backups: 10,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Management</h1>
          <p className="text-muted-foreground">Manage backups, retention policies, and data exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Status
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Database className="mr-2 h-4 w-4" />
                Create Backup
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Manual Backup</DialogTitle>
                <DialogDescription>Create an on-demand backup of your data</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-name">Backup Name</Label>
                  <Input id="backup-name" placeholder="Enter backup name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backup-type">Backup Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select backup type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Backup</SelectItem>
                      <SelectItem value="incremental">Incremental Backup</SelectItem>
                      <SelectItem value="differential">Differential Backup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" placeholder="Backup description" />
                </div>
                <Button className="w-full">Create Backup</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageMetrics.total} GB</div>
            <Progress value={(storageMetrics.used / storageMetrics.total) * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {storageMetrics.used} GB used, {storageMetrics.available} GB available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageMetrics.databases} GB</div>
            <p className="text-xs text-muted-foreground">Primary database storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Storage</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageMetrics.files} GB</div>
            <p className="text-xs text-muted-foreground">User files and media</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backup Storage</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageMetrics.backups} GB</div>
            <p className="text-xs text-muted-foreground">Backup and archive data</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="retention">Retention Policies</TabsTrigger>
          <TabsTrigger value="exports">Data Exports</TabsTrigger>
          <TabsTrigger value="migrations">Migrations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Backup Status</CardTitle>
                <CardDescription>Recent backup activity and health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Full Backup</span>
                  <Badge variant="default">2 hours ago</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Incremental</span>
                  <Badge variant="default">30 minutes ago</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backup Health</span>
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Next Scheduled</span>
                  <span className="text-sm text-muted-foreground">Tonight 2:00 AM</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Retention</CardTitle>
                <CardDescription>Active retention policies and cleanup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Active Policies</span>
                  <Badge variant="outline">{dataRetentionPolicies.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Cleanup</span>
                  <span className="text-sm text-muted-foreground">4 hours ago</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Items Processed Today</span>
                  <span className="text-sm text-muted-foreground">7,771</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Space Reclaimed</span>
                  <span className="text-sm text-muted-foreground">2.3 GB</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup History</CardTitle>
              <CardDescription>View and manage system backups</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell>
                        <Badge variant={backup.type === "full" ? "default" : "secondary"}>{backup.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {backup.status === "completed" && (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {backup.status === "in_progress" && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">In Progress</Badge>
                            <Progress value={backup.progress} className="w-16 h-2" />
                            <span className="text-xs">{backup.progress}%</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell>{backup.duration}</TableCell>
                      <TableCell className="text-sm">{backup.timestamp}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
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

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>Configure automatic data cleanup and archival</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Retention Period</TableHead>
                    <TableHead>Auto Delete</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataRetentionPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy.dataType}</Badge>
                      </TableCell>
                      <TableCell>{policy.retention}</TableCell>
                      <TableCell>
                        {policy.autoDelete ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Manual</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{policy.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{policy.lastRun}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
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

        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Export Requests</CardTitle>
              <CardDescription>Manage user data export requests for compliance</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exportRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.requestedBy}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{request.dataType}</Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === "completed" && (
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {request.status === "processing" && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">Processing</Badge>
                            <Progress value={request.progress} className="w-16 h-2" />
                            <span className="text-xs">{request.progress}%</span>
                          </div>
                        )}
                        {request.status === "pending" && <Badge variant="outline">Pending</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{request.requestDate}</TableCell>
                      <TableCell className="text-sm">{request.completedDate || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {request.status === "completed" && (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <FileText className="h-4 w-4" />
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

        <TabsContent value="migrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Migrations</CardTitle>
              <CardDescription>Manage database schema changes and migrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Migration Status</AlertTitle>
                <AlertDescription>All migrations are up to date. Database schema version: v2.4.1</AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Schema Version</CardTitle>
                    <CardDescription>Current database schema information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Current Version</span>
                        <Badge variant="default">v2.4.1</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Last Migration</span>
                        <span className="text-sm text-muted-foreground">2025-01-08</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Pending Migrations</span>
                        <Badge variant="outline">0</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Migration Tools</CardTitle>
                    <CardDescription>Database management utilities</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Check for Updates
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Database className="mr-2 h-4 w-4" />
                      Run Migration
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Archive className="mr-2 h-4 w-4" />
                      Rollback Migration
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
