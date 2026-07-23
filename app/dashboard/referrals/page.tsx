"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Gift, Copy, Share2, DollarSign, CheckCircle, Mail, Twitter, Linkedin, Loader2 } from "lucide-react"

interface ReferralSignupRow {
  email: string
  converted: boolean
  rewardCents: number
  createdAt: string
}
interface ReferralData {
  code: string
  shareUrl: string
  rewardPerReferralCents: number
  stats: { referred: number; converted: number; pending: number; earningsCents: number }
  signups: ReferralSignupRow[]
}

const money = (cents: number) => `$${(cents / 100).toFixed(0)}`
const fmtDate = (iso: string) => {
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) } catch { return "" }
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const reward = data ? money(data.rewardPerReferralCents) : "$5"

  const handleCopy = () => {
    if (!data) return
    navigator.clipboard.writeText(data.shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const handleShare = (platform: string) => {
    if (!data) return
    const url = data.shareUrl
    const text = `I'm making videos with ForgeVid — turn a prompt into a finished video in minutes. Try it free:`
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      email: `mailto:?subject=${encodeURIComponent("Try ForgeVid")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    }
    window.open(urls[platform], "_blank")
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading your referrals…</div>
  }

  const stats = data?.stats ?? { referred: 0, converted: 0, pending: 0, earningsCents: 0 }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" /> Referral Program
          </h1>
          <p className="text-muted-foreground mt-1">Earn {reward} in account credit for every friend who subscribes</p>
        </div>
        <Badge variant="secondary" className="text-sm"><DollarSign className="h-3 w-3 mr-1" />{money(stats.earningsCents)} earned</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="share">Share &amp; Earn</TabsTrigger>
          <TabsTrigger value="referrals">My Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />Referred</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.referred}</div><p className="text-xs text-muted-foreground">friends signed up</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4" />Subscribed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.converted}</div><p className="text-xs text-muted-foreground">became paying customers</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><Gift className="h-4 w-4" />Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{stats.pending}</div><p className="text-xs text-muted-foreground">signed up, not yet paid</p></CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Credit earned</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{money(stats.earningsCents)}</div><p className="text-xs text-muted-foreground">{reward} per subscriber</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>How it works</CardTitle><CardDescription>Real, tracked referrals — no gimmicks</CardDescription></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Share2 className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">1. Share your link</h3><p className="text-sm text-muted-foreground">Send your personal link to friends or post it anywhere.</p></div>
                <div className="text-center"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><Users className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">2. They sign up</h3><p className="text-sm text-muted-foreground">Anyone who signs up through your link is tracked to you.</p></div>
                <div className="text-center"><div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3"><DollarSign className="h-6 w-6 text-primary" /></div><h3 className="font-semibold mb-2">3. Earn {reward} credit</h3><p className="text-sm text-muted-foreground">When they take a paid plan, you earn {reward} in account credit.</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Your referral link</CardTitle><CardDescription>Share this to start earning credit</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input value={data?.shareUrl ?? ""} readOnly className="font-mono text-sm" />
                  <Button onClick={handleCopy} variant="outline" disabled={!data}>
                    {copied ? <CheckCircle className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}{copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => handleShare("email")} variant="outline" size="sm" disabled={!data}><Mail className="h-4 w-4 mr-2" />Email</Button>
                  <Button onClick={() => handleShare("twitter")} variant="outline" size="sm" disabled={!data}><Twitter className="h-4 w-4 mr-2" />X / Twitter</Button>
                  <Button onClick={() => handleShare("linkedin")} variant="outline" size="sm" disabled={!data}><Linkedin className="h-4 w-4 mr-2" />LinkedIn</Button>
                </div>
                <p className="text-xs text-muted-foreground">Your code: <span className="font-mono">{data?.code}</span></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Your referrals</CardTitle><CardDescription>Everyone who signed up with your link</CardDescription></CardHeader>
            <CardContent>
              {(!data || data.signups.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">No referrals yet — share your link to get started.</div>
              ) : (
                <div className="space-y-4">
                  {data.signups.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center"><Users className="h-5 w-5" /></div>
                        <div>
                          <div className="font-medium font-mono text-sm">{s.email}</div>
                          <div className="text-sm text-muted-foreground">Joined {fmtDate(s.createdAt)}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={s.converted ? "default" : "secondary"} className="mb-1">{s.converted ? "Subscribed" : "Pending"}</Badge>
                        <div className="font-medium">{money(s.rewardCents)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
