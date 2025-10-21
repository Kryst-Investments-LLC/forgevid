"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
export default function PricingCard({ title, description, price, period = "month", features, popular = false, planId, buttonText, buttonVariant = "default", }) {
    const [loading, setLoading] = useState(false);
    const { data: session } = useSession();
    const handleSubscribe = async () => {
        if (!planId)
            return;
        if (!session?.user?.id) {
            // Redirect to login if not authenticated
            window.location.href = '/auth/signin';
            return;
        }
        setLoading(true);
        try {
            const response = await fetch("/api/stripe/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    priceId: planId,
                    customerEmail: session.user.email,
                    successUrl: window.location.origin + "/dashboard/billing?success=true",
                    cancelUrl: window.location.origin + "/dashboard/billing?canceled=true"
                }),
            });
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            }
        }
        catch (error) {
            console.error("Subscription error:", error);
        }
        finally {
            setLoading(false);
        }
    };
    return (<Card className={popular ? "border-primary relative scale-105" : ""}>
      {popular && <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">Most Popular</Badge>}
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{price}</span>
          {price !== "$0" && <span className="text-sm text-muted-foreground">/month</span>}
        </div>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3 text-sm">
          {features.map((feature, index) => (<li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0"/>
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>))}
        </ul>
        <Button className="w-full" variant={buttonVariant} onClick={handleSubscribe} disabled={loading} size="lg">
          {loading ? (<>
              <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
              Processing...
            </>) : (buttonText)}
        </Button>
      </CardContent>
    </Card>);
}
