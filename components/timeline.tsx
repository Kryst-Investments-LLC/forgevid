"use client"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, SkipBack, SkipForward, Plus, Layers, Volume2, Type, Trash2, Lock, Unlock, VolumeX } from "lucide-react"
import { useEditor } from "@/lib/editor-context"
import { useCallback, useEffect, useState } from "react"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"

interface TimelineClipProps {
  clip: { id: string; name: string; start: number; duration: number; color: string };
  isDragging?: boolean;
  isResizing?: boolean;
  onClick?: () => void;
  onSelect?: () => void;
  onResizeStart?: (edge: 'start' | 'end') => void;
}

function TimelineClip({ clip, isDragging, isResizing, onClick, onSelect, onResizeStart }: TimelineClipProps) {
  return (
    <div
      className={`absolute top-1 bottom-1 ${clip.color} rounded cursor-pointer hover:opacity-80 flex items-center px-2 border-2 ${isDragging ? 'border-primary' : 'border-transparent'} group`}
      style={{
        left: `${clip.start * 6}px`,
        width: `${clip.duration * 6}px`,
      }}
      onClick={onClick}
      onMouseDown={onSelect}
    >
      <span className="text-xs text-white font-medium truncate flex-1">{clip.name}</span>
      
      {/* Resize handles */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 opacity-0 group-hover:opacity-100 cursor-ew-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart?.('start');
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 opacity-0 group-hover:opacity-100 cursor-ew-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart?.('end');
        }}
      />
    </div>
  );
}

