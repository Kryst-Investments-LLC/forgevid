import { GET } from '@/app/api/health/route'

describe('/api/health', () => {
  it('returns the deployed liveness contract', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
  })
})
