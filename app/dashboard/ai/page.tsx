"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Wand2, Brain, Heart, Zap, Clock, Play, Download, Eye, TrendingUp, Star, X, MessageCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import AIChatPanel from "@/components/ai-chat-panel"
import SceneEditorPanel from "@/components/scene-editor-panel"
import MediaPicker from "@/components/media-picker"

export default function AIFeaturesPage() {
  const [prompt, setPrompt] = useState("")
  const [videoLength, setVideoLength] = useState([60])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [selectedStyle, setSelectedStyle] = useState("modern")
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9")
  const [voices, setVoices] = useState<Array<{ id: string; name: string; gender: string; description: string }>>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("")
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([])
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null)
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<string | null>(null)

  // Load the narration voice catalog (static — works without an ElevenLabs key).
  useEffect(() => {
    fetch('/api/voices')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.voices) return
        setVoices(data.voices)
        setSelectedVoiceId((current) => current || data.defaultVoiceId || '')
      })
      .catch(() => {
        /* voice selection is optional; the server falls back to the default */
      })
  }, [])

  // Handle escape key to close video modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVideoFullscreen) {
        setIsVideoFullscreen(false)
      }
    }

    if (isVideoFullscreen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isVideoFullscreen])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a video description')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)
    setGeneratedVideo(null)

    try {
      // Kick off the job — returns immediately with a videoId to poll.
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_video',
          prompt,
          style: selectedStyle,
          duration: videoLength[0],
          addOns: selectedAddOns,
          aspectRatio: selectedAspectRatio,
          ...(selectedVoiceId ? { voiceId: selectedVoiceId } : {}),
          ...(selectedMediaIds.length ? { mediaAssetIds: selectedMediaIds } : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const videoId = data?.data?.videoId
      if (!data.success || !videoId) {
        throw new Error(data.error || 'Failed to start generation')
      }
      setCurrentVideoId(videoId)

      // Poll real server-side progress until a terminal state (15 min cap).
      const deadline = Date.now() + 15 * 60 * 1000
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000))

        const statusRes = await fetch(`/api/ai/jobs/${videoId}`)
        if (!statusRes.ok) continue
        const job = await statusRes.json()

        setGenerationProgress(job.percent ?? 0)

        if (job.status === 'COMPLETED' && job.videoUrl) {
          const url = job.videoUrl.includes('?')
            ? `${job.videoUrl}&t=${Date.now()}`
            : `${job.videoUrl}?t=${Date.now()}`
          setGeneratedVideo(url)
          setGenerationProgress(100)
          setIsGenerating(false)
          toast.success('🎉 Video generated! Check the preview below.')
          return
        }
        if (job.status === 'FAILED') {
          throw new Error(job.error || 'Generation failed')
        }
      }

      throw new Error('Generation timed out')
    } catch (error) {
      console.error('Error generating video:', error)
      setIsGenerating(false)
      setGenerationProgress(0)
      toast.error(`❌ ${error instanceof Error ? error.message : 'Failed to generate video'}`)
    }
  }

  const handleAddOnChange = (addOn: string, checked: boolean) => {
    if (checked) {
      setSelectedAddOns([...selectedAddOns, addOn])
    } else {
      setSelectedAddOns(selectedAddOns.filter((item) => item !== addOn))
    }
  }

  return (
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              AI Studio
            </h1>
            <p className="text-muted-foreground mt-2">
              Transform your ideas into professional videos with advanced AI technology
            </p>
          </div>

          <Tabs defaultValue="chat" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="create">AI Creator</TabsTrigger>
              <TabsTrigger value="emotion">Emotion AI</TabsTrigger>
              <TabsTrigger value="recommendations">Smart Suggestions</TabsTrigger>
              <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
            </TabsList>

            {/* AI Chat Tab */}
            <TabsContent value="chat">
              <AIChatPanel
                onGenerateVideo={(brief) => {
                  setPrompt(brief.description)
                  setSelectedStyle(brief.style)
                  setVideoLength([brief.duration])
                  setSelectedAddOns(brief.addOns)
                  toast.success('Brief loaded! Switching to AI Creator to generate...')
                  // Auto-trigger generation
                  setTimeout(() => handleGenerate(), 500)
                }}
              />
            </TabsContent>

            {/* AI Creator Tab */}
            <TabsContent value="create" className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Input Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-primary" />
                      AI Video Generator
                    </CardTitle>
                    <CardDescription>Describe your video idea and let AI create it for you</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Prompt Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Video Description</label>
                      <Textarea
                        placeholder="Create a product advertisement for eco-friendly running shoes. Show athletes in nature, emphasize sustainability, upbeat music, modern transitions..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    {/* Video Length */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        Video Length: {Math.floor(videoLength[0] / 60)}:
                        {(videoLength[0] % 60).toString().padStart(2, "0")}
                      </label>
                      <Slider
                        value={videoLength}
                        onValueChange={setVideoLength}
                        min={15}
                        max={300}
                        step={15}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>15s</span>
                        <span>5min</span>
                      </div>
                    </div>

                    {/* Style Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Video Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "modern", name: "Modern", desc: "Clean, minimal" },
                          { id: "cinematic", name: "Cinematic", desc: "Film-like quality" },
                          { id: "energetic", name: "Energetic", desc: "Fast-paced, dynamic" },
                          { id: "professional", name: "Professional", desc: "Corporate, polished" },
                        ].map((style) => (
                          <Button
                            key={style.id}
                            variant="outline"
                            className={`h-auto p-3 flex flex-col items-start transition-all ${
                              selectedStyle === style.id 
                                ? 'border-cyan-400 bg-cyan-400/10 text-white' 
                                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                            }`}
                            onClick={() => setSelectedStyle(style.id)}
                          >
                            <div className="font-medium">{style.name}</div>
                            <div className="text-xs text-muted-foreground">{style.desc}</div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Aspect Ratio</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "16:9" as const, name: "16:9", desc: "YouTube" },
                          { id: "9:16" as const, name: "9:16", desc: "TikTok / Reels" },
                          { id: "1:1" as const, name: "1:1", desc: "Feed post" },
                        ].map((ratio) => (
                          <Button
                            key={ratio.id}
                            variant="outline"
                            className={`h-auto p-3 flex flex-col items-start transition-all ${
                              selectedAspectRatio === ratio.id
                                ? 'border-cyan-400 bg-cyan-400/10 text-white'
                                : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700/50'
                            }`}
                            onClick={() => setSelectedAspectRatio(ratio.id)}
                          >
                            <div className="font-medium">{ratio.name}</div>
                            <div className="text-xs text-muted-foreground">{ratio.desc}</div>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Your own footage/photos — they fill scenes in order */}
                    <MediaPicker
                      value={selectedMediaIds}
                      onChange={setSelectedMediaIds}
                      disabled={isGenerating}
                    />

                    {/* Add-ons */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Add-ons</label>
                      <div className="space-y-2">
                        {[
                          { id: "subtitles", name: "Auto Subtitles", desc: "AI-generated captions" },
                          { id: "music", name: "Background Music", desc: "Mood-matched soundtrack" },
                          { id: "voiceover", name: "AI Voiceover", desc: "Natural speech synthesis" },
                          { id: "effects", name: "Smart Effects", desc: "Emotion-aware transitions" },
                        ].map((addon) => (
                          <div key={addon.id} className="flex items-center space-x-3">
                            <Checkbox
                              id={addon.id}
                              checked={selectedAddOns.includes(addon.id)}
                              onCheckedChange={(checked) => handleAddOnChange(addon.id, checked as boolean)}
                            />
                            <div className="flex-1">
                              <label htmlFor={addon.id} className="text-sm font-medium cursor-pointer">
                                {addon.name}
                              </label>
                              <p className="text-xs text-muted-foreground">{addon.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Narration voice — only relevant when the voiceover add-on is on */}
                    {selectedAddOns.includes("voiceover") && voices.length > 0 && (
                      <div className="space-y-3">
                        <label htmlFor="voice" className="text-sm font-medium">
                          Narration Voice
                        </label>
                        <select
                          id="voice"
                          value={selectedVoiceId}
                          onChange={(e) => setSelectedVoiceId(e.target.value)}
                          className="w-full rounded-md border border-gray-600 bg-gray-800/50 p-2 text-sm text-gray-200"
                        >
                          {voices.map((voice) => (
                            <option key={voice.id} value={voice.id}>
                              {voice.name} — {voice.gender}, {voice.description}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Generate Button */}
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleGenerate}
                      disabled={!prompt.trim() || isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating Video...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Video
                        </>
                      )}
                    </Button>

                    {/* Generation Progress */}
                    {isGenerating && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>AI is creating your video...</span>
                          <span>{generationProgress}%</span>
                        </div>
                        <Progress value={generationProgress} className="w-full" />
                        <p className="text-xs text-muted-foreground">
                          This may take 2-3 minutes depending on video length and complexity
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preview Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Generation Preview</CardTitle>
                    <CardDescription>Your generated video will appear here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden relative">
                      {generatedVideo ? (
                        <div className="relative w-full h-full">
                          <video 
                            key={generatedVideo} 
                            controls 
                            autoPlay
                            className="w-full h-full object-cover rounded-lg"
                            poster="https://via.placeholder.com/640x360/1f2937/ffffff?text=AI+Generated+Video"
                            preload="auto"
                            onClick={() => setIsVideoFullscreen(true)}
                          >
                            <source src={generatedVideo} type="video/mp4" />
                            Your browser does not support the video tag.
                          </video>
                          <Button
                            variant="outline"
                            size="sm"
                            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-white/20"
                            onClick={() => setIsVideoFullscreen(true)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Fullscreen
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Sparkles className="h-12 w-12 mx-auto mb-2" />
                          <p>Generated video preview</p>
                          <p className="text-sm">Start creating to see your AI-generated content</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 bg-transparent"
                        disabled={!generatedVideo}
                        onClick={() => setIsVideoFullscreen(true)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 bg-transparent"
                        disabled={!generatedVideo}
                        onClick={() => {
                          if (generatedVideo) {
                            const link = document.createElement('a');
                            link.href = generatedVideo;
                            link.download = `ai-generated-video-${Date.now()}.mp4`;
                            link.click();
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      {generatedScript && (
                        <Button
                          variant="outline"
                          className="flex-1 bg-transparent"
                          onClick={() => {
                            console.log('========================================')
                            console.log('🎬 YOUR CUSTOM GENERATED SCRIPT:')
                            console.log('========================================')
                            console.log(generatedScript)
                            console.log('========================================')
                            toast.success('✅ Script logged to console! Press F12 to view your custom script.')
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Script
                        </Button>
                      )}
                      {generatedVideo && (
                        <Button
                          variant="outline"
                          className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                          onClick={() => {
                            // Force reload the video
                            const newUrl = generatedVideo.split('?')[0] + `?t=${Date.now()}`;
                            setGeneratedVideo(newUrl);
                            toast.success('🔄 Video reloaded! If still showing old video, clear browser cache (Ctrl+Shift+R)');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Reload Video
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Scene-by-scene editing: tweak a line, swap footage, re-render */}
              {currentVideoId && generatedVideo && (
                <SceneEditorPanel
                  videoId={currentVideoId}
                  onRerendered={(url) => setGeneratedVideo(url)}
                />
              )}
            </TabsContent>

            {/* Emotion AI Tab */}
            <TabsContent value="emotion" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Emotion-Aware AI
                  </CardTitle>
                  <CardDescription>
                    AI analyzes your content sentiment and suggests perfect effects and transitions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Content Analysis</h4>
                      <div className="space-y-3">
                        {[
                          { emotion: "Joy", percentage: 85, color: "bg-yellow-500" },
                          { emotion: "Excitement", percentage: 72, color: "bg-orange-500" },
                          { emotion: "Trust", percentage: 68, color: "bg-blue-500" },
                          { emotion: "Anticipation", percentage: 45, color: "bg-purple-500" },
                        ].map((item) => (
                          <div key={item.emotion} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{item.emotion}</span>
                              <span>{item.percentage}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`${item.color} h-2 rounded-full transition-all`}
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">AI Suggestions</h4>
                      <div className="space-y-2">
                        {[
                          { suggestion: "Upbeat background music", confidence: "95%" },
                          { suggestion: "Fast-paced transitions", confidence: "88%" },
                          { suggestion: "Bright color palette", confidence: "82%" },
                          { suggestion: "Energetic text animations", confidence: "76%" },
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <span className="text-sm">{item.suggestion}</span>
                            <Badge variant="secondary">{item.confidence}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button>
                      <Zap className="h-4 w-4 mr-2" />
                      Apply All Suggestions
                    </Button>
                    <Button variant="outline" className="bg-transparent">
                      Customize
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Smart Suggestions Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Personalized Recommendations
                    </CardTitle>
                    <CardDescription>Based on your creation history and preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        title: "Modern Product Showcase",
                        category: "Template",
                        match: "92%",
                        reason: "Similar to your recent projects",
                      },
                      {
                        title: "Upbeat Corporate Music",
                        category: "Audio",
                        match: "88%",
                        reason: "Matches your style preferences",
                      },
                      {
                        title: "Slide Transitions Pack",
                        category: "Effects",
                        match: "85%",
                        reason: "Popular in your industry",
                      },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.reason}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="mb-1">
                            {item.match}
                          </Badge>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Trending Now
                    </CardTitle>
                    <CardDescription>Popular templates and effects this week</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { name: "Minimalist Product Demo", views: "12.5K", trend: "+25%" },
                      { name: "Neon Glow Effects", views: "8.2K", trend: "+18%" },
                      { name: "Hand-drawn Animations", views: "6.8K", trend: "+32%" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.views} views</div>
                        </div>
                        <Badge variant="secondary" className="text-green-600">
                          {item.trend}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Engagement Prediction</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">8.7/10</div>
                    <p className="text-xs text-muted-foreground">Predicted engagement score</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Optimal Length</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1:45</div>
                    <p className="text-xs text-muted-foreground">AI recommended duration</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Virality Score</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">7.2/10</div>
                    <p className="text-xs text-muted-foreground">Shareability potential</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>AI Performance Insights</CardTitle>
                  <CardDescription>How your videos perform compared to AI predictions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { metric: "View Duration", predicted: "85%", actual: "82%", status: "good" },
                      { metric: "Click-through Rate", predicted: "3.2%", actual: "3.8%", status: "excellent" },
                      { metric: "Share Rate", predicted: "1.5%", actual: "1.2%", status: "fair" },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{item.metric}</div>
                          <div className="text-xs text-muted-foreground">
                            Predicted: {item.predicted} • Actual: {item.actual}
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.status === "excellent" ? "default" : item.status === "good" ? "secondary" : "outline"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Fullscreen Video Modal */}
          {isVideoFullscreen && generatedVideo && (
            <div 
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8"
              onClick={() => setIsVideoFullscreen(false)}
            >
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 z-20 bg-black/70 hover:bg-black/90 text-white border-white/30 rounded-full w-10 h-10 p-0"
                onClick={() => setIsVideoFullscreen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
              <video 
                controls 
                autoPlay
                className="w-full h-auto max-w-6xl rounded-lg shadow-2xl"
                poster="https://via.placeholder.com/640x360/1f2937/ffffff?text=AI+Generated+Video"
                onClick={(e) => e.stopPropagation()}
              >
                <source src={generatedVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </div>
  )
}
