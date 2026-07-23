"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Lock, Crown, Zap, ArrowUpRight } from "lucide-react"
import { useSubscription } from "@/hooks/use-subscription-simple"
import type { ReactNode } from "react"

interface FeatureGateProps {
  feature: string
  plan?: "starter" | "pro" | "enterprise"
  fallback?: ReactNode
  children: ReactNode
}

export function FeatureGate({ feature, plan, fallback, children }: FeatureGateProps) {
  const { subscription, hasFeature } = useSubscription()

  if (!subscription || !hasFeature(feature)) {
    return (
      fallback || (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Premium Feature</h3>
            <p className="text-sm text-muted-foreground mb-4">Upgrade to {plan || "Pro"} to unlock this feature</p>
            <Button size="sm">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )
    )
  }

  return <>{children}</>
}

interface UsageLimitProps {
  feature: string
  currentUsage: number
  children: ReactNode
}

export function UsageLimit({ feature, currentUsage, children }: UsageLimitProps) {
  const { subscription, canUseFeature } = useSubscription()

  if (!subscription || !canUseFeature(feature, currentUsage)) {
    return (
      // Light card in a dark-token app: every color must be explicit, or the
      // title/body inherit near-white foreground and vanish on orange-50.
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
            <Zap className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="font-semibold mb-2 text-orange-950">Usage Limit Reached</h3>
          <p className="text-sm text-orange-900/70 mb-4">
            You've reached your {feature} limit for this billing period
          </p>
          <Button size="sm" variant="outline" className="border-orange-300 bg-white text-orange-900 hover:bg-orange-100">
            <ArrowUpRight className="h-4 w-4 mr-2" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
