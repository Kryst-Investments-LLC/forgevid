// Production Configuration
export const productionConfig = {
  // CORS Configuration
  cors: {
    origin: process.env.PRODUCTION_DOMAINS?.split(',') || [
      'https://forgevid.com',
      'https://www.forgevid.com',
      'https://app.forgevid.com',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // Security Configuration
  security: {
    // Rate limiting (more restrictive in production)
    rateLimits: {
      general: { windowMs: 15 * 60 * 1000, max: 50 }, // 50 req/15min
      auth: { windowMs: 15 * 60 * 1000, max: 3 }, // 3 auth attempts/15min
      api: { windowMs: 15 * 60 * 1000, max: 30 }, // 30 API req/15min
      strict: { windowMs: 15 * 60 * 1000, max: 10 }, // 10 req/15min for payments
    },

    // Content Security Policy
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:", "https://res.cloudinary.com"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://api.pexels.com",
          "https://api.openai.com",
          "wss://forgevid.com",
        ],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },

    // Security headers
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    },
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: 30, // Keep 30 days of logs
    maxSize: '100MB', // Max file size before rotation
    datePattern: 'YYYY-MM-DD',
    compress: true, // Compress old logs
    retention: '30d', // Keep logs for 30 days
  },

  // Monitoring Configuration
  monitoring: {
    // Security event thresholds
    thresholds: {
      rateLimitViolations: 10, // Alert if >10 rate limit violations per hour
      suspiciousRequests: 5, // Alert if >5 suspicious requests per hour
      errorRate: 0.05, // Alert if error rate >5%
      responseTime: 2000, // Alert if response time >2s
    },

    // Alert channels
    alerts: {
      email: {
        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
        recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        },
      },
      webhook: {
        enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
        url: process.env.ALERT_WEBHOOK_URL,
        secret: process.env.ALERT_WEBHOOK_SECRET,
      },
      slack: {
        enabled: process.env.ALERT_SLACK_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#alerts',
      },
    },
  },

  // Database Configuration
  database: {
    connectionLimit: 20,
    acquireTimeoutMillis: 30000,
    timeout: 20000,
    ssl: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  },

  // Redis Configuration (for rate limiting and caching)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  },

  // File Upload Configuration
  uploads: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ],
    storagePath: process.env.UPLOAD_PATH || '/tmp/uploads',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  },

  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    circuitBreaker: {
      threshold: 5, // Open circuit after 5 failures
      timeout: 60000, // Wait 1 minute before retry
    },
  },
};

export default productionConfig;
