// Enhanced analytics with conversion tracking and UTM parameters
class AnalyticsManager {
    events = [];
    userId = null;
    sessionId;
    utmParams = {};
    constructor() {
        this.sessionId = this.generateSessionId();
        this.initializeUTMTracking();
        this.initializeGoogleAnalytics();
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    initializeUTMTracking() {
        if (typeof window !== "undefined") {
            const urlParams = new URLSearchParams(window.location.search);
            // Capture UTM parameters
            this.utmParams = {
                utm_source: urlParams.get("utm_source") || undefined,
                utm_medium: urlParams.get("utm_medium") || undefined,
                utm_campaign: urlParams.get("utm_campaign") || undefined,
                utm_content: urlParams.get("utm_content") || undefined,
                utm_term: urlParams.get("utm_term") || undefined,
            };
            // Capture referral parameter
            const referralCode = urlParams.get("ref");
            if (referralCode) {
                this.utmParams.utm_source = "referral";
                this.utmParams.utm_medium = "referral_link";
                this.utmParams.utm_campaign = referralCode;
                // Store referral in localStorage for attribution
                localStorage.setItem("referral_code", referralCode);
                localStorage.setItem("referral_timestamp", Date.now().toString());
            }
            // Store UTM parameters in localStorage for session persistence
            if (Object.values(this.utmParams).some((value) => value)) {
                localStorage.setItem("utm_params", JSON.stringify(this.utmParams));
            }
        }
    }
    initializeGoogleAnalytics() {
        if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID) {
            // Initialize Google Analytics 4
            const script = document.createElement("script");
            script.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`;
            script.async = true;
            document.head.appendChild(script);
            window.dataLayer = window.dataLayer || [];
            function gtag(...args) {
                window.dataLayer.push(args);
            }
            gtag("js", new Date());
            gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
                page_title: document.title,
                page_location: window.location.href,
                custom_map: {
                    custom_parameter_1: "utm_source",
                    custom_parameter_2: "utm_campaign",
                },
            });
            // Set up enhanced ecommerce tracking
            gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
                enhanced_ecommerce: true,
            });
        }
    }
    setUserId(userId) {
        this.userId = userId;
        // Update Google Analytics user ID
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("config", process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID, {
                user_id: userId,
            });
        }
    }
    track(event, properties = {}) {
        const analyticsEvent = {
            event,
            properties: {
                ...properties,
                ...this.utmParams,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString(),
                url: typeof window !== "undefined" ? window.location.href : undefined,
                referrer: typeof document !== "undefined" ? document.referrer : undefined,
            },
            userId: this.userId || undefined,
            timestamp: new Date(),
        };
        this.events.push(analyticsEvent);
        // Send to Google Analytics
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", event, {
                event_category: properties.category || "engagement",
                event_label: properties.label,
                value: properties.value,
                custom_parameter_1: this.utmParams.utm_source,
                custom_parameter_2: this.utmParams.utm_campaign,
                user_id: this.userId,
            });
        }
        // Send to internal analytics API
        this.sendToAPI(analyticsEvent);
    }
    // Conversion tracking methods
    trackSignup(method = "email") {
        const referralCode = localStorage.getItem("referral_code");
        this.track("user_signup", {
            category: "conversion",
            method,
            referral_code: referralCode,
            conversion_type: "signup",
        });
        // Google Analytics conversion
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "sign_up", {
                method,
                event_category: "conversion",
                event_label: referralCode ? "referral" : "organic",
            });
        }
    }
    trackSubscription(planId, value, currency = "USD") {
        const referralCode = localStorage.getItem("referral_code");
        this.track("subscription_created", {
            category: "conversion",
            plan_id: planId,
            value,
            currency,
            referral_code: referralCode,
            conversion_type: "subscription",
        });
        // Google Analytics purchase event
        if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "purchase", {
                transaction_id: `sub_${Date.now()}`,
                value,
                currency,
                items: [
                    {
                        item_id: planId,
                        item_name: `ForgeVid ${planId} Plan`,
                        category: "subscription",
                        quantity: 1,
                        price: value,
                    },
                ],
            });
        }
    }
    trackVideoCreation(templateId, aiGenerated = false) {
        this.track("video_created", {
            category: "engagement",
            template_id: templateId,
            ai_generated: aiGenerated,
            feature_usage: "video_creation",
        });
    }
    trackVideoExport(format, quality) {
        this.track("video_exported", {
            category: "engagement",
            format,
            quality,
            feature_usage: "video_export",
        });
    }
    trackFeatureUsage(feature, action) {
        this.track("feature_used", {
            category: "engagement",
            feature,
            action,
            feature_usage: feature,
        });
    }
    // Referral tracking
    trackReferralClick(referralCode) {
        this.track("referral_click", {
            category: "referral",
            referral_code: referralCode,
            conversion_type: "referral_click",
        });
    }
    trackReferralConversion(referralCode, planId, value) {
        this.track("referral_conversion", {
            category: "referral",
            referral_code: referralCode,
            plan_id: planId,
            value,
            conversion_type: "referral_conversion",
        });
    }
    async sendToAPI(event) {
        try {
            await fetch("/api/analytics/track", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(event),
            });
        }
        catch (error) {
            console.error("Failed to send analytics event:", error);
        }
    }
    // Get conversion funnel data
    async getConversionFunnel(timeframe = "30d") {
        try {
            const response = await fetch(`/api/analytics/funnel?timeframe=${timeframe}`);
            return await response.json();
        }
        catch (error) {
            console.error("Failed to fetch conversion funnel:", error);
            return null;
        }
    }
    // Get referral analytics
    async getReferralAnalytics(userId) {
        try {
            const response = await fetch(`/api/analytics/referrals?userId=${userId}`);
            return await response.json();
        }
        catch (error) {
            console.error("Failed to fetch referral analytics:", error);
            return null;
        }
    }
}
// Global analytics instance
export const analytics = new AnalyticsManager();
// React hook for analytics
export function useAnalytics() {
    return {
        track: analytics.track.bind(analytics),
        setUserId: analytics.setUserId.bind(analytics),
        trackSignup: analytics.trackSignup.bind(analytics),
        trackSubscription: analytics.trackSubscription.bind(analytics),
        trackVideoCreation: analytics.trackVideoCreation.bind(analytics),
        trackVideoExport: analytics.trackVideoExport.bind(analytics),
        trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
        trackReferralClick: analytics.trackReferralClick.bind(analytics),
        trackReferralConversion: analytics.trackReferralConversion.bind(analytics),
        getConversionFunnel: analytics.getConversionFunnel.bind(analytics),
        getReferralAnalytics: analytics.getReferralAnalytics.bind(analytics),
    };
}
