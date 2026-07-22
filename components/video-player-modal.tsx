"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, Share2, X } from "lucide-react"

interface PlayerVideo {
  id: string
  title: string
  thumbnail?: string | null
  duration?: number | null
  fileSize?: number | null
  url?: string | null
  fileUrl?: string | null
}

interface VideoPlayerProps {
  video: PlayerVideo | null
  isOpen: boolean
  onClose: () => void
}

function fmtDuration(sec?: number | null): string {
  if (sec == null) return ""
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function fmtBytes(bytes?: number | null): string {
  if (!bytes) return ""
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`
}

export function VideoPlayerModal({ video, isOpen, onClose }: VideoPlayerProps) {
  if (!video) return null
  const src = video.fileUrl || video.url || null

  const handleShare = async () => {
    if (!src) return
    try {
      await navigator.clipboard.writeText(src)
      alert("Video link copied to clipboard!")
    } catch {
      alert(src)
    }
  }

  const handleDownload = () => {
    if (!src) return
    const a = document.createElement("a")
    a.href = src
    a.download = `${video.title || "video"}.mp4`
    a.target = "_blank"
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const meta = [fmtDuration(video.duration), fmtBytes(video.fileSize)].filter(Boolean).join(" • ")

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black">
        <DialogHeader className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <DialogTitle className="text-white text-lg font-semibold truncate">{video.title}</DialogTitle>
              <DialogDescription className="text-gray-300 text-sm">{meta || " "}</DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleShare} disabled={!src}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={handleDownload} disabled={!src}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="w-full aspect-video flex items-center justify-center">
          {src ? (
            <video
              src={src}
              className="w-full h-full"
              controls
              autoPlay
              poster={video.thumbnail || undefined}
            >
              Your browser does not support the video tag.
            </video>
          ) : video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-contain" />
          ) : (
            <div className="text-gray-400 text-sm p-8 text-center">Preview not available yet.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
