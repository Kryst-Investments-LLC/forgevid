"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Car, Home, ShoppingBag, Loader2, ArrowRight, CheckCircle2, AlertCircle, Rss } from "lucide-react"
import { cn } from "@/lib/utils"

type VerticalKey = "automotive" | "realestate" | "ecommerce"

const SAMPLES: Record<VerticalKey, unknown[]> = {
  automotive: [
    { ref: "STK-1001", title: "2022 Toyota RAV4 XLE", year: 2022, make: "Toyota", model: "RAV4", trim: "XLE", price: "$28,900", mileage: "24,000 mi", highlights: "One owner, clean history, all-wheel drive, backup camera.", photos: ["https://picsum.photos/id/1071/1200/800", "https://picsum.photos/id/1080/1200/800"] },
    { ref: "STK-1002", title: "2021 Honda Civic LX", year: 2021, make: "Honda", model: "Civic", trim: "LX", price: "$21,500", mileage: "31,000 mi", highlights: "Great on gas, Apple CarPlay, backup camera.", photos: ["https://picsum.photos/id/1063/1200/800", "https://picsum.photos/id/183/1200/800"] },
  ],
  realestate: [
    { ref: "MLS-501", address: "14 Maple Court, Miami, FL", price: "$685,000", beds: 4, baths: 2, highlights: "Renovated kitchen, large garden, quiet street.", photos: ["https://picsum.photos/id/1084/1200/800", "https://picsum.photos/id/101/1200/800"] },
    { ref: "MLS-502", address: "9 Oak Lane, Miami, FL", price: "$412,500", beds: 3, baths: 1, highlights: "Close to schools, updated bathrooms.", photos: ["https://picsum.photos/id/106/1200/800", "https://picsum.photos/id/110/1200/800"] },
  ],
  ecommerce: [
    { ref: "SKU-9001", title: "Wireless Earbuds Pro", price: "$49.00", brand: "Acme Audio", description: "Crisp, immersive sound with active noise cancellation.", photos: ["https://picsum.photos/id/1069/1000/1000", "https://picsum.photos/id/1078/1000/1000"] },
    { ref: "SKU-9002", title: "Everyday Backpack", price: "$79.00", brand: "Trailhead", description: "Water-resistant, 20L, padded laptop sleeve.", photos: ["https://picsum.photos/id/21/1000/1000", "https://picsum.photos/id/26/1000/1000"] },
  ],
}

const VERTICALS: Record<VerticalKey, { label: string; icon: typeof Car; endpoint: string; arrayField: string; defaultAspect: string; languages: boolean }> = {
  automotive: { label: "Automotive", icon: Car, endpoint: "/api/vehicles/batch", arrayField: "vehicles", defaultAspect: "16:9", languages: true },
  realestate: { label: "Real estate", icon: Home, endpoint: "/api/listings/batch", arrayField: "listings", defaultAspect: "16:9", languages: false },
  ecommerce: { label: "E-commerce", icon: ShoppingBag, endpoint: "/api/products/batch", arrayField: "products", defaultAspect: "9:16", languages: false },
}

const ASPECTS = ["16:9", "9:16", "1:1"]

interface BatchResult {
  ref: string
  label: string
  language?: string
  videoId?: string
  photosUsed?: number
  error?: string
}
interface BatchResponse {
  started: number
  failed: number
  message?: string
  results: BatchResult[]
}

