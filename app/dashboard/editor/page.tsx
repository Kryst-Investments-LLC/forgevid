"use client";

import { EditorProvider, useEditor } from "@/lib/editor-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Share2, Sparkles, FolderOpen } from "lucide-react";
import VideoPreview from "@/components/video-preview";
import { Timeline } from "@/components/timeline";
import { ToolPanel } from "@/components/tool-panel";
import { AIPromptPanel } from "@/components/ai-prompt-panel";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function EditorToolbar() {
  const editor = useEditor();
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleExport = async () => {
    if (!editor.state.videoId) {
      alert('No video project loaded');
      return;
    }

    setIsExporting(true);
    try {
      const exportId = await editor.exportVideo({
        format: 'mp4',
        quality: 'hd',
        fps: 30,
      });
      alert(`Export started! Export ID: ${exportId}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!editor.state.videoId) {
      alert('No video project loaded');
      return;
    }

    setIsSharing(true);
    try {
      const response = await fetch(`/api/videos/${editor.state.videoId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Could not enable sharing');
      }
      const url = `${window.location.origin}${data.shareUrl}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      alert(`Share link copied: ${url}`);
    } catch (error) {
      console.error('Share failed:', error);
      alert(error instanceof Error ? error.message : 'Could not enable sharing');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={editor.undo} disabled={!editor.canUndo}>
        U
      </Button>
      <Button variant="ghost" size="sm" onClick={editor.redo} disabled={!editor.canRedo}>
        R
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <Button variant="outline" size="sm" onClick={handleShare} disabled={isSharing || !editor.state.videoId}>
        <Share2 className="h-4 w-4 mr-2" />
        {isSharing ? 'Sharing...' : 'Share'}
      </Button>
      <Button size="sm" onClick={handleExport} disabled={isExporting}>
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
    </div>
  );
}

function EditorEmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center max-w-sm px-4">
        <FolderOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <h1 className="font-heading text-lg font-medium mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <Link href="/dashboard/videos">
          <Button>Go to My Videos</Button>
        </Link>
      </div>
    </div>
  );
}

function EditorContent({ videoId }: { videoId: string | null }) {
  const editor = useEditor();

  useEffect(() => {
    if (videoId) {
      editor.loadProject(videoId);
    }
    // Only re-run when the URL's videoId actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  if (!videoId) {
    return (
      <EditorEmptyState
        title="No project open"
        message="Open a video from My Videos to edit it."
      />
    );
  }

  if (editor.state.loadError) {
    return (
      <EditorEmptyState
        title="Couldn't open this project"
        message={editor.state.loadError}
      />
    );
  }

  if (editor.state.isLoadingProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold">ForgeVid</span>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="font-medium">Video Editor</h1>
            <p className="text-xs text-muted-foreground">Drag clips to timeline to start editing</p>
          </div>
        </div>

        <EditorToolbar />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-64 border-r bg-card overflow-y-auto">
          <ToolPanel />
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Preview Area */}
          <div className="flex-1 p-6 bg-muted/30">
            <div className="h-full flex items-center justify-center">
              <VideoPreview />
            </div>
          </div>

          {/* Timeline Area */}
          <div className="h-80 border-t bg-card">
            <Timeline />
          </div>
        </div>

        {/* Right Sidebar - AI & Properties */}
        <div className="w-80 border-l bg-card overflow-y-auto">
          <AIPromptPanel />
        </div>
      </div>
    </div>
  );
}

function EditorPageInner() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get("videoId");

  return (
    <EditorProvider>
      <EditorContent videoId={videoId} />
    </EditorProvider>
  );
}

// useSearchParams() requires a Suspense boundary during static prerender.
export default function VideoEditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorPageInner />
    </Suspense>
  );
}
