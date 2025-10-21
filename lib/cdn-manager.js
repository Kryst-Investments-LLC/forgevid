export class CDNManager {
    static cdnConfig = {
        baseUrl: process.env.CDN_BASE_URL || "https://cdn.vidforge.ai",
        regions: ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"],
        cacheTTL: {
            images: 31536000, // 1 year
            videos: 2592000, // 30 days
            static: 31536000, // 1 year
            api: 300, // 5 minutes
        },
    };
    static getOptimizedUrl(path, options = {}) {
        const url = new URL(path, this.cdnConfig.baseUrl);
        if (options.width)
            url.searchParams.set("w", options.width.toString());
        if (options.height)
            url.searchParams.set("h", options.height.toString());
        if (options.quality)
            url.searchParams.set("q", options.quality.toString());
        if (options.format)
            url.searchParams.set("f", options.format);
        if (options.region)
            url.searchParams.set("r", options.region);
        return url.toString();
    }
    static async uploadAsset(file, path, options = {}) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", path);
        if (options.contentType)
            formData.append("contentType", options.contentType);
        if (options.cacheControl)
            formData.append("cacheControl", options.cacheControl);
        if (options.metadata)
            formData.append("metadata", JSON.stringify(options.metadata));
        try {
            const response = await fetch("/api/cdn/upload", {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            const result = await response.json();
            return {
                url: result.url,
                cdnUrl: this.getOptimizedUrl(result.path),
            };
        }
        catch (error) {
            console.error("[CDN] Upload failed:", error);
            throw error;
        }
    }
    static async invalidateCache(paths) {
        try {
            await fetch("/api/cdn/invalidate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paths }),
            });
            console.log(`[CDN] Invalidated cache for ${paths.length} paths`);
        }
        catch (error) {
            console.error("[CDN] Cache invalidation failed:", error);
            throw error;
        }
    }
    static getClosestRegion(userLocation) {
        if (!userLocation)
            return this.cdnConfig.regions[0];
        // Simple region selection based on location
        const { lat, lng } = userLocation;
        if (lng < -30)
            return "us-east-1"; // Americas
        if (lng < 60)
            return "eu-west-1"; // Europe/Africa
        return "ap-southeast-1"; // Asia/Pacific
    }
    static async preloadAssets(urls) {
        const preloadPromises = urls.map((url) => {
            return new Promise((resolve, reject) => {
                const link = document.createElement("link");
                link.rel = "preload";
                link.href = url;
                link.onload = () => resolve();
                link.onerror = () => reject(new Error(`Failed to preload ${url}`));
                document.head.appendChild(link);
            });
        });
        try {
            await Promise.all(preloadPromises);
            console.log(`[CDN] Preloaded ${urls.length} assets`);
        }
        catch (error) {
            console.warn("[CDN] Some assets failed to preload:", error);
        }
    }
    static getCacheStats() {
        // Mock implementation - replace with actual CDN analytics
        return {
            hitRate: 94.5,
            bandwidth: 1250000000, // bytes
            requests: 45000,
            regions: {
                "us-east-1": 18000,
                "us-west-2": 12000,
                "eu-west-1": 10000,
                "ap-southeast-1": 5000,
            },
        };
    }
}
export class ResourceOptimizer {
    static async optimizeBundle() {
        // Code splitting and lazy loading optimization
        const criticalResources = ["/css/critical.css", "/js/critical.js"];
        const nonCriticalResources = ["/css/non-critical.css", "/js/analytics.js", "/js/chat-widget.js"];
        // Preload critical resources
        await CDNManager.preloadAssets(criticalResources);
        // Lazy load non-critical resources
        setTimeout(() => {
            nonCriticalResources.forEach((url) => {
                const script = document.createElement("script");
                script.src = url;
                script.async = true;
                document.head.appendChild(script);
            });
        }, 2000);
    }
    static enableServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                console.log("[SW] Service Worker registered:", registration);
            })
                .catch((error) => {
                console.error("[SW] Service Worker registration failed:", error);
            });
        }
    }
    static async measureResourceTiming() {
        return performance.getEntriesByType("resource");
    }
    static getResourceMetrics() {
        const resources = performance.getEntriesByType("resource");
        const totalSize = resources.reduce((sum, resource) => {
            return sum + (resource.transferSize || 0);
        }, 0);
        const loadTime = resources.reduce((max, resource) => {
            return Math.max(max, resource.responseEnd - resource.startTime);
        }, 0);
        const cachedResources = resources.filter((r) => r.transferSize === 0).length;
        const cacheHitRate = (cachedResources / resources.length) * 100;
        const slowResources = resources.filter((r) => r.responseEnd - r.startTime > 1000).map((r) => r.name);
        return {
            totalSize,
            loadTime,
            cacheHitRate,
            slowResources,
        };
    }
}
