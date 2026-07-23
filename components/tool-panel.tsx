"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Type, Music, Video } from "lucide-react"
import { useEditor } from "@/lib/editor-context"

export function ToolPanel() {
  const { state, addTrack } = useEditor()

  // Match the numbering convention the timeline itself uses when adding tracks.
  const nextTrackNumber = (type: "video" | "audio" | "text") =>
    state.tracks.filter((track) => track.type === type).length + 1

  const toolCategories = [
    {
      title: "Tracks",
      tools: [
        {
          name: "Video",
          icon: Video,
          shortcut: "V",
          onClick: () => addTrack("video", `Video Track ${nextTrackNumber("video")}`),
        },
        {
          name: "Audio",
          icon: Music,
          shortcut: "A",
          onClick: () => addTrack("audio", `Audio Track ${nextTrackNumber("audio")}`),
        },
        {
          name: "Text",
          icon: Type,
          shortcut: "Shift+T",
          onClick: () => addTrack("text", `Text Track ${nextTrackNumber("text")}`),
        },
      ],
    },
  ]

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold mb-4">Tools</h2>

        {toolCategories.map((category, categoryIndex) => (
          <div key={category.title} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">{category.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {category.tools.map((tool) => (
                <Button
                  key={tool.name}
                  variant="outline"
                  className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-accent bg-transparent"
                  onClick={tool.onClick}
                >
                  <tool.icon className="h-5 w-5" />
                  <div className="text-center">
                    <div className="text-xs font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">{tool.shortcut}</div>
                  </div>
                </Button>
              ))}
            </div>
            {categoryIndex < toolCategories.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start bg-transparent"
            onClick={() => addTrack("audio", "Music")}
          >
            <Music className="h-4 w-4 mr-2" />
            Add music
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start bg-transparent"
            onClick={() => addTrack("text", "Subtitles")}
          >
            <Type className="h-4 w-4 mr-2" />
            Add subtitles
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
