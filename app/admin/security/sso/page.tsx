"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react"

type ProviderKey = "SAML" | "OKTA" | "AZURE"

interface SsoConfiguration {
  id?: string
  provider: ProviderKey
  enabled: boolean
  defaultRole?: string
  metadata?: Record<string, any> | null
  metadataUrl?: string | null
  issuer?: string | null
  clientId?: string | null
  clientSecret?: string | null
  tenantId?: string | null
  entityId?: string | null
  certificate?: string | null
  hasClientSecret?: boolean
}

interface LoadedConfigurations {
  SAML: SsoConfiguration
  OKTA: SsoConfiguration
  AZURE: SsoConfiguration
}

const EMPTY_CONFIG: LoadedConfigurations = {
  SAML: {
    provider: "SAML",
    enabled: false,
    metadata: {},
    metadataUrl: "",
    issuer: "",
    entityId: "",
    certificate: "",
    hasClientSecret: false,
  },
  OKTA: {
    provider: "OKTA",
    enabled: false,
    issuer: "",
    clientId: "",
    clientSecret: "",
    hasClientSecret: false,
  },
  AZURE: {
    provider: "AZURE",
    enabled: false,
    tenantId: "",
    clientId: "",
    clientSecret: "",
    hasClientSecret: false,
  },
}

