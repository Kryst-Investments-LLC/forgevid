import { RateLimiter } from "@/lib/rate-limiter"
import { jest } from "@jest/globals"

describe("RateLimiter", () => {
  let rateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 5,
    })
  })

  it("allows requests within limit", async () => {
    const mockRequest = new Request("http://localhost:3000/api/test")

    const result = await rateLimiter.checkLimit(mockRequest)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.limit).toBe(5)
  })

  it("blocks requests exceeding limit", async () => {
    const mockRequest = new Request("http://localhost:3000/api/test")

    // Make 5 requests (at the limit)
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkLimit(mockRequest)
    }

    // 6th request should be blocked
    const result = await rateLimiter.checkLimit(mockRequest)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("resets after window expires", async () => {
    const mockRequest = new Request("http://localhost:3000/api/test")

    // Mock time to simulate window expiry
    const originalNow = Date.now
    Date.now = jest.fn(() => originalNow() + 70000) // 70 seconds later

    const result = await rateLimiter.checkLimit(mockRequest)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)

    Date.now = originalNow
  })
})