export default function FeedToVideosPage() {
  const [vertical, setVertical] = useState<VerticalKey>("automotive")
  const [mode, setMode] = useState<"url" | "paste">("paste")
  const [feedUrl, setFeedUrl] = useState("")
  const [pasteText, setPasteText] = useState("")
  const [aspect, setAspect] = useState("16:9")
  const [duration, setDuration] = useState(16)
  const [langEn, setLangEn] = useState(true)
  const [langEs, setLangEs] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BatchResponse | null>(null)

  const cfg = VERTICALS[vertical]

  function selectVertical(v: VerticalKey) {
    setVertical(v)
    setAspect(VERTICALS[v].defaultAspect)
    setResult(null)
    setError(null)
    setPasteText("")
  }

  function loadSample() {
    setMode("paste")
    setPasteText(JSON.stringify(SAMPLES[vertical], null, 2))
  }

  async function generate() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = { duration, aspectRatio: aspect }
      if (mode === "url") {
        if (!feedUrl.trim()) throw new Error("Enter a feed URL, or switch to Paste data.")
        body.feedUrl = feedUrl.trim()
      } else {
        let arr: unknown
        try {
          arr = JSON.parse(pasteText)
        } catch {
          throw new Error("Pasted data is not valid JSON.")
        }
        if (!Array.isArray(arr) || arr.length === 0) throw new Error("Paste a non-empty JSON array of items.")
        body[cfg.arrayField] = arr
      }
      if (cfg.languages) {
        const langs = [langEn ? "en" : null, langEs ? "es" : null].filter(Boolean)
        if (langs.length === 0) throw new Error("Pick at least one language.")
        body.languages = langs
      }

      const res = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status}).`)
      setResult(data as BatchResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const toggle = (active: boolean) =>
    cn(
      "px-3 py-2 rounded-lg text-sm font-medium border transition",
      active
        ? "bg-orange-500 text-white border-orange-500"
        : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10",
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Rss className="h-6 w-6 text-orange-400" /> Feed → Videos
        </h1>
        <p className="text-gray-400 mt-1">
          Point us at your inventory feed (or paste it) and we make a video for every item — one shared flow for
          every vertical.
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">1. Choose the vertical</CardTitle>
          <CardDescription className="text-gray-400">Same engine, different feed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(VERTICALS) as VerticalKey[]).map((v) => {
              const Icon = VERTICALS[v].icon
              return (
                <button key={v} onClick={() => selectVertical(v)} className={cn(toggle(vertical === v), "flex items-center gap-2")}>
                  <Icon className="h-4 w-4" /> {VERTICALS[v].label}
                </button>
              )
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-200">2. Your feed</label>
              <div className="flex gap-2">
                <button onClick={() => setMode("url")} className={toggle(mode === "url")}>Feed URL</button>
                <button onClick={() => setMode("paste")} className={toggle(mode === "paste")}>Paste data</button>
              </div>
            </div>

            {mode === "url" ? (
              <Input
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
                placeholder="https://your-dms.com/inventory-feed.json"
                className="bg-black/30 border-white/10 text-white placeholder:text-gray-500"
              />
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder='Paste a JSON array of items, or click "Load sample".'
                  rows={8}
                  className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 font-mono text-xs"
                />
                <Button variant="outline" size="sm" onClick={loadSample} className="border-white/15 text-gray-200">
                  Load sample ({VERTICALS[vertical].label.toLowerCase()})
                </Button>
              </div>
            )}
            {mode === "url" && (
              <p className="text-xs text-amber-400/80">
                Note: local URLs are blocked for security. To test locally, use <b>Paste data</b> → Load sample.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 block">Aspect ratio</label>
              <div className="flex gap-2">
                {ASPECTS.map((a) => (
                  <button key={a} onClick={() => setAspect(a)} className={toggle(aspect === a)}>{a}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 block">Seconds per video</label>
              <Input
                type="number"
                min={5}
                max={120}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 16)}
                className="w-28 bg-black/30 border-white/10 text-white"
              />
            </div>
            {cfg.languages && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200 block">Languages</label>
                <div className="flex gap-2">
                  <button onClick={() => setLangEn((v) => !v)} className={toggle(langEn)}>English</button>
                  <button onClick={() => setLangEs((v) => !v)} className={toggle(langEs)}>Español</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={generate} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
              ) : (
                <>Generate batch <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
            {cfg.languages && langEn && langEs && (
              <span className="text-xs text-gray-400">Each item renders twice (EN + ES) — uses 2× quota.</span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div className="text-red-200 text-sm">{error}</div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Started {result.started} of {result.results?.length ?? 0} videos
            </CardTitle>
            <CardDescription className="text-gray-400">{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="divide-y divide-white/5">
              {result.results?.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-200">
                    {r.label}
                    {r.language && <span className="text-gray-500 font-mono"> · {r.language.toUpperCase()}</span>}
                  </span>
                  {r.videoId ? (
                    <Badge className="bg-green-500/15 text-green-300 border-green-500/30">
                      queued{typeof r.photosUsed === "number" ? ` · ${r.photosUsed} photos` : ""}
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-300 border-red-500/30">{r.error || "failed"}</Badge>
                  )}
                </div>
              ))}
            </div>
            <Link href="/dashboard/videos">
              <Button variant="outline" className="border-white/15 text-gray-200 mt-2">
                Watch them in My Videos <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
