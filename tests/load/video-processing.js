import http from "k6/http"
import { check, sleep } from "k6"
import { Rate } from "k6/metrics"
import { __ENV } from "k6"

export const errorRate = new Rate("errors")

export const options = {
  scenarios: {
    video_upload: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 5 },
        { duration: "3m", target: 5 },
        { duration: "1m", target: 0 },
      ],
    },
    video_processing: {
      executor: "constant-vus",
      vus: 3,
      duration: "5m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<10000"], // 95% of requests under 10s
    http_req_failed: ["rate<0.05"], // Error rate under 5%
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

export default function () {
  const scenario = __ENV.K6_SCENARIO || "video_upload"

  if (scenario === "video_upload") {
    testVideoUpload()
  } else if (scenario === "video_processing") {
    testVideoProcessing()
  }
}

function testVideoUpload() {
  // Simulate video file upload
  const videoData = new ArrayBuffer(1024 * 1024) // 1MB mock video
  const formData = {
    video: http.file(videoData, "test-video.mp4", "video/mp4"),
    title: "Load Test Video",
    description: "Video uploaded during load testing",
  }

  const response = http.post(`${BASE_URL}/api/v1/videos/upload`, formData, {
    headers: {
      Authorization: "Bearer test-token",
    },
  })

  check(response, {
    "upload status is 200 or 413": (r) => [200, 413].includes(r.status),
    "upload response time < 30s": (r) => r.timings.duration < 30000,
  }) || errorRate.add(1)

  sleep(5)
}

function testVideoProcessing() {
  // Test video processing pipeline
  const processingPayload = JSON.stringify({
    videoId: `test-video-${Math.random().toString(36).substr(2, 9)}`,
    operations: [
      { type: "trim", start: 0, end: 30 },
      { type: "resize", width: 1920, height: 1080 },
      { type: "compress", quality: 80 },
    ],
  })

  const response = http.post(`${BASE_URL}/api/v1/videos/process`, processingPayload, {
    headers: {
      Authorization: "Bearer test-token",
      "Content-Type": "application/json",
    },
  })

  check(response, {
    "processing status is 200 or 202": (r) => [200, 202].includes(r.status),
    "processing response time < 15s": (r) => r.timings.duration < 15000,
  }) || errorRate.add(1)

  sleep(10)
}
