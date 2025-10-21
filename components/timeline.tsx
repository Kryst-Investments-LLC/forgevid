"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Plus, Layers, Volume2 } from "lucide-react"
import { useState } from "react"

const timelineData = {
  video: [
    { id: 1, name: "Intro Clip", start: 0, duration: 30, color: "bg-blue-500" },
    { id: 2, name: "Main Content", start: 30, duration: 120, color: "bg-green-500" },
    { id: 3, name: "Outro", start: 150, duration: 15, color: "bg-purple-500" },
  ],
  audio: [
    { id: 1, name: "Background Music", start: 0, duration: 165, color: "bg-orange-500" },
    { id: 2, name: "Voiceover", start: 10, duration: 140, color: "bg-red-500" },
  ],
  text: [
    { id: 1, name: "Title Card", start: 0, duration: 5, color: "bg-yellow-500" },
    { id: 2, name: "Call to Action", start: 160, duration: 5, color: "bg-pink-500" },
  ],
}

export function Timeline() {
  const [currentTime, setCurrentTime] = useState(0)
  const [zoom, setZoom] = useState([100])
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="h-full flex flex-col">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h3 className="font-medium">Timeline</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" aria-label="Skip backward">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" aria-label="Skip forward">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="timeline-zoom" className="text-sm text-muted-foreground">Zoom:</label>
            <Slider id="timeline-zoom" value={zoom} onValueChange={setZoom} min={50} max={200} step={25} className="w-24" aria-label="Timeline zoom level" />
            <span className="text-sm text-muted-foreground">{zoom[0]}%</span>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Track
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex">
        {/* Track Labels */}
        <div className="w-32 border-r bg-muted/50">
          <div className="space-y-1 p-2">
            <div className="h-12 flex items-center px-2 bg-background rounded border">
              <Layers className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm font-medium">Video</span>
            </div>
            <div className="h-12 flex items-center px-2 bg-background rounded border">
              <Volume2 className="h-4 w-4 mr-2 text-orange-500" />
              <span className="text-sm font-medium">Audio</span>
            </div>
            <div className="h-12 flex items-center px-2 bg-background rounded border">
              <span className="text-lg mr-2">T</span>
              <span className="text-sm font-medium">Text</span>
            </div>
          </div>
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 relative overflow-x-auto">
          {/* Time Ruler */}
          <div className="h-8 border-b bg-muted/30 relative">
            {Array.from({ length: 18 }, (_, i) => (
              <div key={i} className="absolute top-0 h-full border-l border-border/50" style={{ left: `${i * 60}px` }}>
                <span className="text-xs text-muted-foreground ml-1">
                  {Math.floor((i * 10) / 60)}:{((i * 10) % 60).toString().padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
            style={{ left: `${currentTime * 6}px` }}
          />

          {/* Video Track */}
          <div className="h-12 border-b relative bg-background/50">
            {timelineData.video.map((clip) => (
              <div
                key={clip.id}
                className={`absolute top-1 bottom-1 ${clip.color} rounded cursor-pointer hover:opacity-80 flex items-center px-2`}
                style={{
                  left: `${clip.start * 6}px`,
                  width: `${clip.duration * 6}px`,
                }}
              >
                <span className="text-xs text-white font-medium truncate">{clip.name}</span>
              </div>
            ))}
          </div>

          {/* Audio Track */}
          <div className="h-12 border-b relative bg-background/50">
            {timelineData.audio.map((clip) => (
              <div
                key={clip.id}
                className={`absolute top-1 bottom-1 ${clip.color} rounded cursor-pointer hover:opacity-80 flex items-center px-2`}
                style={{
                  left: `${clip.start * 6}px`,
                  width: `${clip.duration * 6}px`,
                }}
              >
                <span className="text-xs text-white font-medium truncate">{clip.name}</span>
              </div>
            ))}
          </div>

          {/* Text Track */}
          <div className="h-12 border-b relative bg-background/50">
            {timelineData.text.map((clip) => (
              <div
                key={clip.id}
                className={`absolute top-1 bottom-1 ${clip.color} rounded cursor-pointer hover:opacity-80 flex items-center px-2`}
                style={{
                  left: `${clip.start * 6}px`,
                  width: `${clip.duration * 6}px`,
                }}
              >
                <span className="text-xs text-white font-medium truncate">{clip.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
