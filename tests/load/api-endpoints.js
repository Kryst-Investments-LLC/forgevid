import http from "k6/http"
import { check, sleep } from "k6"
import { Rate } from "k6/metrics"
import { __ENV } from "k6/env"

export const errorRate = new Rate("errors")

export const options = {
  stages: [
    { duration: "2m", target: 10 }, // Ramp up to 10 users
    { duration: "5m", target: 10 }, // Stay at 10 users
    { duration: "2m", target: 20 }, // Ramp up to 20 users
    { duration: "5m", target: 20 }, // Stay at 20 users
    { duration: "2m", target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    http_req_failed: ["rate<0.1"], // Error rate must be below 10%
    errors: ["rate<0.1"],
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

export default function () {
  // Test API health endpoint
  let response = http.get(`${BASE_URL}/api/monitoring/health`)
  check(response, {
    "health check status is 200": (r) => r.status === 200,
    "health check response time < 200ms": (r) => r.timings.duration < 200,
  }) || errorRate.add(1)

  sleep(1)

  // Test video API endpoint
  response = http.get(`${BASE_URL}/api/v1/videos`, {
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
  })
  check(response, {
    "videos API status is 200 or 401": (r) => [200, 401].includes(r.status),
    "videos API response time < 1000ms": (r) => r.timings.duration < 1000,
  }) || errorRate.add(1)

  sleep(1)

  // Test AI generation endpoint
  const aiPayload = JSON.stringify({
    prompt: "Create a short video about technology",
    duration: 30,
    style: "modern",
  })

  response = http.post(`${BASE_URL}/api/v1/ai/generate`, aiPayload, {
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
  })
  check(response, {
    "AI API status is 200, 401, or 429": (r) => [200, 401, 429].includes(r.status),
    "AI API response time < 5000ms": (r) => r.timings.duration < 5000,
  }) || errorRate.add(1)

  sleep(2)
}
