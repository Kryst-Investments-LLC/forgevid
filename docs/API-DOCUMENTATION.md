# ForgeVid API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Voice-to-Video API](#voice-to-video-api)
3. [AI Editing API](#ai-editing-api)
4. [Analytics API](#analytics-api)
5. [Templates & Media API](#templates--media-api)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Webhooks](#webhooks)

## Authentication

All API endpoints require JWT authentication via the `Authorization` header.

```http
Authorization: Bearer <your-jwt-token>
```

### Getting a Token
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

## Voice-to-Video API

### Convert Voice to Video
```http
POST /api/voice-to-video
Authorization: Bearer <token>
Content-Type: application/json

{
  "audio": "base64-encoded-audio-data",
  "options": {
    "language": "en",
    "videoStyle": "professional",
    "duration": 30,
    "quality": "1080p"
  }
}
```

**Parameters:**
- `audio` (string, required): Base64-encoded audio data
- `options` (object, optional):
  - `language` (string): Language code (default: "en")
  - `videoStyle` (string): "professional" | "casual" | "animated" | "documentary"
  - `duration` (number): Video duration in seconds (10-300)
  - `quality` (string): "720p" | "1080p" | "4k"

**Response:**
```json
{
  "success": true,
  "data": {
    "transcript": "Transcribed text from voice input",
    "videoUrl": "https://forgevid.com/videos/video_123.mp4",
    "duration": 30,
    "language": "en",
    "confidence": 0.95,
    "processingTime": 2500
  },
  "message": "Voice-to-video conversion completed successfully"
}
```

## AI Editing API

### Analyze Video
```http
POST /api/ai-editing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "analyze",
  "videoUrl": "https://example.com/video.mp4"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "duration": 120,
    "resolution": { "width": 1920, "height": 1080 },
    "frameRate": 30,
    "bitrate": 5000,
    "scenes": [
      {
        "startTime": 0,
        "endTime": 30,
        "description": "Opening scene with introduction"
      }
    ],
    "audioTracks": [
      { "language": "en", "channels": 2 }
    ],
    "quality": "high"
  }
}
```

### Generate AI Suggestions
```http
POST /api/ai-editing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "suggest",
  "videoUrl": "https://example.com/video.mp4",
  "prompt": "Make this video more engaging"
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "trim",
      "description": "Remove unnecessary intro/outro sections",
      "confidence": 0.9,
      "parameters": { "startTime": 5, "endTime": 115 }
    },
    {
      "type": "text_overlay",
      "description": "Add engaging title text",
      "confidence": 0.8,
      "parameters": {
        "textContent": "Key Points",
        "textPosition": { "x": 50, "y": 20 },
        "textStyle": { "fontSize": 24, "color": "#ffffff" }
      }
    }
  ]
}
```

### Apply Video Edit
```http
POST /api/ai-editing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "edit",
  "videoUrl": "https://example.com/video.mp4",
  "editType": "trim",
  "parameters": {
    "startTime": 10,
    "endTime": 60
  },
  "outputFormat": "mp4",
  "quality": "1080p"
}
```

**Edit Types:**
- `trim`: Trim video to specified time range
- `crop`: Crop video to specified area
- `filter`: Apply visual filters
- `transition`: Add transitions between scenes
- `text_overlay`: Add text overlays
- `audio_enhance`: Enhance audio quality
- `auto_edit`: Apply AI-suggested edits

**Response:**
```json
{
  "success": true,
  "data": {
    "editedVideoUrl": "https://forgevid.com/edited/edit_123.mp4",
    "originalVideoUrl": "https://example.com/video.mp4",
    "editType": "trim",
    "processingTime": 1500,
    "fileSize": 15728640,
    "duration": 50,
    "previewUrl": "https://forgevid.com/edited/edit_123.mp4?preview=true",
    "metadata": {
      "resolution": "1920x1080",
      "frameRate": 30,
      "bitrate": 8000,
      "codec": "h264"
    }
  }
}
```

### Batch Edit Videos
```http
POST /api/ai-editing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "batch_edit",
  "requests": [
    {
      "videoUrl": "https://example.com/video1.mp4",
      "editType": "trim",
      "parameters": { "startTime": 5, "endTime": 30 }
    },
    {
      "videoUrl": "https://example.com/video2.mp4",
      "editType": "filter",
      "parameters": { "filterType": "vintage" }
    }
  ]
}
```

### Create Thumbnail
```http
POST /api/ai-editing
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "thumbnail",
  "videoUrl": "https://example.com/video.mp4",
  "timestamp": 30
}
```

## Analytics API

### Generate Analytics Report
```http
POST /api/analytics-insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "report",
  "videoId": "video_123",
  "period": "30d"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videoId": "video_123",
    "period": {
      "start": "2024-08-08T00:00:00Z",
      "end": "2024-09-07T00:00:00Z"
    },
    "engagement": {
      "views": 5000,
      "clicks": 250,
      "watchTime": 300000,
      "completionRate": 0.65,
      "engagementRate": 0.25,
      "clickThroughRate": 0.05,
      "averageWatchTime": 78,
      "bounceRate": 0.15,
      "shares": 150,
      "likes": 800,
      "comments": 120,
      "dislikes": 20
    },
    "audience": {
      "demographics": {
        "ageGroups": {
          "18-24": 25,
          "25-34": 40,
          "35-44": 20,
          "45-54": 10,
          "55+": 5
        },
        "genders": {
          "male": 55,
          "female": 42,
          "other": 3
        },
        "locations": {
          "United States": 45,
          "United Kingdom": 15,
          "Canada": 8,
          "Other": 32
        }
      },
      "behavior": {
        "peakViewingTimes": {
          "9:00 AM": 15,
          "12:00 PM": 25,
          "6:00 PM": 35,
          "9:00 PM": 20
        },
        "dropOffPoints": [15, 30, 45, 60, 90],
        "rewatchRate": 0.12,
        "sessionDuration": 180
      }
    },
    "performance": {
      "videoQuality": {
        "resolution": "1920x1080",
        "bitrate": 5000,
        "frameRate": 30,
        "audioQuality": 0.85
      },
      "loadingMetrics": {
        "averageLoadTime": 2.5,
        "bufferingEvents": 2,
        "errorRate": 0.02
      },
      "seoMetrics": {
        "titleOptimization": 0.85,
        "descriptionQuality": 0.90,
        "tagRelevance": 0.75,
        "thumbnailEffectiveness": 0.80
      }
    },
    "aiInsights": {
      "contentAnalysis": {
        "sentiment": "positive",
        "topics": ["technology", "business", "education"],
        "keywords": ["video", "content", "engagement"],
        "emotionalTone": "professional",
        "complexity": "moderate"
      },
      "recommendations": {
        "immediate": [
          "Optimize video thumbnail for better click-through rate",
          "Add engaging intro within first 5 seconds"
        ],
        "shortTerm": [
          "Create follow-up content based on popular segments",
          "Optimize for mobile viewing experience"
        ],
        "longTerm": [
          "Develop content series based on audience preferences",
          "Implement A/B testing for thumbnails and titles"
        ]
      },
      "predictions": {
        "expectedViews": 7500,
        "engagementForecast": 0.30,
        "trendDirection": "up"
      }
    },
    "generatedAt": "2024-09-07T12:00:00Z"
  }
}
```

### Get Engagement Metrics
```http
POST /api/analytics-insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "engagement",
  "videoId": "video_123",
  "period": "7d"
}
```

### Get Audience Insights
```http
POST /api/analytics-insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "audience",
  "videoId": "video_123",
  "period": "30d"
}
```

### Compare Videos
```http
POST /api/analytics-insights
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "compare",
  "videoIds": ["video_123", "video_456", "video_789"],
  "period": "30d"
}
```

## Templates & Media API

### Search Templates
```http
POST /api/templates-media
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "search_templates",
  "filters": {
    "category": ["business", "social"],
    "duration": { "min": 30, "max": 120 },
    "aspectRatio": ["16:9", "9:16"],
    "tags": ["professional", "modern"],
    "rating": { "min": 4.0, "max": 5.0 }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "template_001",
        "name": "Professional Business Presentation",
        "description": "Clean, modern template perfect for corporate presentations",
        "category": "business",
        "duration": 60,
        "aspectRatio": "16:9",
        "resolution": "1080p",
        "tags": ["corporate", "professional", "clean"],
        "thumbnail": "https://forgevid.com/templates/thumbnails/business-001.jpg",
        "previewUrl": "https://forgevid.com/templates/previews/business-001.mp4",
        "usageCount": 1250,
        "rating": 4.8,
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "totalCount": 1,
    "categories": ["business", "social", "educational"],
    "tags": ["corporate", "professional", "modern"]
  }
}
```

### Search Media Assets
```http
POST /api/templates-media
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "search_media",
  "filters": {
    "type": ["image", "video"],
    "category": ["business", "background"],
    "license": ["free", "royalty-free"],
    "duration": { "min": 10, "max": 60 },
    "resolution": ["1080p", "4k"],
    "color": "#1e40af",
    "orientation": "landscape"
  }
}
```

### Generate AI Template
```http
POST /api/templates-media
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "generate_template",
  "prompt": "Create a modern business presentation template with blue color scheme and professional fonts"
}
```

### Upload Media Asset
```http
POST /api/templates-media
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "upload_media",
  "file": "base64-encoded-file-data",
  "metadata": {
    "title": "Business Meeting Image",
    "description": "Professional business meeting scene",
    "tags": ["business", "meeting", "professional"],
    "category": "business",
    "license": "free"
  }
}
```

### Get Popular Templates
```http
POST /api/templates-media
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "popular_templates",
  "limit": 10
}
```

### Get Recommended Templates
```http
POST /api/templates-media
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "recommended_templates",
  "limit": 10
}
```

## Error Handling

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `INVALID_TOKEN` - JWT token is invalid or expired
- `MISSING_AUTH` - Authorization header is missing
- `INVALID_REQUEST` - Request body is invalid
- `RATE_LIMITED` - Rate limit exceeded
- `FILE_TOO_LARGE` - Uploaded file exceeds size limit
- `UNSUPPORTED_FORMAT` - File format not supported
- `PROCESSING_ERROR` - Error during video processing
- `INSUFFICIENT_CREDITS` - User has insufficient credits

## Rate Limiting

Rate limits are applied per user and endpoint:

| Endpoint | Free Tier | Pro Tier | Enterprise |
|----------|-----------|----------|------------|
| Voice-to-Video | 10/hour | 100/hour | 1000/hour |
| AI Editing | 20/hour | 200/hour | 2000/hour |
| Analytics | 50/hour | 500/hour | 5000/hour |
| Templates/Media | 100/hour | 1000/hour | 10000/hour |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "You have exceeded the rate limit for this endpoint",
  "code": "RATE_LIMITED",
  "retryAfter": 3600
}
```

## Webhooks

ForgeVid can send webhooks when certain events occur:

### Webhook Events
- `video.processing.completed` - Video processing finished
- `video.processing.failed` - Video processing failed
- `template.generated` - AI template generation completed
- `analytics.report.ready` - Analytics report generated

### Webhook Payload
```json
{
  "event": "video.processing.completed",
  "timestamp": "2024-09-07T12:00:00Z",
  "data": {
    "videoId": "video_123",
    "userId": "user_456",
    "videoUrl": "https://forgevid.com/videos/video_123.mp4",
    "processingTime": 2500
  }
}
```

### Webhook Configuration
```http
POST /api/webhooks
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/forgevid",
  "events": ["video.processing.completed", "template.generated"],
  "secret": "your-webhook-secret"
}
```

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @forgevid/sdk
```

```javascript
import { ForgeVidClient } from '@forgevid/sdk';

const client = new ForgeVidClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.forgevid.com'
});

// Voice to video
const result = await client.voiceToVideo({
  audio: audioBlob,
  options: { language: 'en', quality: '1080p' }
});

// AI editing
const suggestions = await client.aiEditing.suggest({
  videoUrl: 'https://example.com/video.mp4',
  prompt: 'Make this more engaging'
});
```

### Python
```bash
pip install forgevid-sdk
```

```python
from forgevid import ForgeVidClient

client = ForgeVidClient(api_key='your-api-key')

# Voice to video
result = client.voice_to_video(
    audio_file='audio.wav',
    options={'language': 'en', 'quality': '1080p'}
)

# Analytics
report = client.analytics.get_report(
    video_id='video_123',
    period='30d'
)
```

---

**Last Updated**: September 7, 2025
**Version**: 1.0.0
**Base URL**: `https://api.forgevid.com`
