"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Shield, Settings, Search, MoreHorizontal, Edit, Lock } from "lucide-react"
import { SSOProviderForm } from "@/components/admin/SSOProviderForm"
import type { SSOProvider } from "@prisma/client"

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [ssoConfigurations, setSsoConfigurations] = useState<Record<string, any>>({})
  const [isLoadingSso, setIsLoadingSso] = useState(true)
  const [ssoError, setSsoError] = useState<string | null>(null)

  const loadSsoConfigurations = async () => {
    setIsLoadingSso(true)
    setSsoError(null)
    try {
      const response = await fetch("/api/admin/sso")
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || "Unable to load SSO configuration")
      }
      const data = await response.json()
      const nextState: Record<SSOProvider, any> = {} as Record<SSOProvider, any>
      for (const config of data?.configurations ?? []) {
        nextState[config.provider as SSOProvider] = config
      }
      setSsoConfigurations(nextState)
    } catch (error) {
      setSsoError(error instanceof Error ? error.message : "Failed to fetch SSO configuration")
    } finally {
      setIsLoadingSso(false)
    }
  }

  useEffect(() => {
    loadSsoConfigurations()
  }, [])

  const users = [
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@company.com",
      role: "admin",
      status: "active",
      lastLogin: "2025-01-09 14:30:22",
  organization: "Kryst Investments LLC",
      mfaEnabled: true,
      createdAt: "2024-12-01",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@company.com",
      role: "manager",
      status: "active",
      lastLogin: "2025-01-09 12:15:10",
  organization: "Kryst Investments LLC",
      mfaEnabled: false,
      createdAt: "2024-12-15",
    },
    {
      id: "3",
      name: "Bob Wilson",
      email: "bob.wilson@external.com",
      role: "user",
      status: "suspended",
      lastLogin: "2025-01-08 09:45:33",
      organization: "External Corp",
      mfaEnabled: true,
      createdAt: "2025-01-05",
    },
  ]

  const organizations = [
    {
      id: "org_1",
  name: "Kryst Investments LLC",
  domain: "forgevid.com",
      userCount: 45,
      ssoEnabled: true,
      ssoProvider: "okta",
      plan: "enterprise",
    },
    {
      id: "org_2",
      name: "External Corp",
      domain: "external.com",
      userCount: 12,
      ssoEnabled: false,
      plan: "pro",
    },
  ]

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions across your organization</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account with appropriate permissions</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter email address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organization">Organization</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">Create User</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="sso">SSO Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <CardDescription>Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.status === "active"
                              ? "default"
                              : user.status === "suspended"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.organization}</TableCell>
                      <TableCell className="text-sm">{user.lastLogin}</TableCell>
                      <TableCell>
                        {user.mfaEnabled ? (
                          <Badge variant="default">
                            <Shield className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Lock className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
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

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>Manage organization settings and SSO configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>SSO</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.domain}</TableCell>
                      <TableCell>{org.userCount}</TableCell>
                      <TableCell>
                        <Badge variant={org.plan === "enterprise" ? "default" : "secondary"}>{org.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        {org.ssoEnabled ? (
                          <Badge variant="default">{org.ssoProvider}</Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Viewer</CardTitle>
                <CardDescription>Basic access to view content</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• Create videos</li>
                  <li>• Edit videos</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">User</CardTitle>
                <CardDescription>Standard user permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• All Viewer permissions</li>
                  <li>• Delete videos</li>
                  <li>• Share videos</li>
                  <li>• Export videos</li>
                  <li>• Use AI generation</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manager</CardTitle>
                <CardDescription>Team management capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• All User permissions</li>
                  <li>• Advanced AI features</li>
                  <li>• Manage collaboration</li>
                  <li>• View organization users</li>
                  <li>• View billing</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin</CardTitle>
                <CardDescription>Full system access</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1">
                  <li>• All Manager permissions</li>
                  <li>• Manage all users</li>
                  <li>• System monitoring</li>
                  <li>• Security management</li>
                  <li>• Full admin access</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sso" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SSO Configuration</CardTitle>
              <CardDescription>Configure Single Sign-On for enterprise authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSso && <p className="text-sm text-muted-foreground">Loading SSO configurations...</p>}
              {ssoError && <p className="text-sm text-destructive">{ssoError}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <SSOProviderForm
                  provider="SAML"
                  title="SAML 2.0"
                  description="Enterprise SAML integration with metadata exchange, assertions, and certificates."
                  configuration={ssoConfigurations.SAML}
                  fields={[
                    { name: "metadataUrl", label: "IdP Metadata URL", placeholder: "https://idp.example.com/metadata.xml" },
                    { name: "entityId", label: "Service Provider Entity ID", placeholder: "urn:forgevid:sp" },
                    { name: "certificate", label: "IdP Certificate", multiline: true, placeholder: "-----BEGIN CERTIFICATE-----" },
                  ]}
                  onChange={loadSsoConfigurations}
                />

                <SSOProviderForm
                  provider="OKTA"
                  title="Okta"
                  description="Authenticate employees with Okta via OpenID Connect."
                  configuration={ssoConfigurations.OKTA}
                  fields={[
                    { name: "issuer", label: "Issuer / Okta Domain", placeholder: "https://dev-123456.okta.com" },
                    { name: "clientId", label: "Client ID", placeholder: "0oa123example" },
                    { name: "clientSecret", label: "Client Secret", placeholder: "********", type: "password" },
                  ]}
                  onChange={loadSsoConfigurations}
                />

                <SSOProviderForm
                  provider="AZURE"
                  title="Azure Active Directory"
                  description="Microsoft Azure AD SSO with organizational provisioning."
                  configuration={ssoConfigurations.AZURE}
                  fields={[
                    { name: "tenantId", label: "Tenant ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                    { name: "clientId", label: "Client ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
                    { name: "clientSecret", label: "Client Secret", placeholder: "********", type: "password" },
                  ]}
                  onChange={loadSsoConfigurations}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
