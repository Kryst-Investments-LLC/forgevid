"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Settings,
  Download,
  Share2,
  X
} from "lucide-react"

interface VideoPlayerProps {
  video: {
    id: string
    title: string
    duration: string
    thumbnail: string
    views: number
    size: string
    format: string
  } | null
  isOpen: boolean
  onClose: () => void
}

export function VideoPlayerModal({ video, isOpen, onClose }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(100)

  if (!video) return null

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
    // TODO: Implement actual video play/pause
    console.log(isPlaying ? 'Pausing video' : 'Playing video')
  }

  const handleMuteToggle = () => {
    setIsMuted(!isMuted)
    console.log(isMuted ? 'Unmuting video' : 'Muting video')
  }

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/video/${video.id}`
    navigator.clipboard?.writeText(shareUrl)
    alert('Video link copied to clipboard!')
  }

  const handleDownload = () => {
    alert(`Starting download for: ${video.title}`)
    // TODO: Implement actual download
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
          {/* Video Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white text-lg font-semibold">
                  {video.title}
                </DialogTitle>
                <DialogDescription className="text-gray-300 text-sm">
                  {video.views.toLocaleString()} views • {video.duration} • {video.size}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-white hover:bg-white/20"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Video Player Area */}
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            {/* Placeholder for actual video */}
            <div className="relative w-full h-full">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              
              {/* Play/Pause Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 w-16 h-16 rounded-full"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
              </div>

              {/* Video would be here in a real implementation */}
              {/* <video
                src={`/api/videos/${video.id}/stream`}
                className="w-full h-full object-cover"
                controls={false}
                poster={video.thumbnail}
              /> */}
            </div>
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${(currentTime / 100) * 100}%` }}
                />
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    onClick={handleMuteToggle}
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <div className="w-20 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${volume}%` }}
                    />
                  </div>
                </div>

                <span className="text-white text-sm">
                  0:00 / {video.duration}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}