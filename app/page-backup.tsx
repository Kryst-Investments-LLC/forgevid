"use client";
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Play,
  Sparkles,
  Users,
  Zap,
  Globe,
  Shield,
  Star,
  CheckCircle,
  ArrowRight,
  Clock,
  TrendingUp,
} from "lucide-react"
import { PricingCard } from "@/components/pricing-card"
import Link from "next/link"
import ClientDarkModeToggle from "@/components/ClientDarkModeToggle";

function LanguageSwitcher() {
  return (
    <div style={{ position: 'fixed', top: 60, right: 16, zIndex: 1000 }}>
      <button style={{ marginRight: 8 }}>EN</button>
      <button>ES</button>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <ClientDarkModeToggle />
      <LanguageSwitcher />
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold">ForgeVid</span>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </a>
            <a href="#templates" className="text-sm font-medium hover:text-primary transition-colors">
              Templates
            </a>
            <Button variant="outline" size="sm">
              Sign In
            </Button>
            <Button size="sm">Start Creating</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            AI-Powered Video Creation
          </Badge>

          <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl text-balance">
            Transform Ideas into
            <span className="text-primary"> Professional Videos</span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Create stunning videos in minutes with our AI-powered platform. From script generation to final export, ForgeVid handles the complexity so you can focus on your creativity.
          </p>

          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>50,000+ videos created</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Setup in 2 minutes</span>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base relative">
              <Play className="mr-2 h-4 w-4" />
              Start Creating Free
              <Badge variant="secondary" className="ml-2 text-xs">
                No Credit Card
              </Badge>
            </Button>
            <Button variant="outline" size="lg" className="text-base bg-transparent">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>

          {/* Demo Video Placeholder */}
          <div className="mt-16 relative">
            <div className="aspect-video rounded-xl border bg-muted/50 flex items-center justify-center">
              <div className="text-center">
                <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Demo Video Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-12 border-b">
        <div className="text-center mb-8">
          <p className="text-sm text-muted-foreground mb-6">Trusted by leading companies worldwide</p>
          <div className="flex items-center justify-center gap-8 opacity-60">
            <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs font-medium">
              TechCorp
            </div>
            <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs font-medium">
              StartupXYZ
            </div>
            <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs font-medium">
              MediaCo
            </div>
            <div className="h-8 w-24 bg-muted rounded flex items-center justify-center text-xs font-medium">
              CreativeInc
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <span>SOC 2 Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span>GDPR Compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span>99.9% Uptime</span>
          </div>
        </div>
      </section>

      <section className="container py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">See ForgeVid in Action</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real examples created by our users in minutes, not hours
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
              <Play className="h-12 w-12 text-purple-600" />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Product Launch Video</h3>
              <p className="text-sm text-muted-foreground mb-3">Created in 3 minutes from a simple text prompt</p>
              <Badge variant="secondary" className="text-xs">
                Marketing
              </Badge>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
              <Play className="h-12 w-12 text-blue-600" />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Social Media Ad</h3>
              <p className="text-sm text-muted-foreground mb-3">AI-optimized for maximum engagement</p>
              <Badge variant="secondary" className="text-xs">
                Social Media
              </Badge>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
              <Play className="h-12 w-12 text-green-600" />
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Training Tutorial</h3>
              <p className="text-sm text-muted-foreground mb-3">Professional quality with auto-generated subtitles</p>
              <Badge variant="secondary" className="text-xs">
                Education
              </Badge>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            View More Examples
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">Everything You Need to Create</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful AI tools and professional features in one integrated platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <Sparkles className="h-8 w-8 text-primary mb-2" />
              <CardTitle>AI Video Generator</CardTitle>
              <CardDescription>
                Transform text prompts into professional videos with advanced AI technology
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Globe className="h-8 w-8 text-primary mb-2" />
              <CardTitle>8M+ Stock Assets</CardTitle>
              <CardDescription>Access millions of high-quality images, videos, and audio tracks</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Real-time Collaboration</CardTitle>
              <CardDescription>
                Work together with your team in real-time with live editing and comments
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Emotion-Aware AI</CardTitle>
              <CardDescription>
                AI analyzes your content sentiment and suggests perfect effects and transitions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-primary mb-2" />
              <CardTitle>VR Preview Mode</CardTitle>
              <CardDescription>Preview your videos in immersive VR for next-level content creation</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Multi-Language Support</CardTitle>
              <CardDescription>Create content in 50+ languages with AI voiceovers and subtitles</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include our core AI features.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8">
            <span className="text-sm">Monthly</span>
            <div className="relative">
              <input type="checkbox" id="annual-toggle" className="sr-only" />
              <label htmlFor="annual-toggle" className="flex items-center cursor-pointer">
                <div className="w-12 h-6 bg-gray-300 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform duration-200"></div>
                </div>
              </label>
            </div>
            <span className="text-sm">Annual</span>
            <Badge variant="secondary" className="text-xs">
              Save 20%
            </Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* Free Plan */}
          <PricingCard
            title="Free"
            price="$0"
            description="Perfect for getting started"
            features={[
              "12 video minutes/week",
              "2 AI credits/week",
              "5 exports/week (with watermark)",
              "Basic templates",
              "Community support",
            ]}
            buttonText="Get Started"
            buttonVariant="outline"
          />

          <PricingCard
            title="Plus"
            price="$25/mo"
            description="Best for content creators"
            features={[
              "60 video minutes/month",
              "40 seconds generative video/month",
              "3 users, 120GB storage",
              "Unlimited exports",
              "Stock media access",
              "Email support",
            ]}
            planId="plus"
            buttonText="Start Free Trial"
          />

          <PricingCard
            title="Max"
            price="$45/mo"
            description="Best for professionals"
            features={[
              "220 video minutes/month",
              "130 seconds generative video/month",
              "3 users, 420GB storage",
              "Unlimited exports",
              "Full AI suite + collaboration",
              "Priority support",
            ]}
            planId="max"
            popular={true}
            buttonText="Start Free Trial"
          />

          <PricingCard
            title="Generative"
            price="$90/mo"
            description="Best for advanced creators"
            features={[
              "220 video minutes/month",
              "320 seconds generative video/month",
              "3 users, 420GB storage",
              "Unlimited exports",
              "Advanced analytics",
              "Priority support",
            ]}
            planId="generative"
            buttonText="Start Free Trial"
          />

          <PricingCard
            title="Team"
            price="$850/mo"
            description="Best for teams & agencies"
            features={[
              "2100 video minutes/month",
              "55 minutes generative video/month",
              "1 seat, 4.2TB storage",
              "Unlimited exports",
              "White-label solution",
              "Dedicated account manager",
              "SLA support",
            ]}
            planId="team"
            buttonText="Contact Sales"
            buttonVariant="outline"
          />
        </div>

        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">How Credits Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• 1 credit = 1 minute of AI-generated video content</p>
              <p>• Stock footage and templates don't consume credits</p>
              <p>• Unused credits roll over for up to 3 months</p>
              <p>• Need more? Purchase additional credit packs anytime</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-24 bg-muted/30">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of creators who've transformed their video production
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-4">
                "ForgeVid cut our video production time by 80%. What used to take days now takes minutes. The AI
                understands exactly what we need."
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Sarah Martinez</p>
                  <p className="text-xs text-muted-foreground">Marketing Director, TechCorp</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-4">
                "The collaboration features are game-changing. Our entire team can work on videos simultaneously. It's
                like Google Docs for video creation."
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>MJ</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Michael Johnson</p>
                  <p className="text-xs text-muted-foreground">Creative Director, StartupXYZ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm mb-4">
                "ROI was immediate. We're creating 10x more video content with the same budget. The AI suggestions are
                incredibly smart."
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>EC</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">Emily Chen</p>
                  <p className="text-xs text-muted-foreground">CEO, MediaCo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-24">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about ForgeVid
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How does the AI video generation work?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your text prompt and automatically generates professional videos using advanced machine
                learning models. It selects appropriate visuals, adds transitions, and even generates voiceovers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Can I use the videos commercially?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Yes! All videos created with ForgeVid are yours to use commercially. We provide full commercial
                rights for all generated content and stock media included in your plan.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What if I'm not satisfied?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We offer a 14-day free trial and 30-day money-back guarantee. If you're not completely satisfied, we'll
                refund your subscription, no questions asked.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How secure is my content?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your content is encrypted and stored securely. We're SOC 2 certified and GDPR compliant. Your videos and
                data are never used to train our AI models without explicit consent.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container py-24 text-center">
        <Card className="max-w-3xl mx-auto bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-12">
            <h2 className="font-heading text-3xl font-bold mb-4">Ready to Transform Your Video Creation?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 50,000+ creators who've already revolutionized their video production with ForgeVid
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button size="lg" className="text-base">
                <TrendingUp className="mr-2 h-4 w-4" />
                Start Free Trial
              </Button>
              <Button variant="outline" size="lg" className="text-base bg-transparent">
                Schedule Demo
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-heading font-bold">ForgeVid</span>
              </div>
              <p className="text-sm text-muted-foreground">Transform your ideas into professional videos with AI.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-foreground transition-colors">
                    Templates
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/docs" className="hover:text-foreground transition-colors">
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <Link href="/help" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/help" className="hover:text-foreground transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Community
                  </a>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 ForgeVid. All rights reserved. ForgeVid is owned and operated by Kryst Investments LLC.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
