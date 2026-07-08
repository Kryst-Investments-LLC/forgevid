"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Gift,
  Copy,
  Share2,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Mail,
  Twitter,
  Facebook,
  Linkedin,
} from "lucide-react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState("VIDFORGE-USER123")
  const [copied, setCopied] = useState(false)

  // Mock referral data
  const referralStats = {
    totalReferrals: 12,
    activeReferrals: 8,
    totalEarnings: 240,
    pendingEarnings: 60,
    conversionRate: 25,
    tier: "Silver",
    nextTierProgress: 67,
  }

  const recentReferrals = [
    { id: 1, email: "john@example.com", status: "active", plan: "Pro", earnings: 25, date: "2024-01-15" },
    { id: 2, email: "sarah@company.com", status: "pending", plan: "Starter", earnings: 15, date: "2024-01-12" },
    { id: 3, email: "mike@startup.io", status: "active", plan: "Enterprise", earnings: 50, date: "2024-01-10" },
    { id: 4, email: "lisa@agency.com", status: "active", plan: "Pro", earnings: 25, date: "2024-01-08" },
    { id: 5, email: "david@creator.com", status: "expired", plan: "Free", earnings: 0, date: "2024-01-05" },
  ]

  const rewardTiers = [
    { name: "Bronze", referrals: 0, commission: "15%", bonus: "$0", color: "bg-orange-100 text-orange-800" },
    { name: "Silver", referrals: 5, commission: "20%", bonus: "$50", color: "bg-gray-100 text-gray-800" },
    { name: "Gold", referrals: 15, commission: "25%", bonus: "$150", color: "bg-yellow-100 text-yellow-800" },
    { name: "Platinum", referrals: 30, commission: "30%", bonus: "$300", color: "bg-purple-100 text-purple-800" },
  ]

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`https://vidforge.ai?ref=${referralCode}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const url = `https://vidforge.ai?ref=${referralCode}`
    const text = "Create amazing AI-powered videos in minutes with VidForge AI! Join me and get started for free."

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent("Check out VidForge AI")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    }

    window.open(shareUrls[platform as keyof typeof shareUrls], "_blank")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />

      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                Referral Program
              </h1>
              <p className="text-muted-foreground mt-1">Earn rewards by referring friends to VidForge AI</p>
            </div>

            <div className="flex items-center gap-4">
              <Badge className={rewardTiers.find((t) => t.name === referralStats.tier)?.color}>
                {referralStats.tier} Member
              </Badge>
              <Button>
                <Gift className="h-4 w-4 mr-2" />
                View Rewards
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="share">Share & Earn</TabsTrigger>
              <TabsTrigger value="referrals">My Referrals</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Overview */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Total Referrals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{referralStats.totalReferrals}</div>
                    <p className="text-xs text-muted-foreground">{referralStats.activeReferrals} active subscribers</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Total Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${referralStats.totalEarnings}</div>
                    <p className="text-xs text-muted-foreground">${referralStats.pendingEarnings} pending</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Conversion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{referralStats.conversionRate}%</div>
                    <p className="text-xs text-muted-foreground">Above average</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Current Tier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{referralStats.tier}</div>
                    <div className="mt-2">
                      <Progress value={referralStats.nextTierProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((15 - referralStats.totalReferrals) * (referralStats.nextTierProgress / 100))} more
                        for Gold
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* How It Works */}
              <Card>
                <CardHeader>
                  <CardTitle>How Referrals Work</CardTitle>
                  <CardDescription>Earn money for every successful referral</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Share2 className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">1. Share Your Link</h3>
                      <p className="text-sm text-muted-foreground">
                        Share your unique referral link with friends, colleagues, or on social media
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">2. They Sign Up</h3>
                      <p className="text-sm text-muted-foreground">
                        When someone signs up using your link, they become your referral
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DollarSign className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">3. Earn Rewards</h3>
                      <p className="text-sm text-muted-foreground">
                        Get 20% commission on their subscription payments for 12 months
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="share" className="space-y-6">
              {/* Referral Link */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Referral Link</CardTitle>
                  <CardDescription>Share this link to start earning referral rewards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input value={`https://vidforge.ai?ref=${referralCode}`} readOnly className="font-mono text-sm" />
                      <Button onClick={handleCopyCode} variant="outline">
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleShare("email")} variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      <Button onClick={() => handleShare("twitter")} variant="outline" size="sm">
                        <Twitter className="h-4 w-4 mr-2" />
                        Twitter
                      </Button>
                      <Button onClick={() => handleShare("facebook")} variant="outline" size="sm">
                        <Facebook className="h-4 w-4 mr-2" />
                        Facebook
                      </Button>
                      <Button onClick={() => handleShare("linkedin")} variant="outline" size="sm">
                        <Linkedin className="h-4 w-4 mr-2" />
                        LinkedIn
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Share Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>Share Templates</CardTitle>
                  <CardDescription>Ready-to-use messages for different platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Social Media Post</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        "Just discovered VidForge AI - it's incredible how fast you can create professional videos with
                        AI! Perfect for content creators, marketers, and businesses. Try it free:
                        https://vidforge.ai?ref={referralCode}"
                      </p>
                      <Button size="sm" variant="outline" onClick={() => handleCopyCode()}>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Text
                      </Button>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Email Template</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        "Hi [Name], I've been using VidForge AI for my video content and it's been a game-changer. The
                        AI creates professional videos in minutes - thought you might find it useful for [their use
                        case]. You can try it free here: https://vidforge.ai?ref={referralCode}"
                      </p>
                      <Button size="sm" variant="outline" onClick={() => handleShare("email")}>
                        <Mail className="h-3 w-3 mr-1" />
                        Send Email
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referrals" className="space-y-6">
              {/* Referrals List */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Referrals</CardTitle>
                  <CardDescription>Track your referral activity and earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentReferrals.map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium">{referral.email}</div>
                            <div className="text-sm text-muted-foreground">
                              Joined {referral.date} • {referral.plan} Plan
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                referral.status === "active"
                                  ? "default"
                                  : referral.status === "pending"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {referral.status}
                            </Badge>
                          </div>
                          <div className="font-medium">${referral.earnings}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rewards" className="space-y-6">
              {/* Reward Tiers */}
              <Card>
                <CardHeader>
                  <CardTitle>Reward Tiers</CardTitle>
                  <CardDescription>Unlock higher commissions and bonuses as you refer more users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {rewardTiers.map((tier, index) => (
                      <Card
                        key={tier.name}
                        className={`${tier.name === referralStats.tier ? "ring-2 ring-primary" : ""}`}
                      >
                        <CardContent className="p-4 text-center">
                          <Badge className={tier.color + " mb-3"}>{tier.name}</Badge>
                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">{tier.referrals}+ referrals</div>
                            <div className="font-semibold">{tier.commission} commission</div>
                            <div className="text-sm">{tier.bonus} signup bonus</div>
                          </div>
                          {tier.name === referralStats.tier && (
                            <Badge variant="outline" className="mt-2">
                              Current Tier
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payout Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Payout Information</CardTitle>
                  <CardDescription>How and when you receive your referral earnings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Payment Schedule</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Minimum payout:</span>
                          <span className="font-medium">$50</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment frequency:</span>
                          <span className="font-medium">Monthly</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Next payout:</span>
                          <span className="font-medium">Feb 1, 2024</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Payment Methods</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>PayPal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Bank Transfer</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Stripe</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
