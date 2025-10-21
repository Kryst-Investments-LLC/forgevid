"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface Subscription {
  id: string
  plan: "free" | "starter" | "pro" | "enterprise"
  status: "active" | "canceled" | "past_due" | "incomplete"
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  customerId: string
}

interface SubscriptionContextType {
  subscription: Subscription | null
  loading: boolean
  refreshSubscription: () => Promise<void>
  hasFeature: (feature: string) => boolean
  canUseFeature: (feature: string, currentUsage?: number) => boolean
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

const PLAN_FEATURES = {
  free: {
    credits: 5,
    videoMinutes: 20,
    exports: 5,
    storage: 1, // GB
    watermark: true,
    aiFeatures: false,
    collaboration: false,
    support: "community",
    maxResolution: "720p",
  },
  starter: {
    credits: 25,
    videoMinutes: 100,
    exports: -1, // unlimited
    storage: 10,
    watermark: false,
    aiFeatures: true,
    collaboration: false,
    support: "email",
    maxResolution: "1080p",
  },
  pro: {
    credits: 75,
    videoMinutes: -1, // unlimited
    exports: -1,
    storage: 100,
    watermark: false,
    aiFeatures: true,
    collaboration: true,
    support: "priority",
    maxResolution: "4k",
  },
  enterprise: {
    credits: 300,
    videoMinutes: -1,
    exports: -1,
    storage: -1, // unlimited
    watermark: false,
    aiFeatures: true,
    collaboration: true,
    support: "dedicated",
    maxResolution: "4k",
  },
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/user/subscription")
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      } else {
        // Fallback for development when API doesn't exist
        setSubscription({
          id: "dev-subscription",
          plan: "pro",
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false,
          customerId: "dev-customer"
        })
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error)
      // Fallback for development
      setSubscription({
        id: "dev-subscription",
        plan: "pro",
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        customerId: "dev-customer"
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshSubscription = async () => {
    setLoading(true)
    await fetchSubscription()
  }

  const hasFeature = (feature: string): boolean => {
    if (!subscription) return false
    const planFeatures = PLAN_FEATURES[subscription.plan]
    return planFeatures[feature as keyof typeof planFeatures] === true
  }

  const canUseFeature = (feature: string, currentUsage = 0): boolean => {
    if (!subscription) return false
    const planFeatures = PLAN_FEATURES[subscription.plan]
    const limit = planFeatures[feature as keyof typeof planFeatures] as number

    // -1 means unlimited
    if (limit === -1) return true

    return currentUsage < limit
  }

  useEffect(() => {
    fetchSubscription()
  }, [])

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        refreshSubscription,
        hasFeature,
        canUseFeature,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider")
  }
  return context
}
