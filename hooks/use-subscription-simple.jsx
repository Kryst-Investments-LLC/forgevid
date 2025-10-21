"use client";
import { createContext, useContext, useState } from "react";
const SubscriptionContext = createContext(undefined);
const PLAN_FEATURES = {
    free: {
        credits: 10,
        videoMinutes: 30,
        exports: 10,
        storage: 2,
        watermark: true,
        aiFeatures: false,
        collaboration: false,
        support: "community",
        maxResolution: "720p",
    },
    starter: {
        credits: 50,
        videoMinutes: 120,
        exports: 50,
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
};
export function SubscriptionProvider({ children }) {
    const [subscription] = useState({
        id: "dev-subscription",
        plan: "enterprise", // Highest tier for development
        status: "active",
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        cancelAtPeriodEnd: false,
        customerId: "dev-customer"
    });
    const [loading] = useState(false);
    const refreshSubscription = async () => {
        // No-op for development
    };
    const hasFeature = (feature) => {
        // For development, always return true - no restrictions
        console.log('Development mode: Allowing feature:', feature);
        return true;
    };
    const canUseFeature = (feature, currentUsage = 0) => {
        // For development, always return true - unlimited usage
        console.log('Development mode: Allowing unlimited usage for feature:', feature);
        return true;
    };
    return (<SubscriptionContext.Provider value={{
            subscription,
            loading,
            refreshSubscription,
            hasFeature,
            canUseFeature,
        }}>
      {children}
    </SubscriptionContext.Provider>);
}
export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error("useSubscription must be used within a SubscriptionProvider");
    }
    return context;
}