export default function SsoManagementPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingProvider, setSavingProvider] = useState<ProviderKey | null>(null)
  const [configs, setConfigs] = useState<LoadedConfigurations>(EMPTY_CONFIG)

  useEffect(() => {
    let cancelled = false

    async function loadConfigurations() {
      setLoading(true)
      try {
        const response = await fetch("/api/admin/sso")
        if (!response.ok) {
          throw new Error(`Failed to load SSO configurations (${response.status})`)
        }
        const data = await response.json()
        if (!cancelled) {
          const next: LoadedConfigurations = JSON.parse(JSON.stringify(EMPTY_CONFIG))

          for (const configuration of data.configurations as SsoConfiguration[]) {
            const key = configuration.provider as ProviderKey
            next[key] = {
              ...next[key],
              ...configuration,
            }
          }

          setConfigs(next)
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Failed to load SSO",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadConfigurations()
    return () => {
      cancelled = true
    }
  }, [toast])

  const samlMetadataUrl = useMemo(() => "/api/sso/saml/metadata", [])
  const samlLoginUrl = useMemo(() => "/api/sso/saml/login", [])

  async function handleSave(provider: ProviderKey, overrides: Partial<SsoConfiguration>) {
    setSavingProvider(provider)
    try {
      const payload: Record<string, any> = {
        ...configs[provider],
        ...overrides,
        provider,
      }

      delete payload.hasClientSecret
      if (payload.clientSecret === "") {
        delete payload.clientSecret
      }
      if (provider !== "SAML") {
        delete payload.metadata
      }

      const response = await fetch("/api/admin/sso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to save ${provider} configuration`)
      }

      toast({
        title: `${provider} configuration saved`,
        description: "SSO provider updated successfully.",
      })

      const data = await response.json()
      setConfigs((prev) => ({
        ...prev,
        [provider]: {
          ...prev[provider],
          ...data.configuration,
        },
      }))
    } catch (error) {
      toast({
        title: `Unable to save ${provider}`,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setSavingProvider(null)
    }
  }

  function updateConfig(provider: ProviderKey, partial: Partial<SsoConfiguration>) {
    setConfigs((prev) => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        ...partial,
      },
    }))
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Single Sign-On</h1>
          <p className="text-muted-foreground">
            Configure SAML, Okta, and Azure AD integrations for your organization.
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          {configs.SAML.enabled || configs.OKTA.enabled || configs.AZURE.enabled ? (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              SSO Enabled
            </>
          ) : (
            <>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              SSO Disabled
            </>
          )}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* SAML Configuration */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>SAML 2.0</CardTitle>
                <CardDescription>
                  Configure identity provider metadata and certificates for SAML-based login.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Enable</span>
                <Switch
                  checked={configs.SAML.enabled}
                  disabled={loading || savingProvider === "SAML"}
                  onCheckedChange={(checked) => updateConfig("SAML", { enabled: checked })}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="saml-metadata-url">Metadata URL</Label>
                <Input
                  id="saml-metadata-url"
                  placeholder="https://idp.example.com/metadata"
                  value={configs.SAML.metadataUrl ?? ""}
                  onChange={(event) =>
                    updateConfig("SAML", { metadataUrl: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "SAML"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saml-issuer">Issuer</Label>
                <Input
                  id="saml-issuer"
                  placeholder="urn:forgevid:sp"
                  value={configs.SAML.issuer ?? ""}
                  onChange={(event) => updateConfig("SAML", { issuer: event.currentTarget.value })}
                  disabled={loading || savingProvider === "SAML"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saml-entity">Entity ID</Label>
                <Input
                  id="saml-entity"
                  placeholder="urn:forgevid:entity"
                  value={configs.SAML.entityId ?? ""}
                  onChange={(event) => updateConfig("SAML", { entityId: event.currentTarget.value })}
                  disabled={loading || savingProvider === "SAML"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="saml-certificate">Signing Certificate (PEM)</Label>
                <Input
                  id="saml-certificate"
                  placeholder="-----BEGIN CERTIFICATE-----"
                  value={configs.SAML.certificate ?? ""}
                  onChange={(event) =>
                    updateConfig("SAML", { certificate: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "SAML"}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                asChild
                disabled={!configs.SAML.enabled || loading}
              >
                <a href={samlMetadataUrl} target="_blank" rel="noopener noreferrer">
                  Download SP Metadata
                </a>
              </Button>
              <Button
                variant="outline"
                asChild
                disabled={loading}
              >
                <a href={samlLoginUrl}>Initiate SAML Login</a>
              </Button>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button disabled={loading || savingProvider === "SAML"} onClick={() => handleSave("SAML", {})}>
                {savingProvider === "SAML" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save SAML Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Okta configuration */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Okta OpenID Connect</CardTitle>
                <CardDescription>
                  Connect ForgeVid to your Okta organization using OAuth 2.0 / OIDC.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Enable</span>
                <Switch
                  checked={configs.OKTA.enabled}
                  disabled={loading || savingProvider === "OKTA"}
                  onCheckedChange={(checked) => updateConfig("OKTA", { enabled: checked })}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="okta-issuer">Issuer URL</Label>
                <Input
                  id="okta-issuer"
                  placeholder="https://dev-xxxxxx.okta.com/oauth2/default"
                  value={configs.OKTA.issuer ?? ""}
                  onChange={(event) => updateConfig("OKTA", { issuer: event.currentTarget.value })}
                  disabled={loading || savingProvider === "OKTA"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="okta-client-id">Client ID</Label>
                <Input
                  id="okta-client-id"
                  placeholder="0oa1abcd123xyz"
                  value={configs.OKTA.clientId ?? ""}
                  onChange={(event) =>
                    updateConfig("OKTA", { clientId: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "OKTA"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="okta-client-secret">Client Secret</Label>
                <Input
                  id="okta-client-secret"
                  type="password"
                  placeholder={
                    configs.OKTA.hasClientSecret
                      ? "Leave blank to keep existing secret"
                      : "Enter client secret"
                  }
                  value={configs.OKTA.clientSecret ?? ""}
                  onChange={(event) =>
                    updateConfig("OKTA", { clientSecret: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "OKTA"}
                />
                <p className="text-xs text-muted-foreground">
                  {configs.OKTA.hasClientSecret
                    ? "Existing secret will be retained unless you provide a new value."
                    : "Required secret for Okta OAuth integration."}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button disabled={loading || savingProvider === "OKTA"} onClick={() => handleSave("OKTA", {})}>
                {savingProvider === "OKTA" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Okta Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Azure AD configuration */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Azure Active Directory</CardTitle>
                <CardDescription>
                  Enable Azure AD (single-tenant or multi-tenant) authentication for ForgeVid.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Enable</span>
                <Switch
                  checked={configs.AZURE.enabled}
                  disabled={loading || savingProvider === "AZURE"}
                  onCheckedChange={(checked) => updateConfig("AZURE", { enabled: checked })}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="azure-tenant">Tenant ID</Label>
                <Input
                  id="azure-tenant"
                  placeholder="common (or GUID)"
                  value={configs.AZURE.tenantId ?? ""}
                  onChange={(event) =>
                    updateConfig("AZURE", { tenantId: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "AZURE"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="azure-client-id">Client ID (Application ID)</Label>
                <Input
                  id="azure-client-id"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={configs.AZURE.clientId ?? ""}
                  onChange={(event) =>
                    updateConfig("AZURE", { clientId: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "AZURE"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="azure-client-secret">Client Secret</Label>
                <Input
                  id="azure-client-secret"
                  type="password"
                  placeholder={
                    configs.AZURE.hasClientSecret
                      ? "Leave blank to keep existing secret"
                      : "Enter client secret"
                  }
                  value={configs.AZURE.clientSecret ?? ""}
                  onChange={(event) =>
                    updateConfig("AZURE", { clientSecret: event.currentTarget.value })
                  }
                  disabled={loading || savingProvider === "AZURE"}
                />
                <p className="text-xs text-muted-foreground">
                  {configs.AZURE.hasClientSecret
                    ? "Existing secret remains active unless you supply a new one."
                    : "Required secret for Azure AD OAuth."}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button disabled={loading || savingProvider === "AZURE"} onClick={() => handleSave("AZURE", {})}>
                {savingProvider === "AZURE" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Azure Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

