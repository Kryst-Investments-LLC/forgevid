"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Play, Heart, Download, Star, TrendingUp, Zap, Crown } from "lucide-react"
import { VideoPlayerModal } from "@/components/video-player-modal"
import { useState, useEffect } from "react"
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
    { id: "all", name: "All Templates", count: 0 },
    { id: "BUSINESS", name: "Business", count: 0 },
    { id: "SOCIAL", name: "Social Media", count: 0 },
    { id: "EDUCATIONAL", name: "Education", count: 0 },
    { id: "MARKETING", name: "Marketing", count: 0 },
    { id: "ENTERTAINMENT", name: "Entertainment", count: 0 },
    { id: "PRESENTATION", name: "Presentations", count: 0 },
  ];

  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/templates?limit=100');
        const data = await res.json();
        setTemplates(data.templates || []);
        setFilteredTemplates(data.templates || []);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = templates;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTemplates(filtered);
  }, [selectedCategory, searchQuery, templates]);

  const handlePreviewTemplate = (template: any) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }

  const handleClosePreview = () => {
    setIsPreviewOpen(false)
    setSelectedTemplate(null)
  }

  const handleUseTemplate = async (template: any) => {
    try {
      // Load template into editor
      const res = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
      
      if (res.ok) {
        window.location.href = '/dashboard/editor';
      } else {
        alert('Failed to load template');
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      alert('Failed to load template');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-[600px]">
      {/* Hero Section */}
      <div style={heroStyle} className="w-full text-center">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">Explore Video Templates</h1>
        <p className="text-lg font-medium opacity-90 mb-2">Choose a template to start creating stunning videos in seconds.</p>
      </div>
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {/* Category Tabs */}
        <div className="mt-12 mb-8">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-7 w-full">
              {templateCategories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id}>
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-500">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="transition-transform duration-300 hover:scale-105 hover:shadow-2xl bg-white/90 border-0 rounded-2xl overflow-hidden"
                style={{ boxShadow: "0 2px 16px rgba(79,70,229,0.08)" }}
              >
                <CardHeader className="pb-0">
                  <CardTitle className="text-2xl font-bold text-indigo-700 mb-1">{template.name}</CardTitle>
                  <CardDescription className="text-sm text-gray-500">{formatDuration(template.duration)} • {template.category}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <img
                    src={template.thumbnail || 'https://via.placeholder.com/400x225?text=Template'}
                    alt={template.name}
                    width={320}
                    height={160}
                    className="w-full h-40 object-cover rounded-xl border border-gray-200 mb-4 shadow-sm aspect-[2/1]"
                  />
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handlePreviewTemplate(template)}
                        variant="outline"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        onClick={() => {
                          // Template -> generation bridge: prefill the AI Studio.
                          const q = new URLSearchParams({
                            prompt: `${template.name}: ${template.description ?? ''}`.trim(),
                            style: template.category === 'business' ? 'professional' : 'modern',
                          })
                          window.location.href = `/dashboard/ai?${q.toString()}`
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Generate with AI
                      </Button>
                      <Button
                        onClick={() => handleUseTemplate(template)}
                        className="bg-gradient-to-r from-indigo-500 to-cyan-400 text-white font-semibold px-4 py-2 rounded-lg shadow hover:from-indigo-600 hover:to-cyan-500"
                        size="sm"
                      >
                        Use Template
                      </Button>
                    </div>
                    <Badge variant="secondary" className="ml-2">{template.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Video Player Modal for Template Preview */}
      {selectedTemplate && (
        <VideoPlayerModal
          video={{
            id: String(selectedTemplate.id),
            title: selectedTemplate.name || selectedTemplate.title,
            duration: selectedTemplate.duration || 0,
            thumbnail: selectedTemplate.thumbnail,
          }}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}

