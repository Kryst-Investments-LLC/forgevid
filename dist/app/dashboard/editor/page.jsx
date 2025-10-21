import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Download, Share2, Undo, Redo, Sparkles } from "lucide-react";
import VideoPreview from "@/components/video-preview";
import { Timeline } from "@/components/timeline";
import { ToolPanel } from "@/components/tool-panel";
import { AIPromptPanel } from "@/components/ai-prompt-panel";
export default function VideoEditorPage() {
    return (<div className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground"/>
            </div>
            <span className="font-heading font-bold">VidForge AI</span>
          </div>
          <Separator orientation="vertical" className="h-6"/>
          <div>
            <h1 className="font-medium">Product Launch Video</h1>
            <p className="text-xs text-muted-foreground">Last saved 2 minutes ago</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Undo className="h-4 w-4"/>
          </Button>
          <Button variant="ghost" size="sm">
            <Redo className="h-4 w-4"/>
          </Button>
          <Separator orientation="vertical" className="h-6"/>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2"/>
            Share
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2"/>
            Export
          </Button>
        </div>
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
    </div>);
}
