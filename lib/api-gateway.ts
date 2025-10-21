interface UpstreamServer {
  url: string
  weight: number
  healthy: boolean
  lastHealthCheck: number
  responseTime: number
}

interface RouteConfig {
  path: string
  method: string
  upstream: UpstreamServer[]
  cacheConfig?: {
    ttl: number
    key: string
  }
  transformRequest?: (req: Request) => Request
  transformResponse?: (res: Response) => Response
}

export class APIGateway {
  private routes: Map<string, RouteConfig> = new Map()
  private cache: Map<string, { data: any; expires: number }> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    this.initializeRoutes()
    this.startHealthChecks()
  }

  private initializeRoutes() {
    // Configure API routes with load balancing
    this.routes.set("GET:/api/v1/videos", {
      path: "/api/v1/videos",
      method: "GET",
      upstream: [
        { url: "http://localhost:3001", weight: 70, healthy: true, lastHealthCheck: Date.now(), responseTime: 100 },
        { url: "http://localhost:3002", weight: 30, healthy: true, lastHealthCheck: Date.now(), responseTime: 120 },
      ],
      cacheConfig: { ttl: 300000, key: "videos:list" }, // 5 minute cache
    })

    this.routes.set("POST:/api/v1/ai/generate", {
      path: "/api/v1/ai/generate",
      method: "POST",
      upstream: [
        { url: "http://localhost:3003", weight: 50, healthy: true, lastHealthCheck: Date.now(), responseTime: 2000 },
        {
          url: "http://localhost:3004",
          weight: 50,
          healthy: true,
          lastHealthCheck: Date.now(),
          responseTime: 1800,
        },
      ],
    })
  }

  async routeRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const routeKey = `${request.method}:${url.pathname}`
    const route = this.routes.get(routeKey)

    if (!route) {
      return new Response("Route not found", { status: 404 })
    }

    // Check cache first
    if (route.cacheConfig && request.method === "GET") {
      const cached = this.getFromCache(route.cacheConfig.key)
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
        })
      }
    }

    // Select upstream server using weighted round-robin
    const upstream = this.selectUpstream(route.upstream)
    if (!upstream) {
      return new Response("No healthy upstream servers", { status: 503 })
    }

    try {
      // Transform request if needed
      const transformedRequest = route.transformRequest ? route.transformRequest(request) : request

      // Proxy request to upstream
      const upstreamUrl = `${upstream.url}${url.pathname}${url.search}`
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      })

      // Update upstream health metrics
      upstream.responseTime = Date.now() - Date.now() // Simplified timing
      upstream.healthy = response.ok

      // Transform response if needed
      const transformedResponse = route.transformResponse ? route.transformResponse(response) : response

      // Cache successful GET responses
      if (route.cacheConfig && request.method === "GET" && response.ok) {
        const data = await response.clone().json()
        this.setCache(route.cacheConfig.key, data, route.cacheConfig.ttl)
      }

      return transformedResponse
    } catch (error) {
      upstream.healthy = false
      console.error(`[API Gateway] Upstream error:`, error)
      return new Response("Upstream server error", { status: 502 })
    }
  }

  private selectUpstream(upstreams: UpstreamServer[]): UpstreamServer | null {
    const healthyUpstreams = upstreams.filter((u) => u.healthy)
    if (healthyUpstreams.length === 0) return null

    // Weighted round-robin selection
    const totalWeight = healthyUpstreams.reduce((sum, u) => sum + u.weight, 0)
    let random = Math.random() * totalWeight

    for (const upstream of healthyUpstreams) {
      random -= upstream.weight
      if (random <= 0) return upstream
    }

    return healthyUpstreams[0]
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && cached.expires > Date.now()) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    })
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const route of this.routes.values()) {
        for (const upstream of route.upstream) {
          try {
            const start = Date.now()
            const response = await fetch(`${upstream.url}/health`, {
              method: "GET",
              signal: AbortSignal.timeout(5000), // 5 second timeout
            })
            upstream.healthy = response.ok
            upstream.responseTime = Date.now() - start
            upstream.lastHealthCheck = Date.now()
          } catch (error) {
            upstream.healthy = false
            upstream.lastHealthCheck = Date.now()
          }
        }
      }
    }, 30000) // Check every 30 seconds
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
  }
}

export const apiGateway = new APIGateway()
