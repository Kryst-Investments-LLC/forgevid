"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { withCsrfHeaders } from "@/lib/csrf-client"

const TONES = ["professional", "energetic", "friendly", "premium"] as const
type Tone = (typeof TONES)[number]

export interface SiteBriefResult {
  prompt: string
  brand: string
  tagline: string
  callToAction: string
  mediaAssetIds: string[]
  images: Array<{ assetId: string; url: string }>
  sourceUrl: string
}

/**
 * Paste a URL -> a grounded commercial script + the site's own hero images.
 * Nothing renders here: the result fills the prompt box so the user reviews and
 * edits before spending a generation.
 */
export function SiteBriefPanel({
  duration,
  onBrief,
}: {
  duration: number
  onBrief: (result: SiteBriefResult) => void
}) {
  const [url, setUrl] = useState("")
  const [tone, setTone] = useState<Tone>("professional")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SiteBriefResult | null>(null)

  const run = async () => {
    if (!url.trim()) {
      toast.error("Paste the website URL first")
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/site-brief", {
        method: "POST",
        headers: withCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ url: url.trim(), duration, tone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Could not read that site")

      setResult(data)
      onBrief(data)
      toast.success(
        data.mediaAssetIds.length > 0
          ? `Script written — imported ${data.mediaAssetIds.length} image(s) from the site`
          : "Script written from the site",
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that site")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" /> Make a commercial from a website
        </CardTitle>
        <CardDescription>
          Paste a product URL. We read the page, write a {duration}-second script grounded in
          what it actually says, and bring in its hero images as scenes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) run()
            }}
            placeholder="https://yourproduct.com"
            className="flex-1 rounded-md border border-gray-600 bg-gray-800/50 p-2 text-sm text-gray-200"
          />
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="rounded-md border border-gray-600 bg-gray-800/50 p-2 text-sm text-gray-200"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
          <Button onClick={run} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {loading ? "Reading…" : "Write script"}
          </Button>
        </div>

        {result && (
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{result.brand}</Badge>
              <span className="text-muted-foreground italic">{result.tagline}</span>
            </div>
            {result.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {result.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.assetId}
                    src={img.url}
                    alt=""
                    className="h-16 rounded border object-cover"
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              The script is in the prompt box below — edit it, then Generate.
              {result.images.length > 0 && " The imported images will fill the first scenes."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SiteBriefPanel
