"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Type, Music, Video, Scissors, Trash2, ArrowLeftToLine } from "lucide-react"
import { useEditor } from "@/lib/editor-context"

export function ToolPanel() {
  const { state, addTrack, removeClip, trimClip, splitClip } = useEditor()

  // Match the numbering convention the timeline itself uses when adding tracks.
  const nextTrackNumber = (type: "video" | "audio" | "text") =>
    state.tracks.filter((track) => track.type === type).length + 1

  const selectedClip =
    state.tracks
      .find((track) => track.id === state.selectedTrackId)
      ?.clips.find((clip) => clip.id === state.selectedClipId) ?? null

  const handleSplitAtPlayhead = () => {
    if (!state.selectedClipId || !state.selectedTrackId) return
    splitClip(state.selectedTrackId, state.selectedClipId, state.currentTime)
  }

  const handleDeleteClip = () => {
    if (!state.selectedClipId || !state.selectedTrackId) return
    removeClip(state.selectedTrackId, state.selectedClipId)
  }

  const handleTrimStartToPlayhead = () => {
    if (!state.selectedClipId || !state.selectedTrackId || !selectedClip) return
    const trimStart = Math.max(0, state.currentTime - selectedClip.startTime)
    const trimEnd = selectedClip.trimEnd ?? selectedClip.duration
    trimClip(state.selectedTrackId, state.selectedClipId, trimStart, trimEnd)
  }

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

        <Separator className="mb-4" />

        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Clip</h3>
          {!selectedClip && (
            <p className="text-xs text-muted-foreground mb-3">Select a clip on the timeline</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-accent bg-transparent"
              onClick={handleSplitAtPlayhead}
              disabled={!selectedClip}
            >
              <Scissors className="h-5 w-5" />
              <div className="text-center">
                <div className="text-xs font-medium">Split at playhead</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-accent bg-transparent"
              onClick={handleDeleteClip}
              disabled={!selectedClip}
            >
              <Trash2 className="h-5 w-5" />
              <div className="text-center">
                <div className="text-xs font-medium">Delete clip</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-accent bg-transparent col-span-2"
              onClick={handleTrimStartToPlayhead}
              disabled={!selectedClip}
            >
              <ArrowLeftToLine className="h-5 w-5" />
              <div className="text-center">
                <div className="text-xs font-medium">Trim start to playhead</div>
              </div>
            </Button>
          </div>
        </div>
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
