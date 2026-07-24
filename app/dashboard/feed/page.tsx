"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { VOICES, DEFAULT_VOICE_ID } from "@/lib/voice-catalog"
import { VoicePreviewButton } from "@/components/voice-preview-button"
import { Car, Home, ShoppingBag, Loader2, ArrowRight, CheckCircle2, AlertCircle, Rss, Eye, Clock } from "lucide-react"
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

const VERTICALS: Record<VerticalKey, { label: string; icon: typeof Car; endpoint: string; arrayField: string; defaultAspect: string; languages: boolean; hint: string }> = {
  automotive: { label: "Automotive", icon: Car, endpoint: "/api/vehicles/batch", arrayField: "vehicles", defaultAspect: "16:9", languages: true, hint: "Each vehicle needs a title (or make + model + year) and at least one photo URL. Price, mileage, stock #/VIN are optional." },
  realestate: { label: "Real estate", icon: Home, endpoint: "/api/listings/batch", arrayField: "listings", defaultAspect: "16:9", languages: false, hint: "Each listing needs an address and at least one photo URL. Price, beds, baths are optional." },
  ecommerce: { label: "E-commerce", icon: ShoppingBag, endpoint: "/api/products/batch", arrayField: "products", defaultAspect: "9:16", languages: false, hint: "Each product needs a title and at least one photo URL. Price, brand, description are optional." },
}

const ASPECTS = ["16:9", "9:16", "1:1"]

interface PreviewItem { ref: string; label: string; photos: number }
interface BatchResult { ref: string; label: string; language?: string; videoId?: string; photosUsed?: number; error?: string }
interface BatchResponse { started: number; failed: number; message?: string; results: BatchResult[] }
interface JobStatus { status: string; percent: number; thumbnail?: string | null; videoUrl?: string | null; error?: string | null }

