"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Video,
  CheckCircle2,
  CreditCard,
  Sparkles,
  Cpu,
  Clock,
  ShieldAlert,
  Loader2,
  AlertCircle,
} from "lucide-react"

interface EnterpriseData {
  metrics?: {
    totalUsers?: number | null
    totalVideos?: number | null
    completedVideos?: number | null
    activeSubscriptions?: number | null
    totalGenerations?: number | null
  }
  system?: {
    memory?: {
      heapUsedMB?: number
      heapTotalMB?: number
      rssMB?: number
    }
    uptimeSeconds?: number
  }
  compliance?: {
    httpsEnforced?: boolean
    dataEncryptedInTransit?: boolean
    thirdPartyAudited?: boolean
    note?: string
  }
  generatedAt?: string
}

function formatUptime(seconds?: number): string {
  if (seconds === undefined || seconds === null) return "—"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(" ")
}

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value ?? "—"}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function ComplianceRow({ ok, label }: { ok: boolean | null | undefined; label: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={ok ? "text-emerald-400 font-medium" : "text-amber-400 font-medium"}>
        {ok === undefined || ok === null ? "Unknown" : ok ? "Yes" : "Not yet"}
      </span>
    </div>
  )
}

export default function EnterprisePage() {
  const [data, setData] = useState<EnterpriseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/enterprise/features")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading enterprise overview…
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground py-16 text-center">
        <AlertCircle className="h-6 w-6" />
        Couldn&apos;t load the enterprise overview right now.
      </div>
    )
  }

  const m = data.metrics ?? {}
  const sys = data.system ?? {}
  const mem = sys.memory ?? {}
  const compliance = data.compliance ?? {}

  const cards = [
    { label: "Total users", value: m.totalUsers, icon: Users },
    { label: "Total videos", value: m.totalVideos, icon: Video },
    { label: "Completed videos", value: m.completedVideos, icon: CheckCircle2 },
    { label: "Active subscriptions", value: m.activeSubscriptions, icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enterprise overview</h1>
        <p className="text-muted-foreground">
          A truthful ops snapshot — real database counts and live process metrics. No fabricated numbers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold mt-2 tabular-nums">{c.value ?? "—"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> AI generations
            </CardTitle>
            <CardDescription>Total AI generation jobs recorded platform-wide</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{m.totalGenerations ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" /> Server process
            </CardTitle>
            <CardDescription>Live Node.js process metrics for this server instance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Heap used" value={mem.heapUsedMB !== undefined ? `${mem.heapUsedMB} MB` : undefined} />
              <Stat label="Heap total" value={mem.heapTotalMB !== undefined ? `${mem.heapTotalMB} MB` : undefined} />
              <Stat label="RSS" value={mem.rssMB !== undefined ? `${mem.rssMB} MB` : undefined} />
              <Stat label="Uptime" value={formatUptime(sys.uptimeSeconds)} />
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Reflects only this server process, not a fleet-wide average.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" /> Compliance status
          </CardTitle>
          <CardDescription>Self-assessed, not an independent certification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ComplianceRow ok={compliance.httpsEnforced} label="HTTPS enforced" />
          <ComplianceRow ok={compliance.dataEncryptedInTransit} label="Data encrypted in transit" />
          <ComplianceRow ok={compliance.thirdPartyAudited} label="Third-party audited" />
          <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-3 py-2 mt-2">
            <p className="text-xs text-amber-400">
              {compliance.note ??
                "Self-assessed. Not yet independently audited (SOC 2 / HIPAA not certified)."}
            </p>
          </div>
        </CardContent>
      </Card>

      {data.generatedAt && (
        <p className="text-xs text-muted-foreground text-right">
          Generated {new Date(data.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
