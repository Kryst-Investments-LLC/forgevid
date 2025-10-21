"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Crown, Zap, ArrowUpRight } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription-simple";
export function FeatureGate({ feature, plan, fallback, children }) {
    const { subscription, hasFeature } = useSubscription();
    if (!subscription || !hasFeature(feature)) {
        return (fallback || (<Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-4">
              <Lock className="h-6 w-6 text-muted-foreground"/>
            </div>
            <h3 className="font-semibold mb-2">Premium Feature</h3>
            <p className="text-sm text-muted-foreground mb-4">Upgrade to {plan || "Pro"} to unlock this feature</p>
            <Button size="sm">
              <Crown className="h-4 w-4 mr-2"/>
              Upgrade Now
            </Button>
          </CardContent>
        </Card>));
    }
    return <>{children}</>;
}
export function UsageLimit({ feature, currentUsage, children }) {
    const { subscription, canUseFeature } = useSubscription();
    if (!subscription || !canUseFeature(feature, currentUsage)) {
        return (<Card className="border-orange-200 bg-orange-50">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
            <Zap className="h-6 w-6 text-orange-600"/>
          </div>
          <h3 className="font-semibold mb-2">Usage Limit Reached</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You've reached your {feature} limit for this billing period
          </p>
          <Button size="sm" variant="outline">
            <ArrowUpRight className="h-4 w-4 mr-2"/>
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>);
    }
    return <>{children}</>;
}