export function Timeline() {
  const editor = useEditor();
  const { state, setCurrentTime, setIsPlaying, setZoom, addTrack, removeTrack, toggleTrackLock, toggleTrackMute, removeClip, updateClip, undo, redo } = editor;
  const [dragOverlay, setDragOverlay] = useState<{ name: string; color: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<{ clipId: string; edge: 'start' | 'end' } | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Convert state tracks to timeline format
  const timelineTracks = state.tracks.map(track => {
    const clips = track.clips.map(clip => ({
      id: clip.id,
      name: `Clip ${clip.id.substring(0, 8)}`,
      start: clip.startTime,
      duration: clip.duration,
      color: track.type === 'video' ? 'bg-blue-500' : track.type === 'audio' ? 'bg-orange-500' : 'bg-yellow-500',
    }));
    return { ...track, clips };
  });

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const clip = timelineTracks.flatMap(t => t.clips).find(c => c.id === active.id);
    if (clip) {
      setDragOverlay({ name: clip.name, color: clip.color });
      setIsDragging(true);
    }
  }, [timelineTracks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setDragOverlay(null);
    setIsDragging(false);
    
    if (!over) return;
    
    const clip = timelineTracks.flatMap(t => t.clips).find(c => c.id === active.id);
    const targetTrack = timelineTracks.find(t => t.id === over.id);
    
    if (clip && targetTrack) {
      // Calculate new position based on timeline drop
      const timelineElement = event.activatorEvent?.target as HTMLElement;
      if (timelineElement) {
        const rect = timelineElement.getBoundingClientRect();
        const x = event.activatorEvent?.clientX ? event.activatorEvent.clientX - rect.left : clip.start * 6;
        const newStart = Math.max(0, x / 6);
        const trackId = clip.id.split('-')[0];
        updateClip(trackId, clip.id, { startTime: newStart });
      }
    }
  }, [timelineTracks, updateClip]);

  // Animation loop for playback
  useEffect(() => {
    let animationFrame: number;
    if (state.isPlaying && state.currentTime < state.duration) {
      const animate = () => {
        setCurrentTime(state.currentTime + (1 / state.duration) * (1000 / 60));
        animationFrame = requestAnimationFrame(animate);
        if (state.currentTime >= state.duration) {
          setIsPlaying(false);
        }
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [state.isPlaying, state.currentTime, state.duration, setCurrentTime, setIsPlaying]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / 6; // 6px per second at 100% zoom
    setCurrentTime(time);
  }, [setCurrentTime]);

  // Resize clip handler
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clip = timelineTracks.flatMap(t => t.clips).find(c => c.id === isResizing.clipId);
      if (!clip) return;

      const [trackId] = clip.id.split('-');
      const originalTrack = state.tracks.find(t => t.id === trackId);
      const originalClip = originalTrack?.clips.find(c => c.id === isResizing.clipId);
      if (!originalClip) return;

      // Calculate time delta based on mouse movement
      const timeDelta = e.movementX / 6;

      if (isResizing.edge === 'start') {
        // Resize from start: move startTime forward/backward and adjust duration
        const newStartTime = Math.max(0, originalClip.startTime + timeDelta);
        const newDuration = originalClip.duration - timeDelta;
        if (newDuration > 0.1) {
          updateClip(trackId, clip.id, { startTime: newStartTime, duration: newDuration });
        }
      } else {
        // Resize from end: adjust duration only
        const newDuration = Math.max(0.1, originalClip.duration + timeDelta);
        updateClip(trackId, clip.id, { duration: newDuration });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, timelineTracks, state.tracks, updateClip]);

  const handleTrackAction = useCallback((action: string, trackId?: string) => {
    if (action === 'add-video') {
      addTrack('video', `Video Track ${state.tracks.filter(t => t.type === 'video').length + 1}`);
    } else if (action === 'add-audio') {
      addTrack('audio', `Audio Track ${state.tracks.filter(t => t.type === 'audio').length + 1}`);
    } else if (action === 'add-text') {
      addTrack('text', `Text Track ${state.tracks.filter(t => t.type === 'text').length + 1}`);
    } else if (action === 'remove' && trackId) {
      if (confirm('Are you sure you want to remove this track?')) {
        removeTrack(trackId);
      }
    }
  }, [state.tracks, addTrack, removeTrack]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const timeMarkers = [];
  const totalDuration = Math.max(state.duration, 180); // Minimum 3 minutes visible
  const markerInterval = 10; // Every 10 seconds

  for (let i = 0; i <= totalDuration; i += markerInterval) {
    timeMarkers.push(i);
  }

  // Add default tracks if empty
  if (timelineTracks.length === 0) {
    timelineTracks.push(
      { id: 'video-1', type: 'video' as const, name: 'Video', clips: [] },
      { id: 'audio-1', type: 'audio' as const, name: 'Audio', clips: [] },
      { id: 'text-1', type: 'text' as const, name: 'Text', clips: [] }
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col bg-background">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <h3 className="font-medium">Timeline</h3>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsPlaying(!state.isPlaying)} aria-label={state.isPlaying ? "Pause" : "Play"}>
              {state.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentTime(state.currentTime - 5)} aria-label="Skip backward">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCurrentTime(state.currentTime + 5)} aria-label="Skip forward">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={undo} disabled={!editor.canUndo} aria-label="Undo">
              U
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} disabled={!editor.canRedo} aria-label="Redo">
              R
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="timeline-zoom" className="text-sm text-muted-foreground">Zoom:</label>
            <Slider 
              id="timeline-zoom" 
              value={[state.zoom]} 
              onValueChange={(value) => setZoom(value[0])} 
              min={25} 
              max={400} 
              step={25} 
              className="w-32" 
              aria-label="Timeline zoom level" 
            />
            <span className="text-sm text-muted-foreground">{state.zoom}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleTrackAction('add-video')}>
              <Layers className="h-4 w-4 mr-2" />
              Video
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleTrackAction('add-audio')}>
              <Volume2 className="h-4 w-4 mr-2" />
              Audio
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleTrackAction('add-text')}>
              <Type className="h-4 w-4 mr-2" />
              Text
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Labels */}
        <div className="w-48 border-r bg-muted/50 overflow-y-auto">
          <div className="space-y-1 p-2">
            {timelineTracks.map((track, index) => (
              <div key={track.id} className="h-16 flex items-center px-2 bg-background rounded border group relative">
                <div className="flex items-center flex-1">
                  {track.type === 'video' && <Layers className="h-4 w-4 mr-2 text-blue-500" />}
                  {track.type === 'audio' && (track.muted ? <VolumeX className="h-4 w-4 mr-2 text-orange-500" /> : <Volume2 className="h-4 w-4 mr-2 text-orange-500" />)}
                  {track.type === 'text' && <Type className="h-4 w-4 mr-2 text-yellow-500" />}
                  <span className="text-sm font-medium truncate">{track.name}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTrackLock(track.id);
                    }}
                    title={track.locked ? "Unlock track" : "Lock track"}
                  >
                    {track.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </Button>
                  {(track.type === 'audio' || track.type === 'video') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTrackMute(track.id);
                      }}
                      title={track.muted ? "Unmute track" : "Mute track"}
                    >
                      {track.muted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                    </Button>
                  )}
                  {timelineTracks.length > 3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleTrackAction('remove', track.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Tracks */}
        <div className="flex-1 relative overflow-x-auto overflow-y-auto" onClick={handleTimelineClick}>
          {/* Time Ruler */}
          <div className="h-8 border-b bg-muted/30 relative sticky top-0 z-20" style={{ minWidth: `${totalDuration * 6}px` }}>
            {timeMarkers.map((time) => (
              <div key={time} className="absolute top-0 h-full border-l border-border/50" style={{ left: `${time * 6}px` }}>
                <span className="text-xs text-muted-foreground ml-1">{formatTime(time)}</span>
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${state.currentTime * 6}px` }}
          >
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full -translate-y-1/2" />
          </div>

          {/* Tracks */}
          {timelineTracks.map((track) => (
            <div 
              key={track.id} 
              className={`h-16 border-b relative ${track.locked ? 'bg-background/30 opacity-50' : 'bg-background/50'}`} 
              style={{ minWidth: `${totalDuration * 6}px` }}
            >
              {!track.locked && track.clips.map((clip) => (
                <TimelineClip
                  key={clip.id}
                  clip={clip}
                  isDragging={selectedClip === clip.id}
                  isResizing={isResizing?.clipId === clip.id}
                  onClick={() => setSelectedClip(clip.id)}
                  onSelect={() => setSelectedClip(clip.id)}
                  onResizeStart={(edge) => setIsResizing({ clipId: clip.id, edge })}
                />
              ))}
              {track.locked && track.clips.map((clip) => (
                <div
                  key={clip.id}
                  className={`absolute top-1 bottom-1 ${clip.color} rounded opacity-50`}
                  style={{
                    left: `${clip.start * 6}px`,
                    width: `${clip.duration * 6}px`,
                  }}
                >
                  <span className="text-xs text-white/50 font-medium truncate px-2 block h-full flex items-center">{clip.name}</span>
                </div>
              ))}
              {/* Drop zone indicator */}
              {isDragging && !track.locked && (
                <div className="absolute inset-0 border-2 border-dashed border-primary bg-primary/5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected clip info */}
      {selectedClip && (
        <div className="border-t p-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm">Selected: {selectedClip}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const [trackId] = selectedClip.split('-');
                removeClip(trackId, selectedClip);
                setSelectedClip(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      )}
      </div>
      <DragOverlay>
        {dragOverlay && (
          <div className={`${dragOverlay.color} rounded p-2 opacity-80`}>
            {dragOverlay.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

