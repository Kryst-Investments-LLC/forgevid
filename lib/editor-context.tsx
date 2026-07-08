"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

// Editor state types
export interface TimelineClip {
  id: string;
  assetId: string;
  startTime: number;
  duration: number;
  trimStart?: number;
  trimEnd?: number;
  muted?: boolean;
  locked?: boolean;
  effects?: Array<{ id: string; type: string; settings: Record<string, any> }>;
}

export interface EditorTrack {
  id: string;
  type: 'video' | 'audio' | 'text';
  name: string;
  clips: TimelineClip[];
  locked?: boolean;
  muted?: boolean;
  visible?: boolean;
}

export interface EditorState {
  videoId: string | null;
  tracks: EditorTrack[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  zoom: number;
  playbackSpeed: number;
  undoStack: string[];
  redoStack: string[];
}

interface EditorContextType {
  state: EditorState;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  addTrack: (type: 'video' | 'audio' | 'text', name: string) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<EditorTrack>) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  addClip: (trackId: string, clip: TimelineClip) => void;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  trimClip: (trackId: string, clipId: string, trimStart: number, trimEnd: number) => void;
  splitClip: (trackId: string, clipId: string, splitTime: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveProject: () => Promise<void>;
  loadProject: (videoId: string) => Promise<void>;
  exportVideo: (settings?: any) => Promise<string>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const initialState: EditorState = {
  videoId: null,
  tracks: [],
  currentTime: 0,
  duration: 300, // 5 minutes default
  isPlaying: false,
  zoom: 100,
  playbackSpeed: 1,
  undoStack: [],
  redoStack: [],
};

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EditorState>(initialState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setCurrentTime = useCallback((time: number) => {
    setState(prev => ({ ...prev, currentTime: Math.max(0, Math.min(time, prev.duration)) }));
  }, []);

  const setIsPlaying = useCallback((playing: boolean) => {
    setState(prev => ({ ...prev, isPlaying: playing }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom: Math.max(25, Math.min(zoom, 400)) }));
  }, []);

  const saveStateToUndo = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoStack: [...prev.undoStack.slice(-50), JSON.stringify(prev)], // Keep last 50 states
      redoStack: [],
    }));
  }, []);

  const addTrack = useCallback((type: 'video' | 'audio' | 'text', name: string = `New ${type} track`) => {
    saveStateToUndo();
    setState(prev => ({
      ...prev,
      tracks: [...prev.tracks, { id: `track-${Date.now()}`, type, name, clips: [] }],
    }));
  }, [saveStateToUndo]);

  const removeTrack = useCallback((trackId: string) => {
    saveStateToUndo();
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.filter(track => track.id !== trackId),
    }));
  }, [saveStateToUndo]);

  const updateTrack = useCallback((trackId: string, updates: Partial<EditorTrack>) => {
    saveStateToUndo();
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track => (track.id === trackId ? { ...track, ...updates } : track)),
    }));
  }, [saveStateToUndo]);

  const toggleTrackLock = useCallback((trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, locked: !track.locked } : track
      ),
    }));
  }, []);

  const toggleTrackMute = useCallback((trackId: string) => {
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
    }));
  }, []);

  const addClip = useCallback((trackId: string, clip: TimelineClip) => {
    saveStateToUndo();
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, clips: [...track.clips, clip] } : track
      ),
    }));
  }, [saveStateToUndo]);

  const removeClip = useCallback((trackId: string, clipId: string) => {
    saveStateToUndo();
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId ? { ...track, clips: track.clips.filter(clip => clip.id !== clipId) } : track
      ),
    }));
  }, [saveStateToUndo]);

  const updateClip = useCallback((trackId: string, clipId: string, updates: Partial<TimelineClip>) => {
    saveStateToUndo();
    setState(prev => ({
      ...prev,
      tracks: prev.tracks.map(track =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map(clip => (clip.id === clipId ? { ...clip, ...updates } : clip)),
            }
          : track
      ),
    }));
  }, [saveStateToUndo]);

  const trimClip = useCallback((trackId: string, clipId: string, trimStart: number, trimEnd: number) => {
    updateClip(trackId, clipId, { trimStart, trimEnd });
  }, [updateClip]);

  const splitClip = useCallback((trackId: string, clipId: string, splitTime: number) => {
    saveStateToUndo();
    setState(prev => {
      const track = prev.tracks.find(t => t.id === trackId);
      if (!track) return prev;

      const clip = track.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      const splitPoint = splitTime - clip.startTime;

      const updatedClips = track.clips.flatMap(c =>
        c.id === clipId
          ? [
              { ...c, duration: splitPoint, trimEnd: (c.trimEnd || c.duration) - splitPoint },
              {
                ...c,
                id: `${clipId}-split-${Date.now()}`,
                startTime: clip.startTime + splitPoint,
                duration: c.duration - splitPoint,
                trimStart: splitPoint,
              },
            ]
          : [c]
      );

      return {
        ...prev,
        tracks: prev.tracks.map(t => (t.id === trackId ? { ...t, clips: updatedClips } : t)),
      };
    });
  }, [saveStateToUndo]);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.undoStack.length === 0) return prev;
      const previousState = JSON.parse(prev.undoStack[prev.undoStack.length - 1]);
      return {
        ...previousState,
        undoStack: prev.undoStack.slice(0, -1),
        redoStack: [...prev.redoStack, JSON.stringify(prev)],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.redoStack.length === 0) return prev;
      const nextState = JSON.parse(prev.redoStack[prev.redoStack.length - 1]);
      return {
        ...nextState,
        undoStack: [...prev.undoStack, JSON.stringify(prev)],
        redoStack: prev.redoStack.slice(0, -1),
      };
    });
  }, []);

  const saveProject = useCallback(async () => {
    if (!state.videoId) {
      console.error('No video ID to save project');
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/editor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: state.videoId,
            tracks: state.tracks,
            operation: 'save',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save project');
        }
      } catch (error) {
        console.error('[Editor] Save error:', error);
      }
    }, 500);
  }, [state.videoId, state.tracks]);

  const loadProject = useCallback(async (videoId: string) => {
    try {
      const response = await fetch(`/api/editor?videoId=${videoId}`);
      if (!response.ok) throw new Error('Failed to load project');

      const data = await response.json();
      if (data.success && data.project) {
        setState(prev => ({
          ...prev,
          videoId,
          tracks: data.project.tracks || [],
          duration: data.project.video?.duration || 300,
        }));
      }
    } catch (error) {
      console.error('[Editor] Load error:', error);
    }
  }, []);

  const exportVideo = useCallback(async (settings?: any) => {
    if (!state.videoId) {
      throw new Error('No video ID to export');
    }

    try {
      const response = await fetch('/api/editor/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: state.videoId,
          settings: settings || {},
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start export');
      }

      const data = await response.json();
      return data.exportId || 'unknown';
    } catch (error) {
      console.error('[Editor] Export error:', error);
      throw error;
    }
  }, [state.videoId]);

  const value: EditorContextType = {
    state,
    setCurrentTime,
    setIsPlaying,
    setZoom,
    addTrack,
    removeTrack,
    updateTrack,
    toggleTrackLock,
    toggleTrackMute,
    addClip,
    removeClip,
    updateClip,
    trimClip,
    splitClip,
    undo,
    redo,
    canUndo: state.undoStack.length > 0,
    canRedo: state.redoStack.length > 0,
    saveProject,
    loadProject,
    exportVideo,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
}

