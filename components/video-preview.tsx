"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, Maximize, ZoomIn, ZoomOut } from "lucide-react"
import { useEditor } from "@/lib/editor-context"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Functional Video Preview component connected to editor state
 * Shows real-time preview of timeline content
 */
export default function VideoPreview() {
  const editor = useEditor();
  const { state, setCurrentTime, setIsPlaying } = editor;
  const [volume, setVolume] = useState([75]);
  const [zoom, setZoom] = useState([100]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync video playback with editor state
  useEffect(() => {
    if (state.isPlaying && videoRef.current) {
      const animate = () => {
        if (videoRef.current && state.currentTime < state.duration) {
          setCurrentTime(state.currentTime + playbackSpeed * (1 / 60));
          animationFrameRef.current = requestAnimationFrame(animate);
          
          if (state.currentTime >= state.duration) {
            setIsPlaying(false);
          }
        }
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, state.currentTime, state.duration, playbackSpeed, setCurrentTime, setIsPlaying]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!state.isPlaying);
  }, [state.isPlaying, setIsPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    const newTime = (value[0] / 100) * state.duration;
    setCurrentTime(newTime);
  }, [state.duration, setCurrentTime]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate preview content based on timeline
  const renderPreviewContent = () => {
    // Find clips at current time
    const activeClips = state.tracks.flatMap(track => 
      track.clips.filter(clip => 
        clip.startTime <= state.currentTime && 
        state.currentTime <= clip.startTime + clip.duration
      )
    );

    if (activeClips.length === 0) {
      return (
        <div className="text-center text-white/60">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
            <Play className="h-8 w-8" />
          </div>
          <p>Video Preview</p>
          <p className="text-sm">Drag clips to timeline</p>
        </div>
      );
    }

    // Show preview based on clips
    const mainClip = activeClips[0];
    return (
      <div className="text-center text-white/80">
        <div className="text-lg font-semibold mb-2">
          {mainClip.id.substring(0, 8)}
        </div>
        <p className="text-sm opacity-75">
          {formatTime(state.currentTime)} / {formatTime(state.duration)}
        </p>
        <p className="text-xs opacity-50 mt-2">
          {state.tracks.length} tracks • {activeClips.length} active clip{activeClips.length > 1 ? 's' : ''}
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl">
      {/* Preview Canvas */}
      <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-0 flex items-center justify-center">
          {renderPreviewContent()}
        </div>

        {/* Overlay Controls */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-black/80 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={handlePlayPause}
                aria-label={state.isPlaying ? "Pause video" : "Play video"}
              >
                {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <div className="flex-1">
                <Slider
                  value={[(state.currentTime / state.duration) * 100]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="w-full"
                  aria-label="Video playback timeline"
                />
              </div>

              <span className="text-white text-sm font-mono min-w-[80px]">
                {formatTime(state.currentTime)} / {formatTime(state.duration)}
              </span>

              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-white" />
                <Slider 
                  value={volume} 
                  onValueChange={setVolume} 
                  max={100} 
                  step={1} 
                  className="w-20" 
                  aria-label="Volume control" 
                />
              </div>

              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" aria-label="Fullscreen">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="zoom-slider" className="text-sm text-muted-foreground">Zoom:</label>
          <Button variant="ghost" size="sm" onClick={() => setZoom([Math.max(25, zoom[0] - 25)])} aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Slider 
            id="zoom-slider" 
            value={zoom} 
            onValueChange={setZoom} 
            min={25} 
            max={200} 
            step={25} 
            className="w-24" 
            aria-label="Video zoom level" 
          />
          <Button variant="ghost" size="sm" onClick={() => setZoom([Math.min(200, zoom[0] + 25)])} aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{zoom[0]}%</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="speed-select" className="text-sm text-muted-foreground">Speed:</label>
          <select 
            id="speed-select" 
            className="text-sm border rounded px-2 py-1"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            aria-label="Select playback speed"
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>
    </div>
  );
}

