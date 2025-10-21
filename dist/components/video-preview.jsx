"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Maximize, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
function VideoPreview() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState([75]);
    const [zoom, setZoom] = useState([100]);
    return (<div className="w-full max-w-4xl">
      {/* Preview Canvas */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/60">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
              <Play className="h-8 w-8"/>
            </div>
            <p>Video Preview</p>
            <p className="text-sm">1920 x 1080 • 30fps</p>
          </div>
        </div>

        {/* Overlay Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/80 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setIsPlaying(!isPlaying)} aria-label={isPlaying ? "Pause video" : "Play video"}>
                {isPlaying ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
              </Button>

              <div className="flex-1">
                <Slider value={[currentTime]} onValueChange={(value) => setCurrentTime(value[0])} max={100} step={1} className="w-full" aria-label="Video playback timeline"/>
              </div>

              <span className="text-white text-sm font-mono">02:34 / 05:12</span>

              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-white"/>
                <Slider value={volume} onValueChange={setVolume} max={100} step={1} className="w-20" aria-label="Volume control"/>
              </div>

              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" aria-label="Fullscreen">
                <Maximize className="h-4 w-4"/>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="zoom-slider" className="text-sm text-muted-foreground">Zoom:</label>
          <Button variant="ghost" size="sm" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4"/>
          </Button>
          <Slider id="zoom-slider" value={zoom} onValueChange={setZoom} min={25} max={200} step={25} className="w-24" aria-label="Video zoom level"/>
          <Button variant="ghost" size="sm" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4"/>
          </Button>
          <span className="text-sm text-muted-foreground">{zoom[0]}%</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="resolution-select" className="text-sm text-muted-foreground">Resolution:</label>
          <select id="resolution-select" className="text-sm border rounded px-2 py-1" aria-label="Select video resolution">
            <option>1920x1080 (Full HD)</option>
            <option>3840x2160 (4K)</option>
            <option>1280x720 (HD)</option>
          </select>
        </div>
      </div>
    </div>);
}
export default VideoPreview;
