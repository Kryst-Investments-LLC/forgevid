"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Sparkles, Wand2, Clock, Palette, Volume2, Type, Crown } from "lucide-react"
import { useState } from "react"
import { FeatureGate } from "./feature-gate"

export function AIPromptPanel() {
  const [prompt, setPrompt] = useState("")
  const [videoLength, setVideoLength] = useState([30])
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false)
    }, 3000)
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Studio
        </h2>

        {/* AI Prompt Input */}
        <FeatureGate feature="aiFeatures" plan="starter">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Generate with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your video idea... e.g., 'Create a product ad for eco-friendly shoes with upbeat music and modern transitions'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Video Length: {videoLength[0]}s</label>
                  <Slider
                    value={videoLength}
                    onValueChange={setVideoLength}
                    min={15}
                    max={300}
                    step={15}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Style</label>
                    <select className="w-full text-sm border rounded px-2 py-1">
                      <option>Modern</option>
                      <option>Cinematic</option>
                      <option>Minimal</option>
                      <option>Energetic</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Mood</label>
                    <select className="w-full text-sm border rounded px-2 py-1">
                      <option>Professional</option>
                      <option>Playful</option>
                      <option>Dramatic</option>
                      <option>Calm</option>
                    </select>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={handleGenerate} disabled={!prompt.trim() || isGenerating}>
                {isGenerating ? (
                  <>
                    <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Video
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </FeatureGate>

        {/* AI Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">AI Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FeatureGate
              feature="aiFeatures"
              plan="starter"
              fallback={
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" disabled>
                  <Type className="h-4 w-4 mr-2" />
                  Generate Script
                  <Crown className="h-3 w-3 ml-auto text-yellow-500" />
                </Button>
              }
            >
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <Type className="h-4 w-4 mr-2" />
                Generate Script
              </Button>
            </FeatureGate>

            <FeatureGate
              feature="aiFeatures"
              plan="pro"
              fallback={
                <Button variant="outline" size="sm" className="w-full justify-start bg-transparent" disabled>
                  <Volume2 className="h-4 w-4 mr-2" />
                  AI Voiceover
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Pro
                  </Badge>
                </Button>
              }
            >
              <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                <Volume2 className="h-4 w-4 mr-2" />
                AI Voiceover
              </Button>
            </FeatureGate>

            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              <Palette className="h-4 w-4 mr-2" />
              Smart Colors
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
              <Clock className="h-4 w-4 mr-2" />
              Auto-timing
            </Button>
          </CardContent>
        </Card>

        {/* Properties Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">Select an element to edit its properties</div>

            {/* Example properties when element is selected */}
            <div className="space-y-3 opacity-50">
              <div>
                <label className="text-xs font-medium">Opacity</label>
                <Slider defaultValue={[100]} max={100} step={1} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Scale</label>
                <Slider defaultValue={[100]} min={50} max={200} step={5} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Rotation</label>
                <Slider defaultValue={[0]} min={-180} max={180} step={1} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent AI Generations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Generations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground mb-2">Your recent AI-generated content</div>
            {[
              { name: "Product intro script", type: "Script" },
              { name: "Background music", type: "Audio" },
              { name: "Title animation", type: "Effect" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded border">
                <div>
                  <div className="text-xs font-medium">{item.name}</div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {item.type}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  Use
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
