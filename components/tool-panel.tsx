import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Scissors,
  Crop,
  RotateCw,
  Repeat,
  Eraser,
  Type,
  Music,
  ImageIcon,
  Video,
  Mic,
  Layers,
  Palette,
  Zap,
  Filter,
} from "lucide-react"

const toolCategories = [
  {
    title: "Basic Tools",
    tools: [
      { name: "Trim", icon: Scissors, shortcut: "T" },
      { name: "Crop", icon: Crop, shortcut: "C" },
      { name: "Rotate", icon: RotateCw, shortcut: "R" },
      { name: "Loop", icon: Repeat, shortcut: "L" },
      { name: "Remove BG", icon: Eraser, shortcut: "E" },
    ],
  },
  {
    title: "Media",
    tools: [
      { name: "Text", icon: Type, shortcut: "Shift+T" },
      { name: "Audio", icon: Music, shortcut: "A" },
      { name: "Image", icon: ImageIcon, shortcut: "I" },
      { name: "Video", icon: Video, shortcut: "V" },
      { name: "Record", icon: Mic, shortcut: "Shift+R" },
    ],
  },
  {
    title: "Effects",
    tools: [
      { name: "Layers", icon: Layers, shortcut: "Shift+L" },
      { name: "Colors", icon: Palette, shortcut: "Shift+C" },
      { name: "AI Effects", icon: Zap, shortcut: "Shift+A" },
      { name: "Filters", icon: Filter, shortcut: "F" },
    ],
  },
]

export function ToolPanel() {
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
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            <Zap className="h-4 w-4 mr-2" />
            Auto-enhance
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            <Music className="h-4 w-4 mr-2" />
            Add music
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
            <Type className="h-4 w-4 mr-2" />
            Add subtitles
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
