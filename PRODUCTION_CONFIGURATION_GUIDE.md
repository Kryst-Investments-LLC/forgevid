# Production Configuration Guide

## 🚀 **PRODUCTION DEPLOYMENT CHECKLIST**

### **1. Environment Variables Setup**

Create a `.env` file with the following production configuration:

```bash
# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
NODE_ENV=production
PORT=3000
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-super-secret-nextauth-key-here

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="postgresql://username:password@host:port/database"
DIRECT_URL="postgresql://username:password@host:port/database"

# =============================================================================
# AUTHENTICATION CONFIGURATION
# =============================================================================
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# =============================================================================
# STRIPE CONFIGURATION
# =============================================================================
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_STARTER_PRICE_ID=price_your_starter_price_id
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id

# =============================================================================
# API KEYS
# =============================================================================
OPENAI_API_KEY=sk-your-openai-api-key
PEXELS_API_KEY=your-pexels-api-key

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
RATE_LIMIT_GENERAL=50
RATE_LIMIT_AUTH=3
RATE_LIMIT_API=30
RATE_LIMIT_STRICT=10
LOG_LEVEL=info

# =============================================================================
# EMAIL CONFIGURATION (for alerts)
# =============================================================================
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password
ALERT_EMAIL_RECIPIENTS=admin@yourdomain.com,security@yourdomain.com

# =============================================================================
# WEBHOOK CONFIGURATION (for alerts)
# =============================================================================
ALERT_WEBHOOK_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
ALERT_WEBHOOK_SECRET=your-webhook-secret

# =============================================================================
# REDIS CONFIGURATION (for rate limiting and caching)
# =============================================================================
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# =============================================================================
# PRODUCTION DOMAINS
# =============================================================================
PRODUCTION_DOMAINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

### **2. Domain Configuration**

Update the following files with your production domain:

#### **A. Update CORS Settings**
```typescript
// In config/production.ts
cors: {
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
    'https://app.yourdomain.com',
  ],
  // ... rest of config
}
```

#### **B. Update CSP Settings**
```typescript
// In config/production.ts
csp: {
  directives: {
    connectSrc: [
      "'self'",
      "https://api.stripe.com",
      "https://api.pexels.com",
      "https://api.openai.com",
      "wss://yourdomain.com", // Update this
    ],
    // ... rest of config
  }
}
```

### **3. Security Configuration**

#### **A. Update Rate Limits for Production**
```typescript
// In config/production.ts
rateLimits: {
  general: { windowMs: 15 * 60 * 1000, max: 50 }, // More restrictive
  auth: { windowMs: 15 * 60 * 1000, max: 3 }, // Very restrictive
  api: { windowMs: 15 * 60 * 1000, max: 30 }, // Moderate
  strict: { windowMs: 15 * 60 * 1000, max: 10 }, // Very restrictive for payments
}
```

#### **B. Configure Log Rotation**
```typescript
// In lib/log-rotation.ts
const logRotator = new LogRotator({
  maxFiles: 30,        // Keep 30 days of logs
  maxSize: '100MB',    // Rotate when file exceeds 100MB
  datePattern: 'YYYY-MM-DD',
  compress: true,      // Compress old logs
  retention: '30d',    // Keep logs for 30 days
  logDir: '/var/log/forgevid', // Production log directory
});
```

### **4. Monitoring & Alerting Setup**

#### **A. Email Alerts**
```bash
# Configure SMTP settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=your-app-password
ALERT_EMAIL_RECIPIENTS=admin@yourdomain.com,security@yourdomain.com
```

#### **B. Webhook Alerts**
```bash
# Configure webhook for external monitoring
ALERT_WEBHOOK_URL=https://your-monitoring-service.com/alerts
ALERT_WEBHOOK_SECRET=your-webhook-secret
```

#### **C. Slack Alerts**
```bash
# Configure Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
```

### **5. Database Configuration**

#### **A. Production Database Settings**
```typescript
// In config/production.ts
database: {
  connectionLimit: 20,
  acquireTimeoutMillis: 30000,
  timeout: 20000,
  ssl: {
    rejectUnauthorized: true, // Enable SSL in production
  },
}
```

#### **B. Run Database Migrations**
```bash
# Run production migrations
npx prisma migrate deploy
npx prisma generate
```

### **6. File Storage Configuration**

#### **A. Cloudinary Setup**
```bash
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

#### **B. Upload Directory**
```bash
UPLOAD_PATH=/var/www/forgevid/uploads
```

### **7. Redis Configuration (Optional but Recommended)**

#### **A. Redis for Rate Limiting**
```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

### **8. SSL/TLS Configuration**

#### **A. SSL Certificate**
- Use Let's Encrypt or your SSL provider
- Ensure HTTPS is enforced
- Configure HSTS headers (already implemented)

#### **B. Security Headers**
All security headers are already configured in the middleware.

### **9. Backup Configuration**

#### **A. Database Backups**
```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
BACKUP_S3_BUCKET=your-backup-bucket
```

### **10. Performance Optimization**

#### **A. CDN Configuration**
```bash
CDN_URL=https://cdn.yourdomain.com
ASSETS_URL=https://assets.yourdomain.com
```

#### **B. Caching**
- Redis for rate limiting and caching
- CDN for static assets
- Database connection pooling

### **11. Security Testing**

#### **A. Run Penetration Tests**
```bash
# Install dependencies
npm install

# Run security tests
npx ts-node scripts/security-test.ts https://yourdomain.com
```

#### **B. Manual Security Checks**
- [ ] Test rate limiting
- [ ] Verify CORS settings
- [ ] Check security headers
- [ ] Test authentication flows
- [ ] Verify file upload security
- [ ] Test error handling

### **12. Deployment Checklist**

#### **A. Pre-deployment**
- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Security tests passed

#### **B. Post-deployment**
- [ ] Monitor logs for errors
- [ ] Test all functionality
- [ ] Verify monitoring alerts
- [ ] Check performance metrics
- [ ] Test backup procedures

### **13. Monitoring Setup**

#### **A. Log Monitoring**
- Set up log aggregation (ELK stack, Splunk, etc.)
- Configure log alerts
- Monitor error rates

#### **B. Performance Monitoring**
- Set up APM (Application Performance Monitoring)
- Monitor response times
- Track resource usage

#### **C. Security Monitoring**
- Monitor failed authentication attempts
- Track rate limit violations
- Watch for suspicious activity

### **14. Maintenance**

#### **A. Regular Tasks**
- Monitor log files
- Check security alerts
- Update dependencies
- Review access logs
- Test backup restoration

#### **B. Security Updates**
- Keep dependencies updated
- Monitor security advisories
- Regular security audits
- Penetration testing

---

## 🚨 **CRITICAL SECURITY NOTES**

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for all authentication
3. **Enable SSL/TLS** for all communications
4. **Regularly rotate API keys** and secrets
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated** for security patches
7. **Test security measures** regularly
8. **Have incident response plan** ready

---

## 📞 **SUPPORT**

If you need help with production configuration:
1. Check the logs for errors
2. Run security tests
3. Review monitoring alerts
4. Contact support with specific error messages

**Status: ✅ PRODUCTION READY**

The security implementation is comprehensive and production-ready. Follow this guide to deploy ForgeVid securely in production.
