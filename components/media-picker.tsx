"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ImageIcon, Video, RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

export interface MediaAssetSummary {
  id: string
  name: string
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT"
  url: string
  thumbnail?: string | null
}

interface MediaPickerProps {
  /** Selected asset ids, IN ORDER — order decides which scene each asset lands on. */
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

/**
 * Pick your own footage/photos for a generation ("use my product shots").
 *
 * Selection order is meaningful: asset #1 fills scene 1, #2 fills scene 2, and
 * stock footage only covers whatever is left. The rank badge makes that visible
 * instead of leaving it as a surprise.
 */
export function MediaPicker({ value, onChange, disabled }: MediaPickerProps) {
  const [assets, setAssets] = useState<MediaAssetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/media?limit=100")
      if (!res.ok) throw new Error("Failed to load your media")
      const data = await res.json()
      // Only visual assets can become scenes.
      const visual: MediaAssetSummary[] = (data.assets ?? []).filter(
        (a: MediaAssetSummary) => a.type === "IMAGE" || a.type === "VIDEO",
      )
      setAssets(visual)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load your media")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (id: string) => {
    if (disabled) return
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  }

  const visible = search
    ? assets.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    : assets

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">Your media</label>
        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={disabled}>
              <X className="h-3 w-3 mr-1" />
              Clear ({value.length})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading your media…</p>
      ) : assets.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No uploads yet. Anything you upload to Media appears here and can be used as a scene.
        </p>
      ) : (
        <>
          {assets.length > 8 && (
            <Input
              placeholder="Search your media…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          )}

          <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
            {visible.map((asset) => {
              const rank = value.indexOf(asset.id)
              const selected = rank !== -1
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => toggle(asset.id)}
                  disabled={disabled}
                  title={asset.name}
                  className={`relative aspect-video rounded border overflow-hidden text-left transition-all ${
                    selected ? "border-cyan-400 ring-2 ring-cyan-400/40" : "border-gray-600 hover:border-gray-500"
                  } disabled:opacity-50`}
                >
                  {asset.thumbnail || asset.type === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnail || asset.url}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-muted/30">
                      <Video className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  {selected && (
                    <Badge className="absolute top-1 left-1 h-5 min-w-5 justify-center px-1">
                      {rank + 1}
                    </Badge>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] text-white truncate px-1 py-0.5 flex items-center gap-1">
                    {asset.type === "IMAGE" ? (
                      <ImageIcon className="h-2.5 w-2.5 shrink-0" />
                    ) : (
                      <Video className="h-2.5 w-2.5 shrink-0" />
                    )}
                    {asset.name}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Numbered in the order they&apos;ll be used: #1 becomes scene 1, #2 scene 2, and so on.
            Stock footage fills any remaining scenes. Photos get a slow zoom.
          </p>
        </>
      )}
    </div>
  )
}

export default MediaPicker
