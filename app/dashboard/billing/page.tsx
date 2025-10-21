"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Download, Calendar, DollarSign, AlertCircle, CheckCircle, Clock, ArrowUpRight } from "lucide-react"

export default function BillingPage() {
  const [loading, setLoading] = useState(false)

  // Mock subscription data - replace with real data from API
  const subscription = {
    plan: "Pro",
    status: "active",
    currentPeriodEnd: "2025-02-15",
    cancelAtPeriodEnd: false,
    price: "$35.00",
    interval: "month",
  }

  const invoices = [
    {
      id: "inv_001",
      date: "2025-01-15",
      amount: "$35.00",
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "inv_002",
      date: "2024-12-15",
      amount: "$35.00",
      status: "paid",
      downloadUrl: "#",
    },
    {
      id: "inv_003",
      date: "2024-11-15",
      amount: "$35.00",
      status: "paid",
      downloadUrl: "#",
    },
  ]

  const handleCancelSubscription = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId: "sub_123" }),
      })

      if (response.ok) {
        // Refresh subscription data
        window.location.reload()
      }
    } catch (error) {
      console.error("Cancel subscription error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePaymentMethod = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customerId: "cus_123" }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Customer portal error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription, billing information, and payment history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>Your active subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{subscription.plan}</span>
                  <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                    {subscription.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {subscription.price}/{subscription.interval}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Next billing</p>
                <p className="font-medium">{subscription.currentPeriodEnd}</p>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm text-orange-800">
                  Your subscription will cancel on {subscription.currentPeriodEnd}
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={handleUpdatePaymentMethod}
                disabled={loading}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Update Payment Method
              </Button>

              {!subscription.cancelAtPeriodEnd && (
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-700 bg-transparent"
                  onClick={handleCancelSubscription}
                  disabled={loading}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>Your current usage and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Video Minutes</span>
                <span className="text-sm font-medium">45 / Unlimited</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full w-[45%]"></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Exports</span>
                <span className="text-sm font-medium">23 / Unlimited</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full w-[23%]"></div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage Used</span>
                <span className="text-sm font-medium">12.5 GB / 100 GB</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full w-[12.5%]"></div>
              </div>
            </div>

            <Separator />

            <Button variant="outline" className="w-full bg-transparent">
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>Download your invoices and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-secondary rounded-full">
                    {invoice.status === "paid" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">Invoice {invoice.id}</p>
                    <p className="text-sm text-muted-foreground">{invoice.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">{invoice.amount}</p>
                    <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>{invoice.status}</Badge>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
