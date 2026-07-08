"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, Ticket, UserPlus } from 'lucide-react'

interface BetaAccessEntry {
  id: string
  email: string | null
  inviteCode: string | null
  note: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: string
    email: string
    name: string | null
  } | null
}

export default function BetaAccessAdminPage() {
  const [entries, setEntries] = useState<BetaAccessEntry[]>([])
  const [betaModeEnabled, setBetaModeEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [note, setNote] = useState('')

  const loadEntries = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/beta-access', { cache: 'no-store' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to load beta access entries')
      }
      const data = await response.json()
      setEntries(data.entries || [])
      setBetaModeEnabled(Boolean(data.betaModeEnabled))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load beta access entries')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleCreate = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/beta-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, inviteCode, note }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to create beta access entry')
      }
      setEmail('')
      setInviteCode('')
      setNote('')
      await loadEntries()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create beta access entry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (entry: BetaAccessEntry) => {
    setError(null)
    try {
      const response = await fetch('/api/admin/beta-access', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, isActive: !entry.isActive }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to update beta access entry')
      }
      await loadEntries()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update beta access entry')
    }
  }

  const handleDelete = async (entryId: string) => {
    setError(null)
    try {
      const response = await fetch('/api/admin/beta-access', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entryId }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Failed to delete beta access entry')
      }
      await loadEntries()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete beta access entry')
    }
  }

  const activeEntries = entries.filter((entry) => entry.isActive)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Beta Access</h1>
        <p className="text-muted-foreground">
          Manage invited emails and invite codes for your private beta without editing environment variables.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Beta Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={betaModeEnabled ? 'default' : 'secondary'}>
              {betaModeEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <p className="mt-3 text-sm text-muted-foreground">
              Toggle private beta globally with the `BETA_MODE` environment variable on Vercel.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              Active Invites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeEntries.length}</p>
            <p className="text-sm text-muted-foreground">Emails and invite codes currently accepted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket className="h-4 w-4" />
              Total Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{entries.length}</p>
            <p className="text-sm text-muted-foreground">Stored in PostgreSQL and usable across deploys</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Beta Access Rule</CardTitle>
          <CardDescription>Add an invited email, an invite code, or both.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="beta-email">Invited Email</Label>
              <Input
                id="beta-email"
                placeholder="tester@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="beta-invite-code">Invite Code</Label>
              <Input
                id="beta-invite-code"
                placeholder="BETA-FOUNDERS"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beta-note">Note</Label>
            <Input
              id="beta-note"
              placeholder="Founder cohort, design testers, investors, etc."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={isSaving || (!email.trim() && !inviteCode.trim())}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Beta Access Rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Beta Access Rules</CardTitle>
          <CardDescription>Disable a rule temporarily or delete it permanently.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading beta access entries...
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No beta access rules yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Invite Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.email || '—'}</TableCell>
                    <TableCell>{entry.inviteCode || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={entry.isActive ? 'default' : 'secondary'}>
                        {entry.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.note || '—'}</TableCell>
                    <TableCell>{entry.createdBy?.name || entry.createdBy?.email || 'System'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleToggle(entry)}>
                          {entry.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(entry.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}