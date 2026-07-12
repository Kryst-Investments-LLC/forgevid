"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PRICING_PLANS } from "@/lib/stripe"
import { CreditCard, Calendar, DollarSign, AlertCircle, Loader2, ArrowUpRight, ExternalLink } from "lucide-react"

interface Subscription {
  planId: string
  status: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}
interface Usage {
  videosThisMonth: number
  videoLimit: number
}

function planFor(planId: string) {
  const id = (planId ?? "free").toLowerCase()
  return Object.values(PRICING_PLANS).find((p) => p.id === id) ?? PRICING_PLANS.FREE
}
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
  } catch {
    return iso
  }
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch("/api/user/subscription")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setSubscription(d.subscription)
        setUsage(d.usage ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch("/api/payments/customer-portal", { method: "POST" })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else alert(error || "The billing portal isn't available yet.")
    } catch {
      alert("Couldn't open the billing portal. Please try again.")
    } finally {
      setPortalLoading(false)
    }
  }

  const plan = subscription ? planFor(subscription.planId) : PRICING_PLANS.FREE
  const isActive = ["active", "trialing"].includes((subscription?.status ?? "").toLowerCase())
  const isPaid = plan.id !== "free"
  const usedPct = usage && usage.videoLimit > 0 ? Math.min(100, Math.round((usage.videosThisMonth / usage.videoLimit) * 100)) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing &amp; Subscription</h1>
        <p className="text-muted-foreground">Manage your plan, usage, and payment details.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading your subscription…
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> Current Plan
                </CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{plan.name}</span>
                      <Badge variant={isActive ? "default" : "secondary"}>{subscription?.status ?? "inactive"}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {plan.price === 0 ? "Free" : `$${plan.price}/month`}
                    </p>
                  </div>
                  {isPaid && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {subscription?.cancelAtPeriodEnd ? "Cancels on" : "Next billing"}
                      </p>
                      <p className="font-medium">{subscription ? formatDate(subscription.currentPeriodEnd) : "—"}</p>
                    </div>
                  )}
                </div>

                {subscription?.cancelAtPeriodEnd && (
                  <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <p className="text-sm text-orange-400">
                      Your subscription ends on {formatDate(subscription.currentPeriodEnd)}.
                    </p>
                  </div>
                )}

                <Separator />

                {isPaid ? (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full bg-transparent" onClick={openPortal} disabled={portalLoading}>
                      {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Manage subscription &amp; payment
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Opens the secure Stripe billing portal.</p>
                  </div>
                ) : (
                  <Link href="/pricing">
                    <Button className="w-full">
                      <ArrowUpRight className="mr-2 h-4 w-4" /> Upgrade your plan
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" /> Usage This Month
                </CardTitle>
                <CardDescription>Videos generated against your plan limit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Videos generated</span>
                    <span className="text-sm font-medium tabular-nums">
                      {usage ? `${usage.videosThisMonth} / ${usage.videoLimit}` : "—"}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${usedPct}%` }} />
                  </div>
                  {usage && usage.videosThisMonth >= usage.videoLimit && (
                    <p className="text-xs text-orange-400">You've reached this month's limit. Upgrade for more.</p>
                  )}
                </div>

                <Separator />

                <p className="text-sm text-muted-foreground">
                  Your <span className="font-medium text-foreground">{plan.name}</span> plan includes{" "}
                  <span className="font-medium text-foreground">{plan.credits}</span> videos per month.
                </p>

                <Link href="/pricing">
                  <Button variant="outline" className="w-full bg-transparent">
                    <ArrowUpRight className="mr-2 h-4 w-4" /> {isPaid ? "Change plan" : "See plans"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Billing history — invoices live in Stripe's portal, not rebuilt here */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" /> Invoices &amp; payment history
              </CardTitle>
              <CardDescription>Your receipts and invoices are kept in the secure billing portal.</CardDescription>
            </CardHeader>
            <CardContent>
              {isPaid ? (
                <Button variant="outline" className="bg-transparent" onClick={openPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  View invoices in the billing portal
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">No invoices yet — they'll appear here once you're on a paid plan.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
