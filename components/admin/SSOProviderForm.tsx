"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { SSOProvider } from "@prisma/client"

type FieldDefinition = {
  name: string
  label: string
  placeholder?: string
  type?: string
  multiline?: boolean
}

type SsoConfigurationState = {
  enabled: boolean
  metadataUrl?: string | null
  issuer?: string | null
  clientId?: string | null
  clientSecret?: string | null
  tenantId?: string | null
  entityId?: string | null
  certificate?: string | null
  metadata?: Record<string, any> | null
}

interface SSOProviderFormProps {
  provider: SSOProvider
  title: string
  description: string
  fields: FieldDefinition[]
  configuration?: Partial<SsoConfigurationState>
  onChange?: () => void
}

export function SSOProviderForm({ provider, title, description, fields, configuration, onChange }: SSOProviderFormProps) {
  const [isEnabled, setIsEnabled] = useState(configuration?.enabled ?? false)
  const [formState, setFormState] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {}
    fields.forEach((field) => {
      const value = (configuration as any)?.[field.name]
      if (value !== undefined && value !== null) {
        defaults[field.name] = String(value)
      }
    })
    return defaults
  })
  const [metadata, setMetadata] = useState(
    configuration?.metadata ? JSON.stringify(configuration.metadata, null, 2) : ""
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setMessage(null)
    setError(null)

    try {
      let parsedMetadata: Record<string, any> | undefined
      if (metadata.trim()) {
        parsedMetadata = JSON.parse(metadata)
      }

      const payload = {
        provider,
        enabled: isEnabled,
        metadata: parsedMetadata,
        ...formState,
      }

      const response = await fetch('/api/admin/sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || 'Unable to save configuration')
      }

      setMessage('Configuration saved successfully.')
      onChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={isEnabled ? "default" : "secondary"}>{isEnabled ? "Enabled" : "Disabled"}</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Enable {title}</p>
            <p className="text-xs text-muted-foreground">Toggle to activate this provider for users.</p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
        </div>

        <div className="grid gap-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`${provider}-${field.name}`}>{field.label}</Label>
              {field.multiline ? (
                <Textarea
                  id={`${provider}-${field.name}`}
                  placeholder={field.placeholder}
                  value={formState[field.name] ?? ''}
                  onChange={(event) => handleInputChange(field.name, event.target.value)}
                />
              ) : (
                <Input
                  id={`${provider}-${field.name}`}
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={formState[field.name] ?? ''}
                  onChange={(event) => handleInputChange(field.name, event.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${provider}-metadata`}>Advanced Metadata (JSON)</Label>
          <Textarea
            id={`${provider}-metadata`}
            placeholder="{ &quot;entryPoint&quot;: &quot;https://idp.example.com/sso&quot; }"
            value={metadata}
            onChange={(event) => setMetadata(event.target.value)}
            className="font-mono text-xs"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Provider-specific metadata, such as entryPoint, logoutUrl, audience, or privateKey.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardFooter>
    </Card>
  )
}

