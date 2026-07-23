"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Upload,
  Search,
  Grid3X3,
  List,
  MoreHorizontal,
  Download,
  Play,
  ImageIcon,
  Video,
  Music,
  FileText,
  Trash2,
  Loader2,
  FolderOpen,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

type MediaType = "image" | "video" | "audio" | "document"

interface MediaAsset {
  id: string
  name: string
  fileName: string
  type: MediaType
  category: string | null
  url: string
  thumbnail: string | null
  duration: number | null
  fileSize: number | null
  resolution: string | null
  createdAt: string
  uploadedBy: { id: string; name: string | null }
}

interface MediaListResponse {
  assets: MediaAsset[]
  pagination: { page: number; limit: number; total: number; pages: number }
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB"
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || Number.isNaN(seconds)) return null
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedTab, setSelectedTab] = useState("my-media")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/media?limit=100")
      if (!res.ok) {
        throw new Error(`Failed to load media (${res.status})`)
      }
      const data: MediaListResponse = await res.json()
      setAssets(data.assets || [])
    } catch (err) {
      console.error("Failed to fetch media", err)
      setError("Couldn't load your media. Try refreshing.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "audio":
        return <Music className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const filteredMedia = assets.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const usedBytes = assets.reduce((sum, a) => sum + (a.fileSize || 0), 0)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append("files", file))

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Upload failed (${res.status})`)
      }

      await fetchAssets()
    } catch (err) {
      console.error("Upload failed", err)
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleDownload = (asset: MediaAsset) => {
    const link = document.createElement("a")
    link.href = asset.url
    link.download = asset.fileName || asset.name
    link.target = "_blank"
    link.rel = "noopener noreferrer"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Delete failed (${res.status})`)
      }
      setAssets((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error("Delete failed", err)
      setError(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
  <div className="min-h-[600px]">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold">Media Library</h1>
              <p className="text-muted-foreground mt-1">Manage your uploaded assets</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={handleUploadClick} disabled={uploading}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Upload Media"}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="my-media">My Media</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={viewMode === "grid" ? "" : "bg-transparent"}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={viewMode === "list" ? "" : "bg-transparent"}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-6">
              {/* Sidebar */}
              <div className="w-64 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Storage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used</span>
                        <span>{formatBytes(usedBytes)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {assets.length} {assets.length === 1 ? "file" : "files"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content */}
              <div className="flex-1">
                <TabsContent value={selectedTab} className="mt-0">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mb-3" />
                      <p className="text-sm">Loading your media...</p>
                    </div>
                  ) : filteredMedia.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                      <FolderOpen className="h-10 w-10 mb-3" />
                      <p className="text-sm">
                        {searchQuery
                          ? "No media matches your search."
                          : "No media yet — upload something."}
                      </p>
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredMedia.map((item) => (
                        <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                          <div className="relative">
                            <img
                              src={item.thumbnail || "/placeholder.svg"}
                              alt={item.name}
                              width={160}
                              height={64}
                              className="w-full h-32 object-cover rounded-t-lg aspect-[5/2]"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                              <div className="flex gap-1">
                                {item.type === "video" && (
                                  <Button size="sm" variant="secondary" asChild>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                      <Play className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                                <Button size="sm" variant="secondary" onClick={() => handleDownload(item)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="absolute bottom-2 left-2">{getMediaIcon(item.type)}</div>
                          </div>

                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm line-clamp-1 mb-1">{item.name}</h4>
                            <div className="text-xs text-muted-foreground">
                              {item.type === "audio" || item.type === "video"
                                ? formatDuration(item.duration) || item.resolution || "—"
                                : item.resolution || "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatBytes(item.fileSize || 0)}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-0">
                        <div className="space-y-1">
                          {filteredMedia.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                            >
                              <img
                                src={item.thumbnail || "/placeholder.svg"}
                                alt={item.name}
                                width={48}
                                height={48}
                                className="w-12 h-12 object-cover rounded aspect-square"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {getMediaIcon(item.type)}
                                  <h4 className="font-medium truncate">{item.name}</h4>
                                  {item.category && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.category}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {formatBytes(item.fileSize || 0)} •{" "}
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.type === "video" && (
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                      <Play className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(item)}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleDownload(item)}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDelete(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </div>
          </Tabs>
  </div>
  )
}
