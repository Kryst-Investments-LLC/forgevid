"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Play, 
  Pause, 
  Download, 
  Share2, 
  Trash2, 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Clock,
  Eye,
  Calendar
} from "lucide-react"
import { useState } from "react"
import { useSubscription } from "@/hooks/use-subscription-simple"
import { VideoPlayerModal } from "@/components/video-player-modal"

const mockVideos = [
  {
    id: "vid_1",
    title: "Product Demo 2024",
    thumbnail: "/placeholder.svg?key=demo",
    duration: "2:34",
    status: "completed",
    createdAt: "2024-03-15",
    views: 1247,
    size: "156 MB",
    format: "MP4"
  },
  {
    id: "vid_2", 
    title: "Marketing Campaign Video",
    thumbnail: "/placeholder.svg?key=marketing",
    duration: "1:45",
    status: "processing",
    createdAt: "2024-03-14",
    views: 892,
    size: "98 MB",
    format: "MP4"
  },
  {
    id: "vid_3",
    title: "Tutorial Series Intro",
    thumbnail: "/placeholder.svg?key=tutorial",
    duration: "3:21",
    status: "completed",
    createdAt: "2024-03-12",
    views: 2156,
    size: "245 MB",
    format: "MP4"
  }
]

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTab, setSelectedTab] = useState("all")
  const [selectedVideo, setSelectedVideo] = useState<typeof mockVideos[0] | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const { hasFeature } = useSubscription()

  const filteredVideos = mockVideos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTab = selectedTab === "all" || video.status === selectedTab
    return matchesSearch && matchesTab
  })

  const handleVideoAction = (action: string, videoId: string) => {
  // Removed debug log for production
    
    // Find the video by ID
    const video = mockVideos.find(v => v.id === videoId)
    
    // Provide user feedback for actions
    switch(action) {
      case 'play':
        if (video) {
          setSelectedVideo(video)
          setIsPlayerOpen(true)
        }
        break;
      case 'share':
        navigator.clipboard?.writeText(`http://localhost:3000/video/${videoId}`)
        alert('Video link copied to clipboard!')
        break;
      case 'download':
        alert(`Starting download for video: ${videoId}`)
        // TODO: Implement actual download
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this video?')) {
          alert(`Video ${videoId} would be deleted`)
          // TODO: Implement actual deletion
        }
        break;
      default:
        // Unknown action: no-op
    }
  }

  const handleVideoClick = (video: typeof mockVideos[0]) => {
    setSelectedVideo(video)
    setIsPlayerOpen(true)
  }

  const handleClosePlayer = () => {
    setIsPlayerOpen(false)
    setSelectedVideo(null)
  }

  const handleUploadVideo = () => {
    // Create a file input and trigger it
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        alert(`Selected file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)
        // TODO: Implement actual upload to /api/videos
      }
    }
    input.click()
  }
  return (
    <div className="min-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold">My Videos</h1>
              <p className="text-muted-foreground mt-1">Manage and organize your video content</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  className="pl-10 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={handleUploadVideo}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="min-h-[110px] min-w-[200px]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Videos</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <Play className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">8.2K</p>
                  </div>
                  <Eye className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                    <p className="text-2xl font-bold">2.1 GB</p>
                  </div>
                  <div className="text-xs text-muted-foreground">of 10 GB</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Processing</p>
                    <p className="text-2xl font-bold">1</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Video Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Videos</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              {/* Video Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <Card key={video.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="relative" onClick={() => handleVideoClick(video)}>
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                        <Button 
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVideoAction('play', video.id)
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Play
                        </Button>
                      </div>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-48 object-cover rounded-t-lg"
                          />
                          <Badge 
                            className="absolute top-2 right-2"
                            variant={video.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {video.status}
                          </Badge>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {video.duration}
                          </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold line-clamp-2 mb-2">{video.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {video.createdAt}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {video.views.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {video.size} • {video.format}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 ml-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVideoAction('share', video.id)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVideoAction('download', video.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVideoAction('delete', video.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {filteredVideos.length === 0 && (
                <div className="text-center py-12">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No videos found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? "Try adjusting your search terms" : "Upload your first video to get started"}
                  </p>
                  <Button onClick={handleUploadVideo}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Video
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal 
          video={selectedVideo}
          isOpen={isPlayerOpen}
          onClose={handleClosePlayer}
        />
      )}
    </div>
  )
}