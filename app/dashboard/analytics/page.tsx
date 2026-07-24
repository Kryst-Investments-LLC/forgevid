"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Play, CheckCircle2, Loader2, ArrowUpRight, Timer, Film } from "lucide-react"

interface Analytics {
  summary: {
    total: number
    thisMonth: number
    completed: number
    inProgress: number
    failed: number
    completionRate: number
    totalMinutes: number
    avgSeconds: number
  }
  usage: { plan: string; thisMonth: number; videoLimit: number }
  monthly: { month: string; videos: number }[]
  value: {
    completedVideos: number
    estimatedHoursSaved: number
    estimatedCostSavedUsd: number
    assumptions: { minutesPerTraditionalVideo: number; agencyCostPerVideoUsd: number; label: string }
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/user/analytics")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-16 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading your analytics…
      </div>
    )
  }
  if (!data) {
    return <div className="text-muted-foreground py-16 text-center">Couldn't load analytics right now.</div>
  }

  const s = data.summary
  const usedPct = data.usage.videoLimit > 0 ? Math.min(100, Math.round((data.usage.thisMonth / data.usage.videoLimit) * 100)) : 0
  const maxMonthly = Math.max(1, ...data.monthly.map((m) => m.videos))
  const avgLen = s.avgSeconds > 0 ? `${Math.floor(s.avgSeconds / 60)}:${String(s.avgSeconds % 60).padStart(2, "0")}` : "—"

  const cards = [
    { label: "Total videos", value: s.total, icon: Film },
    { label: "This month", value: s.thisMonth, icon: Play },
    { label: "Completed", value: s.completed, icon: CheckCircle2 },
    { label: "Completion rate", value: `${s.completionRate}%`, icon: BarChart3 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Your real video activity, straight from your library.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold mt-2 tabular-nums">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" /> This month&apos;s usage</CardTitle>
            <CardDescription className="capitalize">{data.usage.plan} plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Videos generated</span>
              <span className="font-medium tabular-nums">{data.usage.thisMonth} / {data.usage.videoLimit}</span>
            </div>
            <Progress value={usedPct} />
            {data.usage.thisMonth >= data.usage.videoLimit && (
              <p className="text-xs text-orange-400">You&apos;ve reached this month&apos;s limit.</p>
            )}
            <Link href="/pricing">
              <Button variant="outline" className="w-full bg-transparent mt-2">
                <ArrowUpRight className="mr-2 h-4 w-4" /> Change plan
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Timer className="h-5 w-5" /> Library</CardTitle>
            <CardDescription>Across all your videos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Total minutes" value={s.totalMinutes} />
              <Stat label="Avg length" value={avgLen} />
              <Stat label="In progress" value={s.inProgress} />
              <Stat label="Failed" value={s.failed} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estimated business value</CardTitle>
          <CardDescription>Illustrative savings based on completed videos—not guaranteed results.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Stat label="Completed videos" value={data.value.completedVideos} />
          <Stat label="Estimated hours saved" value={data.value.estimatedHoursSaved} />
          <Stat label="Estimated production cost avoided" value={`$${data.value.estimatedCostSavedUsd.toLocaleString()}`} />
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Assumption: {data.value.assumptions.minutesPerTraditionalVideo} minutes and ${data.value.assumptions.agencyCostPerVideoUsd} per conventional video. Adjust this comparison to your workflow.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Monthly trends</CardTitle>
          <CardDescription>Videos created over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          {s.total === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No videos yet — your trends will appear here.</p>
          ) : (
            <div className="flex items-end justify-between gap-3 h-40">
              {data.monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                  <span className="text-xs font-medium tabular-nums">{m.videos}</span>
                  <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max(4, (m.videos / maxMonthly) * 100)}%` }} />
                  <span className="text-xs text-muted-foreground">{m.month}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
