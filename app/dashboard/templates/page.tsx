"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Play, Heart, Download, Star, TrendingUp, Zap, Crown } from "lucide-react"
import { VideoPlayerModal } from "@/components/video-player-modal"
import { useState } from "react"
import { useSubscription } from "@/hooks/use-subscription-simple"

export default function TemplatesPage() {
  // Hero section styles
  const heroStyle = {
    background: "linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)",
    color: "white",
    padding: "48px 0 32px 0",
    borderRadius: "0 0 2rem 2rem",
    boxShadow: "0 4px 24px rgba(79,70,229,0.12)",
    marginBottom: "-2rem"
  };
  const templateCategories = [
    { id: "all", name: "All Templates", count: 150 },
    { id: "business", name: "Business", count: 45 },
    { id: "social", name: "Social Media", count: 38 },
    { id: "education", name: "Education", count: 22 },
    { id: "marketing", name: "Marketing", count: 28 },
    { id: "entertainment", name: "Entertainment", count: 17 },
  ];


  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewTemplate = (template: any) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
    setSelectedTemplate(null)
  }

  // Example template data (replace with real data fetch)
  const templates = [
    {
      id: 1,
      title: "Business Promo",
      duration: "60s",
      thumbnail: "/thumbnails/business-promo.jpg",
      likes: 120,
      isPro: false,
    },
    {
      id: 2,
      title: "Social Story",
      duration: "30s",
      thumbnail: "/thumbnails/social-story.jpg",
      likes: 80,
      isPro: true,
    },
    // ...more templates
  ];

  return (
    <div className="min-h-[600px]">
      {/* Hero Section */}
      <div style={heroStyle} className="w-full text-center">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">Explore Video Templates</h1>
        <p className="text-lg font-medium opacity-90 mb-2">Choose a template to start creating stunning videos in seconds.</p>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mt-16">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="transition-transform duration-300 hover:scale-105 hover:shadow-2xl bg-white/90 border-0 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 2px 16px rgba(79,70,229,0.08)" }}
              >
                <CardHeader className="pb-0">
                  <CardTitle className="text-2xl font-bold text-indigo-700 mb-1">{template.title}</CardTitle>
                  <CardDescription className="text-sm text-gray-500">{template.duration}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <img
                    src={template.thumbnail}
                    alt={template.title}
                    width={320}
                    height={160}
                    className="w-full h-40 object-cover rounded-xl border border-gray-200 mb-4 shadow-sm aspect-[2/1]"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <Button
                      onClick={() => handlePreviewTemplate(template)}
                      className="bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold px-6 py-2 rounded-lg shadow hover:from-indigo-600 hover:to-cyan-500"
                    >
                      Preview
                    </Button>
                    {template.isPro && (
                      <Badge variant="destructive" className="ml-2 bg-gradient-to-r from-pink-500 to-red-400 text-white shadow">Pro</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
      {/* Video Player Modal for Template Preview */}
      {selectedTemplate && (
        <VideoPlayerModal
          video={{
            id: String(selectedTemplate.id),
            title: selectedTemplate.title,
            duration: selectedTemplate.duration,
            thumbnail: selectedTemplate.thumbnail,
            views: selectedTemplate.likes || 0,
            size: "",
            format: "MP4"
          }}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}

