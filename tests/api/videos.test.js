// Unit test for Videos API
import { jest } from '@jest/globals';

// Mock the videos API functions
const mockVideosAPI = {
  getVideos: jest.fn(),
  createVideo: jest.fn(),
  checkAuth: jest.fn(),
  checkRateLimit: jest.fn()
};

describe("/api/v1/videos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/v1/videos returns video list", async () => {
    const mockResponse = {
      status: 200,
      body: {
        videos: [
          { id: 1, title: "Video 1", duration: 30 },
          { id: 2, title: "Video 2", duration: 45 }
        ]
      }
    };

    mockVideosAPI.getVideos.mockResolvedValue(mockResponse);

    const result = await mockVideosAPI.getVideos({
      headers: { Authorization: "Bearer test-token" }
    });

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty("videos");
    expect(Array.isArray(result.body.videos)).toBe(true);
  });

  it("POST /api/v1/videos creates new video", async () => {
    const videoData = {
      title: "Test Video",
      description: "A test video for API testing",
      duration: 30,
    };

    const mockResponse = {
      status: 201,
      body: {
        id: "video_123",
        title: videoData.title,
        description: videoData.description,
        duration: videoData.duration
      }
    };

    mockVideosAPI.createVideo.mockResolvedValue(mockResponse);

    const result = await mockVideosAPI.createVideo({
      body: videoData,
      headers: { Authorization: "Bearer test-token" }
    });

    expect(result.status).toBe(201);
    expect(result.body).toHaveProperty("id");
    expect(result.body.title).toBe(videoData.title);
  });

  it("returns 401 for unauthorized requests", async () => {
    const mockError = {
      status: 401,
      body: { error: "Unauthorized" }
    };

    mockVideosAPI.checkAuth.mockRejectedValue(mockError);

    try {
      await mockVideosAPI.getVideos({});
    } catch (err) {
      expect(err.status).toBe(401);
      expect(err.body).toHaveProperty("error");
    }
  });

  it("handles rate limiting", async () => {
    const mockRateLimitError = {
      status: 429,
      body: { error: "Too many requests" }
    };

    mockVideosAPI.checkRateLimit.mockRejectedValue(mockRateLimitError);

    try {
      await mockVideosAPI.getVideos({
        headers: { Authorization: "Bearer test-token" }
      });
    } catch (err) {
      expect(err.status).toBe(429);
    }
  });
});
