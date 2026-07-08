"use client";

import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Sparkles,
  CheckCircle,
  Star,
  Clock,
  Image,
  Zap,
  Globe,
  Users,
  Shield,
  Heart,
  Download,
  Share2,
  Eye,
  Search,
  Filter,
  Grid3X3,
  MoreHorizontal
} from "lucide-react"

export default function LandingPage() {
  const t = useTranslations();

  // Sample video gallery data (mimicking Midjourney's style)
  const featuredVideos = [
    {
      id: 1,
      title: "Cyberpunk City Night",
      thumbnail: "/api/placeholder/400/300",
      duration: "0:45",
      likes: 1240,
      views: "12.5K",
      author: "AI Creator",
      prompt: "Futuristic cyberpunk cityscape with neon lights and flying cars..."
    },
    {
      id: 2,
      title: "Ocean Wave Cinematic",
      thumbnail: "/api/placeholder/400/300",
      duration: "1:20",
      likes: 856,
      views: "8.2K",
      author: "Video Artist",
      prompt: "Dramatic ocean waves crashing against rocky cliffs at sunset..."
    },
    {
      id: 3,
      title: "Abstract Geometric Flow",
      thumbnail: "/api/placeholder/400/300",
      duration: "0:30",
      likes: 2150,
      views: "25.1K",
      author: "Motion Designer",
      prompt: "Flowing geometric shapes with gradient colors and smooth transitions..."
    },
    {
      id: 4,
      title: "Forest Magic Hour",
      thumbnail: "/api/placeholder/400/300",
      duration: "2:15",
      likes: 934,
      views: "15.7K",
      author: "Nature Creator",
      prompt: "Mystical forest scene with golden hour lighting and floating particles..."
    },
    {
      id: 5,
      title: "Product Showcase",
      thumbnail: "/api/placeholder/400/300",
      duration: "0:35",
      likes: 567,
      views: "6.8K",
      author: "Brand Studio",
      prompt: "Elegant product reveal with dynamic camera movements and lighting..."
    },
    {
      id: 6,
      title: "Space Nebula Journey",
      thumbnail: "/api/placeholder/400/300",
      duration: "1:45",
      likes: 1876,
      views: "32.4K",
      author: "Cosmic Artist",
      prompt: "Journey through colorful space nebula with stars and cosmic dust..."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Modern Dark Header - Midjourney Style */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-heading text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                ForgeVid
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-6">
              <a href="#explore" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Explore
              </a>
              <a href="#create" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Create
              </a>
              <a href="#community" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Community
              </a>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-gray-900 rounded-full px-4 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search videos..."
                className="bg-transparent text-sm text-white placeholder-gray-400 border-none outline-none w-48"
              />
            </div>
            <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
              Sign In
            </Button>
            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
              Create Video
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section with Gallery Focus */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        
        <div className="container relative py-16 px-6">
          {/* Hero Content */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-gray-900/50 rounded-full px-4 py-2 mb-6 border border-gray-800">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-gray-300">AI-Powered Video Creation</span>
            </div>

            <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Create Stunning
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Videos
              </span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
              Transform your ideas into cinematic videos with AI. From concept to creation in minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-8 py-3 text-lg">
                <Play className="mr-2 h-5 w-5" />
                Start Creating
              </Button>
              <Button variant="outline" size="lg" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 bg-transparent px-8 py-3 text-lg">
                <Eye className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400 mb-16">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>50K+ Videos Created</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>4.9★ Rating</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>2min Setup</span>
              </div>
            </div>
          </div>

          {/* Gallery Controls */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Featured Creations</h2>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                Trending
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Video Gallery Grid - Midjourney Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {featuredVideos.map((video) => (
              <Card key={video.id} className="group bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all duration-300 overflow-hidden">
                <div className="relative aspect-video bg-gray-800 overflow-hidden">
                  {/* Video Thumbnail */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Play className="h-12 w-12 text-white/80 group-hover:text-white transition-colors" />
                  </div>
                  
                  {/* Video Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-black/50 text-white border-0">
                        {video.duration}
                      </Badge>
                    </div>
                    
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors line-clamp-1">
                      {video.title}
                    </h3>
                  </div>
                  
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">
                    {video.prompt}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        <span>{video.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{video.views}</span>
                      </div>
                    </div>
                    <span className="text-purple-400">{video.author}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center">
            <Button variant="outline" size="lg" className="border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 bg-transparent">
              Load More Videos
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-24 px-6">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4 text-white">Powerful AI Features</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Create professional videos with cutting-edge AI technology
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <CardHeader>
              <Sparkles className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">AI Video Generator</CardTitle>
              <CardDescription className="text-gray-400">
                Generate stunning videos from text prompts using advanced AI models
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <CardHeader>
              <Image className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Smart Editing</CardTitle>
              <CardDescription className="text-gray-400">
                Intelligent video editing with automated cuts, transitions, and effects
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <CardHeader>
              <Globe className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Global Assets</CardTitle>
              <CardDescription className="text-gray-400">
                Access millions of stock videos, images, and audio tracks
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <CardHeader>
              <Users className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Real-time Collaboration</CardTitle>
              <CardDescription className="text-gray-400">
                Work together with your team in real-time on video projects
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <CardHeader>
              <Zap className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Lightning Fast</CardTitle>
              <CardDescription className="text-gray-400">
                Render videos up to 10x faster with our optimized AI pipeline
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-all">
            <CardHeader>
              <Shield className="h-8 w-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Enterprise Security</CardTitle>
              <CardDescription className="text-gray-400">
                Bank-level security with advanced encryption and privacy controls
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 px-6">
        <div className="text-center">
          <h2 className="font-heading text-4xl font-bold mb-6 text-white">
            Ready to Create Your First AI Video?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of creators who are already using ForgeVid to bring their ideas to life
          </p>
          <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-8 py-3 text-lg">
            <Play className="mr-2 h-5 w-5" />
            Start Creating for Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container px-6">
          <div className="text-center text-gray-400">
            <p>© 2024 ForgeVid. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}