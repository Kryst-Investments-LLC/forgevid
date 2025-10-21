"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Code,
  Key,
  Play,
  Copy,
  CheckCircle,
  AlertCircle,
  Zap,
  Globe,
  Shield,
  Clock,
  DollarSign,
  Book,
  Terminal,
} from "lucide-react"

export default function APIDocsPage() {
  const [apiKey, setApiKey] = useState("vf_test_1234567890abcdef")
  const [selectedEndpoint, setSelectedEndpoint] = useState("generate-video")
  const [requestBody, setRequestBody] = useState(`{
  "prompt": "A modern product showcase video",
  "duration": 30,
  "style": "professional",
  "format": "mp4",
  "quality": "1080p"
}`)

  const endpoints = [
    {
      id: "generate-video",
      method: "POST",
      path: "/api/v1/videos/generate",
      title: "Generate Video",
      description: "Create a new video using AI from a text prompt",
      category: "Video Generation",
    },
    {
      id: "get-video",
      method: "GET",
      path: "/api/v1/videos/{id}",
      title: "Get Video",
      description: "Retrieve video details and status",
      category: "Video Management",
    },
    {
      id: "list-videos",
      method: "GET",
      path: "/api/v1/videos",
      title: "List Videos",
      description: "Get a list of all your videos",
      category: "Video Management",
    },
    {
      id: "delete-video",
      method: "DELETE",
      path: "/api/v1/videos/{id}",
      title: "Delete Video",
      description: "Delete a video from your account",
      category: "Video Management",
    },
    {
      id: "list-templates",
      method: "GET",
      path: "/api/v1/templates",
      title: "List Templates",
      description: "Get available video templates",
      category: "Templates",
    },
    {
      id: "get-usage",
      method: "GET",
      path: "/api/v1/usage",
      title: "Get Usage",
      description: "Check your current usage and limits",
      category: "Account",
    },
  ]

  const codeExamples = {
    curl: `curl -X POST "https://api.vidforge.ai/v1/videos/generate" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBody}'`,
    javascript: `const response = await fetch('https://api.vidforge.ai/v1/videos/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(${requestBody})
});

const video = await response.json();
console.log(video);`,
    python: `import requests

url = "https://api.vidforge.ai/v1/videos/generate"
headers = {
    "Authorization": f"Bearer ${apiKey}",
    "Content-Type": "application/json"
}
data = ${requestBody}

response = requests.post(url, headers=headers, json=data)
video = response.json()
print(video)`,
    node: `const VidForge = require('@vidforge/api');

const client = new VidForge('${apiKey}');

const video = await client.videos.generate(${requestBody});
console.log(video);`,
  }

  const [selectedLanguage, setSelectedLanguage] = useState("curl")
  const [copied, setCopied] = useState(false)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Integrate VidForge AI into your applications with our powerful REST API
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button>
              <Key className="w-4 h-4 mr-2" />
              Get API Key
            </Button>
            <Button variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Try API
            </Button>
            <Button variant="outline">
              <Book className="w-4 h-4 mr-2" />
              SDKs
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">API Reference</TabsTrigger>
            <TabsTrigger value="playground">API Playground</TabsTrigger>
            <TabsTrigger value="sdks">SDKs & Libraries</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-6 h-6 mr-2 text-primary" />
                  Quick Start
                </CardTitle>
                <CardDescription>Get started with the VidForge AI API in minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Key className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">1. Get API Key</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign up and generate your API key from the dashboard
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Code className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">2. Make Request</h3>
                    <p className="text-sm text-muted-foreground">Send your first API request to generate a video</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">3. Get Video</h3>
                    <p className="text-sm text-muted-foreground">Receive your generated video URL and metadata</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Features */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">AI Video Generation</h3>
                  <p className="text-sm text-muted-foreground">Generate videos from text prompts using advanced AI</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Globe className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">RESTful API</h3>
                  <p className="text-sm text-muted-foreground">Simple HTTP requests with JSON responses</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Secure & Reliable</h3>
                  <p className="text-sm text-muted-foreground">Enterprise-grade security with 99.9% uptime</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Real-time Status</h3>
                  <p className="text-sm text-muted-foreground">Track video generation progress with webhooks</p>
                </CardContent>
              </Card>
            </div>

            {/* Rate Limits & Pricing */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Rate Limits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Free Plan</span>
                      <Badge variant="outline">10 requests/hour</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Starter Plan</span>
                      <Badge variant="outline">100 requests/hour</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Pro Plan</span>
                      <Badge variant="outline">1,000 requests/hour</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Enterprise</span>
                      <Badge>Custom limits</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    API Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Video Generation</span>
                      <span className="font-medium">$0.10/minute</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Template Usage</span>
                      <span className="font-medium">$0.05/video</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Storage</span>
                      <span className="font-medium">$0.02/GB/month</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bandwidth</span>
                      <span className="font-medium">$0.01/GB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Authentication</CardTitle>
                <CardDescription>Secure your API requests with authentication tokens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Getting Your API Key</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Sign in to your VidForge AI dashboard</li>
                    <li>Navigate to Settings → API Keys</li>
                    <li>Click "Generate New API Key"</li>
                    <li>Copy and securely store your API key</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Authentication Header</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <code className="text-sm">Authorization: Bearer YOUR_API_KEY</code>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Example Request</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      <code>{`curl -H "Authorization: Bearer vf_live_1234567890abcdef" \\
     -H "Content-Type: application/json" \\
     https://api.vidforge.ai/v1/videos`}</code>
                    </pre>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-800">Security Best Practices</h4>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                        <li>• Never expose API keys in client-side code</li>
                        <li>• Use environment variables to store keys</li>
                        <li>• Rotate keys regularly</li>
                        <li>• Use different keys for development and production</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Endpoint List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>API Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedEndpoint === endpoint.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedEndpoint(endpoint.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              endpoint.method === "GET"
                                ? "default"
                                : endpoint.method === "POST"
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {endpoint.method}
                          </Badge>
                          <span className="font-medium text-sm">{endpoint.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{endpoint.path}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Endpoint Details */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge
                      variant={
                        endpoints.find((e) => e.id === selectedEndpoint)?.method === "GET"
                          ? "default"
                          : endpoints.find((e) => e.id === selectedEndpoint)?.method === "POST"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {endpoints.find((e) => e.id === selectedEndpoint)?.method}
                    </Badge>
                    {endpoints.find((e) => e.id === selectedEndpoint)?.title}
                  </CardTitle>
                  <CardDescription>{endpoints.find((e) => e.id === selectedEndpoint)?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Endpoint</h4>
                      <div className="bg-muted p-3 rounded-lg">
                        <code className="text-sm">
                          {endpoints.find((e) => e.id === selectedEndpoint)?.method} https://api.vidforge.ai
                          {endpoints.find((e) => e.id === selectedEndpoint)?.path}
                        </code>
                      </div>
                    </div>

                    {selectedEndpoint === "generate-video" && (
                      <>
                        <div>
                          <h4 className="font-semibold mb-2">Request Body</h4>
                          <div className="bg-muted p-3 rounded-lg">
                            <pre className="text-sm overflow-x-auto">
                              <code>{`{
  "prompt": "string (required)",
  "duration": "number (optional, default: 30)",
  "style": "string (optional)",
  "format": "string (optional, default: 'mp4')",
  "quality": "string (optional, default: '1080p')",
  "template_id": "string (optional)",
  "webhook_url": "string (optional)"
}`}</code>
                            </pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Response</h4>
                          <div className="bg-muted p-3 rounded-lg">
                            <pre className="text-sm overflow-x-auto">
                              <code>{`{
  "id": "vid_1234567890",
  "status": "processing",
  "prompt": "A modern product showcase video",
  "duration": 30,
  "created_at": "2024-01-15T10:30:00Z",
  "estimated_completion": "2024-01-15T10:32:00Z",
  "webhook_url": null
}`}</code>
                            </pre>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <h4 className="font-semibold mb-2">Status Codes</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-800">200</Badge>
                          <span className="text-sm">Success</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-800">201</Badge>
                          <span className="text-sm">Created</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">400</Badge>
                          <span className="text-sm">Bad Request</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">401</Badge>
                          <span className="text-sm">Unauthorized</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-100 text-red-800">429</Badge>
                          <span className="text-sm">Rate Limited</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="playground" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Playground</CardTitle>
                <CardDescription>Test API endpoints directly from your browser</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Request Configuration */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">API Key</label>
                      <Input
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                        type="password"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Endpoint</label>
                      <select
                        value={selectedEndpoint}
                        onChange={(e) => setSelectedEndpoint(e.target.value)}
                        className="w-full p-2 border rounded-md"
                      >
                        {endpoints.map((endpoint) => (
                          <option key={endpoint.id} value={endpoint.id}>
                            {endpoint.method} {endpoint.path}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Request Body</label>
                      <Textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </div>

                    <Button className="w-full">
                      <Play className="w-4 h-4 mr-2" />
                      Send Request
                    </Button>
                  </div>

                  {/* Code Examples */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Code Examples</label>
                      <div className="flex gap-2 mb-3">
                        {Object.keys(codeExamples).map((lang) => (
                          <Button
                            key={lang}
                            variant={selectedLanguage === lang ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedLanguage(lang)}
                          >
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{codeExamples[selectedLanguage as keyof typeof codeExamples]}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 right-2 bg-transparent"
                        onClick={() => handleCopy(codeExamples[selectedLanguage as keyof typeof codeExamples])}
                      >
                        {copied ? <CheckCircle className="w-3 w-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Response</label>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm text-muted-foreground">
                          <code>Click "Send Request" to see the response</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sdks" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    JavaScript/Node.js
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm">npm install @vidforge/api</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Official JavaScript SDK with TypeScript support</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Documentation
                      </Button>
                      <Button size="sm" variant="outline">
                        GitHub
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    Python
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm">pip install vidforge-python</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Python SDK with async support and type hints</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Documentation
                      </Button>
                      <Button size="sm" variant="outline">
                        PyPI
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    PHP
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm">composer require vidforge/php-sdk</code>
                    </div>
                    <p className="text-sm text-muted-foreground">PHP SDK compatible with Laravel and Symfony</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Documentation
                      </Button>
                      <Button size="sm" variant="outline">
                        Packagist
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    Ruby
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm">gem install vidforge</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Ruby gem with Rails integration</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Documentation
                      </Button>
                      <Button size="sm" variant="outline">
                        RubyGems
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    Go
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="bg-muted p-3 rounded-lg">
                      <code className="text-sm">go get github.com/vidforge/go-sdk</code>
                    </div>
                    <p className="text-sm text-muted-foreground">Go SDK with context support and error handling</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Documentation
                      </Button>
                      <Button size="sm" variant="outline">
                        GitHub
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Terminal className="w-5 h-5 mr-2" />
                    Community SDKs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Community-maintained SDKs for other languages</p>
                    <div className="space-y-2">
                      <div className="text-sm">• C# (.NET)</div>
                      <div className="text-sm">• Java</div>
                      <div className="text-sm">• Rust</div>
                      <div className="text-sm">• Swift</div>
                    </div>
                    <Button size="sm" variant="outline">
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Webhooks */}
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>Receive real-time notifications about video processing events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Webhook Events</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">video.processing</Badge>
                        <span className="text-sm">Video generation started</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">video.completed</Badge>
                        <span className="text-sm">Video generation finished</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">video.failed</Badge>
                        <span className="text-sm">Video generation failed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">usage.limit_reached</Badge>
                        <span className="text-sm">Usage limit reached</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Example Payload</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <pre className="text-sm overflow-x-auto">
                        <code>{`{
  "event": "video.completed",
  "data": {
    "id": "vid_1234567890",
    "status": "completed",
    "url": "https://cdn.vidforge.ai/...",
    "duration": 30,
    "created_at": "2024-01-15T10:30:00Z"
  }
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
