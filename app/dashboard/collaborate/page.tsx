"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Users, Share2, Copy, CheckCircle, Loader2, ExternalLink } from "lucide-react"

interface VideoRow {
  id: string
  title: string
  status: string
  thumbnail?: string | null
  shareEnabled?: boolean
}

export default function CollaboratePage() {
  const [videos, setVideos] = useState<VideoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch("/api/videos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.videos)) {
          setVideos(d.videos.filter((v: VideoRow) => (v.status || "").toLowerCase() === "completed"))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleShare = async (video: VideoRow, enabled: boolean) => {
    setBusy(video.id)
    try {
      const res = await fetch(`/api/videos/${video.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, shareEnabled: enabled } : v)))
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error || "Couldn't update sharing.")
      }
    } catch {
      alert("Network error.")
    } finally {
      setBusy(null)
    }
  }

  const copyLink = (video: VideoRow) => {
    const link = `${origin}/v/${video.id}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(video.id)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {})
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" /> Share &amp; Review
        </h1>
        <p className="text-muted-foreground mt-1">
          Turn on a public link for any finished video so clients or teammates can watch and give feedback — no account needed.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your videos…
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Share2 className="h-10 w-10 mx-auto mb-4 opacity-60" />
            No finished videos yet. Generate one in AI Studio, then share it here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => {
            const link = `${origin}/v/${video.id}`
            return (
              <Card key={video.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="text-base truncate">{video.title}</CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm text-muted-foreground">Public link</span>
                      {busy === video.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Switch checked={!!video.shareEnabled} onCheckedChange={(c) => toggleShare(video, c)} />
                      )}
                    </div>
                  </div>
                  {video.shareEnabled && (
                    <CardDescription className="pt-1">
                      <Badge variant="default" className="mr-2"><CheckCircle className="h-3 w-3 mr-1" />Shared</Badge>
                      Anyone with the link can watch this video.
                    </CardDescription>
                  )}
                </CardHeader>
                {video.shareEnabled && (
                  <CardContent>
                    <div className="flex gap-2">
                      <Input value={link} readOnly className="font-mono text-sm" />
                      <Button variant="outline" onClick={() => copyLink(video)}>
                        {copiedId === video.id ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                        {copiedId === video.id ? "Copied!" : "Copy"}
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
