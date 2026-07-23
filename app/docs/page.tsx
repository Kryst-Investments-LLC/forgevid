"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Book, Code, Video, Zap, Users, Shield, BarChart3, ArrowRight, ExternalLink } from "lucide-react"

export default function DocsPage() {
  const docSections = [
    {
      title: "Getting Started",
      description: "Quick start guides and basic concepts",
      icon: Book,
      color: "bg-blue-100 text-blue-600",
      articles: [
        { title: "Welcome to ForgeVid", time: "5 min read", new: true },
        { title: "Creating Your First Video", time: "10 min read" },
        { title: "Understanding Credits", time: "3 min read" },
        { title: "Account Setup & Verification", time: "5 min read" },
      ],
    },
    {
      title: "Video Creation",
      description: "Master the art of AI-powered video creation",
      icon: Video,
      color: "bg-purple-100 text-purple-600",
      articles: [
        { title: "AI Video Generation Guide", time: "15 min read", popular: true },
        { title: "Using Templates Effectively", time: "8 min read" },
        { title: "Advanced Editing Features", time: "12 min read" },
        { title: "Export Settings & Quality", time: "6 min read" },
      ],
    },
    {
      title: "AI Features",
      description: "Leverage advanced AI capabilities",
      icon: Zap,
      color: "bg-yellow-100 text-yellow-600",
      articles: [
        { title: "Text-to-Video Generation", time: "10 min read", popular: true },
        { title: "Voice Synthesis & Audio", time: "8 min read" },
        { title: "Style Transfer & Effects", time: "12 min read" },
        { title: "Custom AI Models", time: "20 min read" },
      ],
    },
    {
      title: "Collaboration",
      description: "Work together with your team",
      icon: Users,
      color: "bg-green-100 text-green-600",
      articles: [
        { title: "Team Management", time: "7 min read" },
        { title: "Real-time Collaboration", time: "10 min read" },
        { title: "Sharing & Permissions", time: "5 min read" },
        { title: "Project Organization", time: "8 min read" },
      ],
    },
    {
      title: "API Reference",
      description: "Integrate ForgeVid into your applications",
      icon: Code,
      color: "bg-red-100 text-red-600",
      articles: [
        { title: "Authentication", time: "5 min read" },
        { title: "Video Generation API", time: "15 min read" },
        { title: "Webhooks & Events", time: "10 min read" },
        { title: "Rate Limits & Quotas", time: "5 min read" },
      ],
    },
    {
      title: "Enterprise",
      description: "Advanced features for large organizations",
      icon: Shield,
      color: "bg-indigo-100 text-indigo-600",
      articles: [
        { title: "SSO Configuration", time: "15 min read" },
        { title: "Security & Compliance", time: "12 min read" },
        { title: "Custom Deployment", time: "25 min read" },
        { title: "SLA & Support", time: "8 min read" },
      ],
    },
  ]

  const quickStart = [
    { step: 1, title: "Sign Up", description: "Create your ForgeVid account" },
    { step: 2, title: "Choose Plan", description: "Select the plan that fits your needs" },
    { step: 3, title: "Create Video", description: "Use AI to generate your first video" },
    { step: 4, title: "Export & Share", description: "Download or share your creation" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Documentation</h1>
          <p className="text-xl text-gray-600 mb-8">Everything you need to know about ForgeVid</p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Book className="w-4 h-4 mr-2" />
              Getting Started
            </Button>
            <Button variant="outline">
              <Code className="w-4 h-4 mr-2" />
              API Reference
            </Button>
            <Button variant="outline">
              <Video className="w-4 h-4 mr-2" />
              Video Tutorials
            </Button>
          </div>
        </div>

        {/* Quick Start */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-6 h-6 mr-2 text-blue-600" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>Get up and running in minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {quickStart.map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                  {index < quickStart.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-400 mx-auto mt-4 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentation Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {docSections.map((section, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className={`p-2 rounded-lg ${section.color} mr-3`}>
                    <section.icon className="w-5 h-5" />
                  </div>
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.articles.map((article, articleIndex) => (
                    <div
                      key={articleIndex}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {article.title}
                          </h4>
                          {'new' in article && article.new && <Badge className="bg-green-100 text-green-800 text-xs">New</Badge>}
                          {'popular' in article && article.popular && <Badge className="bg-blue-100 text-blue-800 text-xs">Popular</Badge>}
                        </div>
                        <p className="text-sm text-gray-500">{article.time}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  View All {section.title} Docs
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Resources */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Video className="w-5 h-5 mr-2 text-purple-600" />
                Video Tutorials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Learn through step-by-step video guides</p>
              <Button variant="outline" className="w-full bg-transparent">
                Watch Tutorials
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                API Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Monitor API performance and uptime</p>
              <Button variant="outline" className="w-full bg-transparent">
                View Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Connect with other ForgeVid users</p>
              <Button variant="outline" className="w-full bg-transparent">
                Join Community
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
