"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Shield, Smartphone, Key, RefreshCcw, Loader2 } from "lucide-react"
import Link from "next/link"
import QRCode from "qrcode"
import { withCsrfHeaders } from "@/lib/csrf-client"

type MfaStep = "idle" | "generating" | "verify" | "enabled"

interface MfaStatusResponse {
  mfaEnabled: boolean
  hasSecret: boolean
}

interface MfaSetupResponse {
  secret: string
  otpauthUrl: string
}

interface MfaVerifyResponse {
  success: boolean
  backupCodes?: string[]
}

export default function MFASetupPage() {
  const [status, setStatus] = useState<MfaStatusResponse>({ mfaEnabled: false, hasSecret: false })
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<MfaStep>("idle")
  const [secret, setSecret] = useState("")
  const [otpauthUrl, setOtpauthUrl] = useState("")
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")
  const [mfaCode, setMfaCode] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [disableCode, setDisableCode] = useState("")

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/auth/mfa")
        if (!response.ok) {
          throw new Error("Failed to fetch MFA status")
        }
        const data = (await response.json()) as MfaStatusResponse
        setStatus(data)
        setStep(data.mfaEnabled ? "enabled" : "idle")
      } catch (err) {
        console.error(err)
        setError("Unable to load MFA status. Please refresh the page.")
      }
    }

    fetchStatus()
  }, [])

  const generateQrCode = useCallback(async (otpauth: string) => {
    const dataUrl = await QRCode.toDataURL(otpauth)
    setQrCodeDataUrl(dataUrl)
  }, [])

  const handleGenerateSecret = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: withCsrfHeaders(),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to generate MFA secret")
      }

      const data = (await response.json()) as MfaSetupResponse
      setSecret(data.secret)
      setOtpauthUrl(data.otpauthUrl)
      await generateQrCode(data.otpauthUrl)

      setStatus((prev) => ({ ...prev, hasSecret: true }))
      setStep("verify")
    } catch (err) {
      console.error(err)
      setError("Could not generate MFA secret. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (mfaCode.length !== 6) return

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/mfa", {
        method: "PUT",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ token: mfaCode }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Invalid MFA code")
      }

      const data = (await response.json()) as MfaVerifyResponse
      setBackupCodes(data.backupCodes ?? [])
      setStatus({ mfaEnabled: true, hasSecret: true })
      setStep("enabled")
      setMessage("Multi-factor authentication enabled successfully.")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Failed to verify MFA code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      setError("Enter a current 6-digit authenticator code to disable MFA.")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/auth/mfa", {
        method: "DELETE",
        headers: withCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ token: disableCode }),
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error || "Failed to disable MFA")
      }

      setStatus({ mfaEnabled: false, hasSecret: false })
      setSecret("")
      setOtpauthUrl("")
      setQrCodeDataUrl("")
      setBackupCodes([])
      setMfaCode("")
      setDisableCode("")
      setStep("idle")
      setMessage("Multi-factor authentication has been disabled.")
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unable to disable MFA. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-bold">ForgeVid Security</span>
        </div>

        <Card>
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Multi-Factor Authentication</CardTitle>
            <CardDescription>
              Add an extra layer of protection to your ForgeVid account using authenticator apps like Google Authenticator,
              1Password, or Authy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "idle" && (
              <div className="space-y-4">
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    You'll need an authenticator app capable of scanning QR codes or entering a setup key manually.
                  </AlertDescription>
                </Alert>

                <Button onClick={handleGenerateSecret} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set up MFA"}
                </Button>

                <div className="text-sm text-muted-foreground text-center">
                  Already have a code pending verification?{' '}
                  <button
                    type="button"
                    onClick={() => setStep("verify")}
                    className="text-primary underline"
                    disabled={!status.hasSecret}
                  >
                    Enter verification code
                  </button>
                </div>
              </div>
            )}

            {step === "verify" && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold text-lg">1. Scan the QR code</h3>
                    <p className="text-sm text-muted-foreground">
                      Use your authenticator app to scan the QR code. If you cannot scan the code, enter the setup key manually.
                    </p>

                    {qrCodeDataUrl ? (
                      <img src={qrCodeDataUrl} alt="MFA QR code" className="mx-auto h-48 w-48" />
                    ) : (
                      <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-lg border border-dashed">
                        <Key className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}

                    <div className="rounded-md bg-muted p-3 text-center text-sm">
                      <p className="font-medium">Setup key</p>
                      <code className="break-all text-xs">{secret || 'Generate a new key to view'}</code>
                    </div>

                    <Button variant="secondary" onClick={handleGenerateSecret} disabled={loading} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCcw className="h-4 w-4" /> Generate new QR code
                        </span>
                      )}
                    </Button>
                  </div>

                  <div className="flex-1 space-y-4">
                    <h3 className="font-semibold text-lg">2. Enter the 6-digit code</h3>
                    <p className="text-sm text-muted-foreground">
                      After scanning the QR code, enter the 6-digit code generated by your authenticator app to verify and
                      enable MFA.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="mfaCode">Authenticator code</Label>
                      <Input
                        id="mfaCode"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                        maxLength={6}
                        placeholder="123456"
                        className="text-center text-lg tracking-widest"
                      />
                    </div>

                    <Button onClick={handleVerify} disabled={loading || mfaCode.length !== 6} className="w-full">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enable MFA"}
                    </Button>
                  </div>
                </div>

                <div className="text-center text-sm">
                  <Button variant="ghost" onClick={() => setStep(status.mfaEnabled ? "enabled" : "idle")}>
                    Cancel setup
                  </Button>
                </div>
              </div>
            )}

            {step === "enabled" && (
              <div className="space-y-6">
                <Alert>
                  <AlertDescription>
                    Two-factor authentication is currently <span className="font-semibold">enabled</span> on your account.
                    Use your authenticator app each time you sign in.
                  </AlertDescription>
                </Alert>

                {backupCodes.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Backup codes</h3>
                    <p className="text-sm text-muted-foreground">
                      Store these backup codes in a safe place. Each code can be used once if you lose access to your
                      authenticator device.
                    </p>
                    <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-sm">
                      {backupCodes.map((code) => (
                        <code key={code}>{code}</code>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-md border p-4">
                  <Label htmlFor="disableCode">Current authenticator code</Label>
                  <Input
                    id="disableCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={6}
                    placeholder="123456"
                    className="text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a current code from your authenticator app to disable MFA.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="flex-1">
                    <Link href="/dashboard">Return to dashboard</Link>
                  </Button>
                  <Button variant="destructive" onClick={handleDisable} disabled={loading || disableCode.length !== 6} className="flex-1">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disable MFA"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