export default function FeedToVideosPage() {
  const [vertical, setVertical] = useState<VerticalKey>("automotive")
  const [mode, setMode] = useState<"url" | "paste">("paste")
  const [feedUrl, setFeedUrl] = useState("")
  const [pasteText, setPasteText] = useState("")
  const [aspect, setAspect] = useState("16:9")
  const [duration, setDuration] = useState(16)
  const [langEn, setLangEn] = useState(true)
  const [langEs, setLangEs] = useState(false)
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICE_ID)
  const [captionPreset, setCaptionPreset] = useState<string>("default")
  const [approvedByUser, setApprovedByUser] = useState(false)

  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<{ count: number; items: PreviewItem[] } | null>(null)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<BatchResponse | null>(null)
  const [jobs, setJobs] = useState<Record<string, JobStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cfg = VERTICALS[vertical]

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  function resetOutputs() { setPreview(null); setResult(null); setJobs({}); setError(null); if (pollRef.current) clearTimeout(pollRef.current) }
  function selectVertical(v: VerticalKey) { setVertical(v); setAspect(VERTICALS[v].defaultAspect); setPasteText(""); resetOutputs() }
  function loadSample() { setMode("paste"); setPasteText(JSON.stringify(SAMPLES[vertical], null, 2)); setPreview(null) }

  function collectBody(extra: Record<string, unknown>): Record<string, unknown> {
    const body: Record<string, unknown> = { duration, aspectRatio: aspect, voiceId, approvedByUser, ...extra }
    if (captionPreset !== "default") body.captionPreset = captionPreset
    if (mode === "url") {
      if (!feedUrl.trim()) throw new Error("Enter a feed URL, or switch to Paste data.")
      body.feedUrl = feedUrl.trim()
    } else {
      let arr: unknown
      try { arr = JSON.parse(pasteText) } catch { throw new Error("Pasted data is not valid JSON.") }
      if (!Array.isArray(arr) || arr.length === 0) throw new Error("Paste a non-empty JSON array of items.")
      body[cfg.arrayField] = arr
    }
    if (cfg.languages) {
      const langs = [langEn ? "en" : null, langEs ? "es" : null].filter(Boolean)
      if (langs.length === 0) throw new Error("Pick at least one language.")
      body.languages = langs
    }
    return body
  }

  async function post(body: Record<string, unknown>) {
    const res = await fetch(cfg.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status}).`)
    return data
  }

  async function runPreview() {
    resetOutputs(); setPreviewing(true)
    try {
      const data = await post(collectBody({ preview: true }))
      setPreview({ count: data.count ?? 0, items: data.items ?? [] })
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong.") } finally { setPreviewing(false) }
  }

  async function runGenerate() {
    setError(null); setGenerating(true)
    try {
      const data = (await post(collectBody({}))) as BatchResponse
      setResult(data)
      const ids = (data.results ?? []).filter((r) => r.videoId).map((r) => r.videoId as string)
      startPolling(ids)
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong.") } finally { setGenerating(false) }
  }

  function startPolling(ids: string[]) {
    if (pollRef.current) clearTimeout(pollRef.current)
    const terminal = (s?: string) => s === "COMPLETED" || s === "FAILED" || s === "CANCELLED"
    const tick = async () => {
      const entries = await Promise.all(ids.map(async (id) => {
        try { const r = await fetch(`/api/ai/jobs/${id}`); return [id, await r.json()] as const } catch { return [id, null] as const }
      }))
      const update: Record<string, JobStatus> = {}
      for (const [id, j] of entries) if (j) update[id] = j
      setJobs((prev) => ({ ...prev, ...update }))
      if (!ids.every((id) => terminal(update[id]?.status))) pollRef.current = setTimeout(tick, 4000)
    }
    tick()
  }

  const langBoth = cfg.languages && langEn && langEs
  const previewLabel = preview ? `Generate ${preview.count * (langBoth ? 2 : 1)} video${preview.count * (langBoth ? 2 : 1) === 1 ? "" : "s"}` : "Generate"

  const toggle = (active: boolean) =>
    cn("px-3 py-2 rounded-lg text-sm font-medium border transition",
      active ? "bg-orange-500 text-white border-orange-500" : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Rss className="h-6 w-6 text-orange-400" /> Feed → Videos
        </h1>
        <p className="text-gray-400 mt-1">Point us at your inventory feed (or paste it) and we make a video for every item — one shared flow for every vertical.</p>
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
                <button onClick={() => { setMode("url"); setPreview(null) }} className={toggle(mode === "url")}>Feed URL</button>
                <button onClick={() => { setMode("paste"); setPreview(null) }} className={toggle(mode === "paste")}>Paste data</button>
              </div>
            </div>

            {mode === "url" ? (
              <Input value={feedUrl} onChange={(e) => { setFeedUrl(e.target.value); setPreview(null) }}
                placeholder="https://your-dms.com/inventory-feed.json"
                className="bg-black/30 border-white/10 text-white placeholder:text-gray-500" />
            ) : (
              <div className="space-y-2">
                <Textarea value={pasteText} onChange={(e) => { setPasteText(e.target.value); setPreview(null) }}
                  placeholder='Paste a JSON array of items, or click "Load sample".' rows={7}
                  className="bg-black/30 border-white/10 text-white placeholder:text-gray-500 font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={loadSample} className="border-white/15 text-gray-200">
                  Load sample ({cfg.label.toLowerCase()})
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-500">{cfg.hint}</p>
            {mode === "url" && (
              <p className="text-xs text-amber-400/80">Local URLs are blocked for security — to test locally, use <b>Paste data</b> → Load sample.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 block">Aspect ratio</label>
              <div className="flex gap-2">{ASPECTS.map((a) => <button key={a} onClick={() => setAspect(a)} className={toggle(aspect === a)}>{a}</button>)}</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 block">Seconds per video</label>
              <Input type="number" min={5} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 16)}
                className="w-28 bg-black/30 border-white/10 text-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 block">Voice</label>
              <div className="flex items-center gap-2">
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}
                  className="bg-black/30 border border-white/10 text-white rounded-lg px-3 py-2 text-sm min-w-[220px]">
                  {VOICES.map((v) => <option key={v.id} value={v.id} className="bg-gray-900">{v.name} — {v.description} ({v.gender})</option>)}
                </select>
                <VoicePreviewButton voiceId={voiceId} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200 block">Captions</label>
              <select value={captionPreset} onChange={(e) => setCaptionPreset(e.target.value)}
                className="bg-black/30 border border-white/10 text-white rounded-lg px-3 py-2 text-sm">
                <option value="default" className="bg-gray-900">Standard</option>
                <option value="karaoke" className="bg-gray-900">Karaoke — word-by-word (Reels/TikTok)</option>
                <option value="large" className="bg-gray-900">Large</option>
                <option value="subtle" className="bg-gray-900">Subtle</option>
              </select>
            </div>
            {cfg.languages && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-200 block">Languages</label>
                <div className="flex gap-2">
                  <button onClick={() => setLangEn((x) => !x)} className={toggle(langEn)}>English</button>
                  <button onClick={() => setLangEs((x) => !x)} className={toggle(langEs)}>Español</button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="outline" onClick={runPreview} disabled={previewing || generating} className="border-white/15 text-gray-200">
              {previewing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking…</> : <><Eye className="h-4 w-4 mr-2" /> Preview</>}
            </Button>
            <Button onClick={runGenerate} disabled={generating || previewing || !preview || !approvedByUser} className="bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40">
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <>{previewLabel} <ArrowRight className="h-4 w-4 ml-2" /></>}
            </Button>
            {!preview && <span className="text-xs text-gray-500">Preview first to see how many videos you'll create.</span>}
            {langBoth && preview && <span className="text-xs text-gray-400">Each item ×2 (EN + ES) — uses 2× quota.</span>}
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-gray-300">
            <input type="checkbox" className="mt-1" checked={approvedByUser} onChange={(e) => setApprovedByUser(e.target.checked)} />
            <span>I reviewed the preview and authorize ForgeVid to generate these drafts. ForgeVid will not publish them or message prospects; sharing remains a separate manual action.</span>
          </label>
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

      {preview && !result && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><Eye className="h-5 w-5 text-orange-400" /> Found {preview.count} item{preview.count === 1 ? "" : "s"}</CardTitle>
            <CardDescription className="text-gray-400">Review, then generate — nothing has been rendered or charged yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-white/5">
              {preview.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-gray-200">{it.label}</span>
                  <span className="text-gray-500 font-mono text-xs">{it.photos} photo{it.photos === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-400" /> Started {result.started} of {result.results?.length ?? 0} videos</CardTitle>
            <CardDescription className="text-gray-400">{result.message} — updating live as they render.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {result.results?.map((r, i) => {
                const job = r.videoId ? jobs[r.videoId] : undefined
                const status = job?.status ?? (r.videoId ? "QUEUED" : "FAILED")
                const done = status === "COMPLETED"
                const failed = status === "FAILED" || status === "CANCELLED" || !r.videoId
                return (
                  <div key={i} className="flex gap-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="w-24 h-14 rounded bg-black/40 shrink-0 overflow-hidden flex items-center justify-center">
                      {done && job?.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={job.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : failed ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-200 truncate">
                        {r.label}{r.language && <span className="text-gray-500 font-mono"> · {r.language.toUpperCase()}</span>}
                      </div>
                      {failed ? (
                        <Badge className="bg-red-500/15 text-red-300 border-red-500/30 mt-1">{r.error || "failed"}</Badge>
                      ) : done ? (
                        <Badge className="bg-green-500/15 text-green-300 border-green-500/30 mt-1">ready</Badge>
                      ) : (
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="h-3 w-3" /> {status === "QUEUED" ? "queued" : `rendering ${job?.percent ?? 0}%`}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <Link href="/dashboard/videos"><Button variant="outline" className="border-white/15 text-gray-200 mt-2">Watch them in My Videos <ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
