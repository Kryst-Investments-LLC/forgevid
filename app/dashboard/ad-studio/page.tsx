"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Globe,
  Loader2,
  Megaphone,
  Repeat,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react"

import { AD_PLATFORM_LIST, getAdPlatform, type AdPlatformKey } from "@/lib/ad-platforms"
import { CreativeCard } from "@/components/ad-studio/creative-card"
import { PlatformPicker } from "@/components/ad-studio/platform-picker"
import { ErrorBanner, EmptyState, LoadingRow } from "@/components/ad-studio/state-banner"
import type {
  AdCta,
  AdHook,
  CampaignRow,
  CreativeRow,
  HooksResponse,
  VariantResult,
  WinnerCreativeRow,
} from "@/components/ad-studio/types"

const MAX_HOOKS_SELECTED = 4
const MAX_CTAS_SELECTED = 2
const MAX_VARIANTS = 12

function shortNameFromBrief(brief: string): string {
  const firstLine = brief.split(/\r?\n/)[0]?.trim() || brief.trim()
  if (!firstLine) return "Untitled campaign"
  return firstLine.length > 60 ? `${firstLine.slice(0, 57).trimEnd()}…` : firstLine
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

/** Optimistically merge a winner/ROAS patch into a CreativeRow list by id. */
function patchCreative(rows: CreativeRow[], id: string, patch: Partial<CreativeRow>): CreativeRow[] {
  return rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
}

export default function AdStudioPage() {
  const [tab, setTab] = useState<"create" | "campaigns" | "winners">("create")

  // ---- Create tab: brief + URL import ----
  const [url, setUrl] = useState("")
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [brief, setBrief] = useState("")
  const [platformKey, setPlatformKey] = useState<AdPlatformKey>("tiktok")

  // A winning hook carried over from the Winners tab, applied to the next
  // successful hook generation (see "Make more like this").
  const [carryHook, setCarryHook] = useState<AdHook | null>(null)

  // ---- Create tab: hooks/ctas/angles ----
  const [hooksLoading, setHooksLoading] = useState(false)
  const [hooksError, setHooksError] = useState<string | null>(null)
  const [hooksResult, setHooksResult] = useState<HooksResponse | null>(null)
  const [selectedHooks, setSelectedHooks] = useState<Set<number>>(new Set())
  const [selectedCtas, setSelectedCtas] = useState<Set<number>>(new Set())

  // ---- Create tab: generate ad set ----
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [variantWarnings, setVariantWarnings] = useState<string[]>([])
  const [resultCreatives, setResultCreatives] = useState<CreativeRow[] | null>(null)

  // ---- Campaigns tab ----
  const [campaigns, setCampaigns] = useState<CampaignRow[] | null>(null)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // ---- Winners tab ----
  const [winners, setWinners] = useState<WinnerCreativeRow[] | null>(null)
  const [winnersLoading, setWinnersLoading] = useState(false)
  const [winnersError, setWinnersError] = useState<string | null>(null)

  const platform = getAdPlatform(platformKey)
  const variantCount = selectedHooks.size * selectedCtas.size

  const loadCampaigns = async () => {
    setCampaignsLoading(true)
    setCampaignsError(null)
    try {
      const res = await fetch("/api/ad-studio/campaigns")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not load campaigns.")
      setCampaigns(Array.isArray(data.campaigns) ? data.campaigns : [])
    } catch (err) {
      setCampaignsError(err instanceof Error ? err.message : "Could not load campaigns.")
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadWinners = async () => {
    setWinnersLoading(true)
    setWinnersError(null)
    try {
      const res = await fetch("/api/ad-studio/creatives?winners=1")
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not load winners.")
      setWinners(Array.isArray(data.creatives) ? data.creatives : [])
    } catch (err) {
      setWinnersError(err instanceof Error ? err.message : "Could not load winners.")
    } finally {
      setWinnersLoading(false)
    }
  }

  useEffect(() => {
    if (tab === "campaigns" && campaigns === null) loadCampaigns()
    if (tab === "winners" && winners === null) loadWinners()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const pullFromUrl = async () => {
    if (!url.trim()) {
      setUrlError("Paste a product URL first.")
      return
    }
    setUrlLoading(true)
    setUrlError(null)
    try {
      const res = await fetch("/api/site-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not read that page.")
      if (typeof data.prompt === "string" && data.prompt.trim()) {
        setBrief(data.prompt)
      } else {
        throw new Error("That page did not produce a usable brief. Try describing it manually.")
      }
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Could not read that page.")
    } finally {
      setUrlLoading(false)
    }
  }

  const generateHooks = async () => {
    const trimmed = brief.trim()
    if (trimmed.length < 10) {
      setHooksError("Describe your product or offer in at least 10 characters.")
      return
    }
    setHooksLoading(true)
    setHooksError(null)
    setHooksResult(null)
    setSelectedHooks(new Set())
    setSelectedCtas(new Set())
    setResultCreatives(null)
    setGenerateError(null)
    setVariantWarnings([])

    try {
      const res = await fetch("/api/ad-studio/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: trimmed, platform: platformKey, count: 6 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Could not generate hooks.")

      let hooks: AdHook[] = Array.isArray(data.hooks) ? data.hooks : []
      const ctas: AdCta[] = Array.isArray(data.ctas) ? data.ctas : []
      const angles: string[] = Array.isArray(data.angles) ? data.angles : []
      let autoSelectHook: number | null = null

      if (carryHook) {
        const idx = hooks.findIndex((h) => h.label.toLowerCase() === carryHook.label.toLowerCase())
        if (idx >= 0) {
          autoSelectHook = idx
        } else {
          hooks = [carryHook, ...hooks]
          autoSelectHook = 0
        }
        setCarryHook(null)
      }

      setHooksResult({ hooks, ctas, angles, platform: data.platform })
      if (autoSelectHook !== null) setSelectedHooks(new Set([autoSelectHook]))
    } catch (err) {
      setHooksError(err instanceof Error ? err.message : "Could not generate hooks.")
    } finally {
      setHooksLoading(false)
    }
  }

  const toggleHook = (i: number) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else if (next.size < MAX_HOOKS_SELECTED) next.add(i)
      return next
    })
  }

  const toggleCta = (i: number) => {
    setSelectedCtas((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else if (next.size < MAX_CTAS_SELECTED) next.add(i)
      return next
    })
  }

  const generateAdSet = async () => {
    if (!hooksResult) return
    const hooks = [...selectedHooks].map((i) => hooksResult.hooks[i]).filter(Boolean)
    const ctas = [...selectedCtas].map((i) => hooksResult.ctas[i]).filter(Boolean)
    if (hooks.length === 0 || ctas.length === 0) return
    if (hooks.length * ctas.length > MAX_VARIANTS) return

    setGenerating(true)
    setGenerateError(null)
    setVariantWarnings([])
    setResultCreatives(null)

    try {
      const genRes = await fetch("/api/campaigns/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: brief,
          duration: platform.durationSec,
          renderQuality: "full",
          addOns: ["voiceover", "subtitles", "music"],
          axes: {
            hooks: hooks.map((h) => ({ label: h.label, narration: h.narration, searchQuery: h.searchQuery })),
            ctas: ctas.map((c) => ({ label: c.label, narration: c.narration })),
            aspectRatios: [platform.aspect],
          },
        }),
      })
      const genData = await genRes.json().catch(() => ({}))
      if (!genRes.ok) throw new Error(genData?.error || "Could not generate ad variants.")

      const variants: VariantResult[] = Array.isArray(genData.variants) ? genData.variants : []
      setVariantWarnings(variants.filter((v) => v.error).map((v) => `${v.label}: ${v.error}`))

      if (variants.length === 0 || variants.every((v) => !v.videoId)) {
        throw new Error(genData.message || "None of the variants could start rendering.")
      }

      const name = shortNameFromBrief(brief)
      const persistRes = await fetch("/api/ad-studio/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          brief,
          platform: platformKey,
          creatives: variants.map((v) => ({
            videoId: v.videoId,
            label: v.label,
            hook: v.axes?.hook,
            cta: v.axes?.cta,
            aspect: v.aspectRatio,
          })),
        }),
      })
      const persistData = await persistRes.json().catch(() => ({}))
      if (!persistRes.ok) throw new Error(persistData?.error || "Could not save the campaign.")

      const campaignId: string | undefined = persistData.campaignId
      const listRes = await fetch("/api/ad-studio/campaigns")
      const listData = await listRes.json().catch(() => ({}))
      const savedCampaigns: CampaignRow[] = Array.isArray(listData.campaigns) ? listData.campaigns : []
      const camp = savedCampaigns.find((c) => c.id === campaignId)
      setResultCreatives(camp ? camp.creatives : [])

      // Refresh the Campaigns list in the background so it's current next visit.
      setCampaigns(savedCampaigns)
      if (campaignId) setExpanded((prev) => new Set(prev).add(campaignId))
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Could not generate the ad set.")
    } finally {
      setGenerating(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onCreativeUpdated = (id: string, patch: { isWinner?: boolean; roas?: number | null }) => {
    setResultCreatives((prev) => (prev ? patchCreative(prev, id, patch) : prev))
    setCampaigns((prev) =>
      prev ? prev.map((c) => ({ ...c, creatives: patchCreative(c.creatives, id, patch) })) : prev,
    )
    setWinners((prev) => (prev ? (patchCreative(prev, id, patch) as WinnerCreativeRow[]) : prev))
  }

  const useAsTemplate = (w: WinnerCreativeRow) => {
    setBrief(w.brief || "")
    setPlatformKey(getAdPlatform(w.platform).key)
    setHooksResult(null)
    setSelectedHooks(new Set())
    setSelectedCtas(new Set())
    setResultCreatives(null)
    setGenerateError(null)
    setVariantWarnings([])
    setCarryHook(w.hook ? { label: w.hook, narration: w.hook } : null)
    setTab("create")
  }

  return (
    <div className="min-h-[600px]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-primary" /> Ad Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          One product or URL → a batch of platform-ready ad creatives. Test hooks, keep winners.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="winners">Winners</TabsTrigger>
        </TabsList>

        {/* ---------------- CREATE ---------------- */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://yourproduct.com (optional)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !urlLoading) pullFromUrl()
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={pullFromUrl} disabled={urlLoading}>
                  {urlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  {urlLoading ? "Reading…" : "Pull from URL"}
                </Button>
              </div>
              {urlError && <ErrorBanner message={urlError} />}

              <Textarea
                placeholder="Describe your product, offer, or landing page — who it's for and why it wins."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={5}
              />

              <div>
                <p className="text-sm font-medium mb-2">Platform</p>
                <PlatformPicker value={platformKey} onChange={setPlatformKey} />
              </div>

              {hooksError && <ErrorBanner message={hooksError} />}

              <Button type="button" onClick={generateHooks} disabled={hooksLoading || brief.trim().length < 10}>
                {hooksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {hooksLoading ? "Generating hooks…" : "Generate hooks"}
              </Button>
            </CardContent>
          </Card>

          {hooksResult && (
            <Card>
              <CardHeader>
                <CardTitle>2. Pick hooks &amp; CTAs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {hooksResult.angles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {hooksResult.angles.map((a, i) => (
                      <Badge key={i} variant="outline" className="font-normal">
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">
                    Hooks <span className="text-muted-foreground font-normal">(pick 2–4)</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {hooksResult.hooks.map((h, i) => {
                      const selected = selectedHooks.has(i)
                      const atCap = !selected && selectedHooks.size >= MAX_HOOKS_SELECTED
                      return (
                        <label
                          key={i}
                          className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                            atCap ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent/50"
                          } ${selected ? "border-primary bg-primary/5" : "border-border"}`}
                        >
                          <Checkbox
                            checked={selected}
                            disabled={atCap}
                            onCheckedChange={() => toggleHook(i)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{h.label}</div>
                            <div className="text-xs text-muted-foreground">{h.narration}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">
                    CTAs <span className="text-muted-foreground font-normal">(pick 1–2)</span>
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {hooksResult.ctas.map((c, i) => {
                      const selected = selectedCtas.has(i)
                      const atCap = !selected && selectedCtas.size >= MAX_CTAS_SELECTED
                      return (
                        <label
                          key={i}
                          className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                            atCap ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-accent/50"
                          } ${selected ? "border-primary bg-primary/5" : "border-border"}`}
                        >
                          <Checkbox
                            checked={selected}
                            disabled={atCap}
                            onCheckedChange={() => toggleCta(i)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{c.label}</div>
                            <div className="text-xs text-muted-foreground">{c.narration}</div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t">
                  <p className="text-sm text-muted-foreground flex-1">
                    {variantCount > 0 ? (
                      <>
                        This will generate <strong className="text-foreground">{variantCount}</strong> ad variant
                        {variantCount === 1 ? "" : "s"} ({selectedHooks.size} hook{selectedHooks.size === 1 ? "" : "s"} ×{" "}
                        {selectedCtas.size} CTA{selectedCtas.size === 1 ? "" : "s"}, {platform.aspect}).
                      </>
                    ) : (
                      "Select at least one hook and one CTA."
                    )}
                  </p>
                  <Button
                    type="button"
                    onClick={generateAdSet}
                    disabled={generating || variantCount === 0 || variantCount > MAX_VARIANTS}
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {generating ? "Generating ad set…" : "Generate ad set"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {generateError && <ErrorBanner message={generateError} />}
          {variantWarnings.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-300 space-y-1">
              <p className="font-medium">Some variants could not render:</p>
              {variantWarnings.map((w, i) => (
                <p key={i} className="text-xs">
                  {w}
                </p>
              ))}
            </div>
          )}

          {resultCreatives && (
            <Card>
              <CardHeader>
                <CardTitle>3. Your ad set</CardTitle>
              </CardHeader>
              <CardContent>
                {resultCreatives.length === 0 ? (
                  <EmptyState
                    icon={<Clapperboard className="h-10 w-10" />}
                    title="No creatives saved"
                    description="The variants could not be linked to a video. Check the warnings above."
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {resultCreatives.map((c) => (
                      <CreativeCard key={c.id} creative={c} onUpdated={onCreativeUpdated} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ---------------- CAMPAIGNS ---------------- */}
        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading ? (
            <LoadingRow label="Loading your campaigns…" />
          ) : campaignsError ? (
            <ErrorBanner message={campaignsError} />
          ) : !campaigns || campaigns.length === 0 ? (
            <EmptyState
              icon={<Clapperboard className="h-10 w-10" />}
              title="No campaigns yet"
              description="Generate your first ad set in the Create tab and it will show up here."
            />
          ) : (
            campaigns.map((camp) => {
              const isOpen = expanded.has(camp.id)
              return (
                <Card key={camp.id}>
                  <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => toggleExpand(camp.id)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <CardTitle className="truncate">{camp.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(camp.createdAt)} · {camp.creatives.length} creative
                          {camp.creatives.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">{getAdPlatform(camp.platform).label}</Badge>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>
                  {isOpen && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{camp.brief}</p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {camp.creatives.map((c) => (
                          <CreativeCard key={c.id} creative={c} onUpdated={onCreativeUpdated} />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* ---------------- WINNERS ---------------- */}
        <TabsContent value="winners" className="space-y-4">
          {winnersLoading ? (
            <LoadingRow label="Loading your winners…" />
          ) : winnersError ? (
            <ErrorBanner message={winnersError} />
          ) : !winners || winners.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-10 w-10" />}
              title="No winners marked yet"
              description="Mark a creative as a winner from the Create or Campaigns tab and it will show up here."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {winners.map((w) => (
                <div key={w.id} className="space-y-2">
                  <CreativeCard creative={w} onUpdated={onCreativeUpdated} />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-xs text-muted-foreground truncate min-w-0">{w.campaignName}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => useAsTemplate(w)}>
                      <Repeat className="h-3.5 w-3.5" /> Make more like this
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
