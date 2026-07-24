const consume = jest.fn()

jest.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: jest.fn(() => ({ consume })),
}))
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({})),
}))

const { checkRateLimit } = require('@/lib/rate-limiter')

describe('checkRateLimit', () => {
  beforeEach(() => consume.mockReset())

  it('returns the provider remaining points when allowed', async () => {
    consume.mockResolvedValue({ remainingPoints: 4 })
    await expect(checkRateLimit('audit-user')).resolves.toEqual({ allowed: true, remaining: 4 })
    expect(consume).toHaveBeenCalledWith('audit-user')
  })

  it('fails closed when the provider rejects the request', async () => {
    consume.mockRejectedValue(new Error('rate exceeded'))
    await expect(checkRateLimit('audit-user')).resolves.toEqual({ allowed: false, remaining: 0 })
  })
})
