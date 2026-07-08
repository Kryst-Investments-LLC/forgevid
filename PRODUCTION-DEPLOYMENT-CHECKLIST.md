# 🚀 ForgeVid Production Deployment Checklist

## 📋 **Pre-Deployment Requirements**

### **System Requirements**
- [ ] **Node.js 18+** installed and verified
- [ ] **Docker & Docker Compose** installed
- [ ] **Git** for version control
- [ ] **PostgreSQL 15+** database (cloud or managed)
- [ ] **Redis** instance for caching and sessions
- [ ] **Domain name** and SSL certificates

### **API Keys & Credentials**
- [ ] **OpenAI API Key** for AI features
- [ ] **ElevenLabs API Key** for voice synthesis
- [ ] **Cloudinary** or **AWS S3** for media storage
- [ ] **Stripe** for payment processing
- [ ] **Google OAuth** credentials
- [ ] **Sentry** for error tracking
- [ ] **Email service** (SendGrid, AWS SES, etc.)

---

## 🔧 **Step 1: Environment Setup**

### **1.1 Clone Repository**
```bash
git clone https://github.com/krystinvestments/forgevid.git
cd forgevid
```

### **1.2 Install Dependencies**
```bash
npm install
```

### **1.3 Configure Environment Variables**
```bash
# Copy environment template
cp env.production.example .env.local

# Edit with your production values
nano .env.local
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/forgevid_prod"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"
JWT_SECRET="your-jwt-secret-here"

# OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Services
OPENAI_SECRET_KEY="your-openai-api-key"
ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# Media Storage
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Payment Processing
STRIPE_PUBLIC_KEY="your-stripe-public-key"
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"

# Redis
REDIS_URL="redis://localhost:6379"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
```

---

## 🗄️ **Step 2: Database Setup**

### **2.1 Generate Prisma Client**
```bash
npm run db:generate
```

### **2.2 Run Database Migrations**
```bash
# Deploy migrations to production
npm run db:deploy

# Seed initial data (optional)
npm run db:seed
```

### **2.3 Verify Database Connection**
```bash
# Test database connection
npm run db:studio
```

---

## 🧪 **Step 3: Testing & Validation**

### **3.1 Run Test Suite**
```bash
# Unit tests
npm run test

# Test coverage
npm run test:coverage

# Integration tests
npm run test -- --testPathPattern=integration

# End-to-end tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### **3.2 Security Audit**
```bash
# Security audit
npm run security:audit

# Fix vulnerabilities
npm run security:fix
```

---

## 🏗️ **Step 4: Build & Production Configuration**

### **4.1 Build Application**
```bash
# Production build
npm run build

# Analyze bundle size
npm run build:analyze
```

### **4.2 Review Production Configuration**

**Check `next.config.mjs`:**
- [ ] Output mode set to 'standalone'
- [ ] Image optimization enabled
- [ ] Security headers configured
- [ ] CDN rewrites configured

**Check `Dockerfile`:**
- [ ] Multi-stage build optimized
- [ ] Non-root user configured
- [ ] Health check enabled
- [ ] Security scanning passed

**Check `nginx.conf`:**
- [ ] SSL configuration
- [ ] Security headers
- [ ] Rate limiting
- [ ] Gzip compression

---

## 🐳 **Step 5: Docker Deployment**

### **5.1 Build Docker Image**
```bash
# Build production image
docker build -t forgevid:latest .

# Tag for registry
docker tag forgevid:latest your-registry/forgevid:latest
```

### **5.2 Single Container Deployment**
```bash
# Run with environment file
docker run -d \
  --name forgevid \
  --env-file .env.local \
  -p 3000:3000 \
  --restart unless-stopped \
  forgevid:latest
```

### **5.3 Multi-Service Deployment**
```bash
# Use Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Check services
docker-compose -f docker-compose.prod.yml ps
```

---

## 📊 **Step 6: Monitoring & Alerts Setup**

### **6.1 Configure Sentry**
- [ ] Create Sentry project
- [ ] Add DSN to environment variables
- [ ] Verify error tracking works
- [ ] Set up alert rules

### **6.2 Set Up Logging**
```bash
# Check logs
docker logs forgevid

# Follow logs
docker logs -f forgevid
```

### **6.3 Health Monitoring**
```bash
# Test health endpoint
curl https://your-domain.com/api/monitoring/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-09T...",
  "health": { ... },
  "performance": { ... }
}
```

---

## 🌐 **Step 7: CDN & Asset Configuration**

### **7.1 Configure Cloudinary**
- [ ] Set up Cloudinary account
- [ ] Configure upload presets
- [ ] Set up image transformations
- [ ] Test image upload

### **7.2 CDN Setup**
- [ ] Configure CloudFront or similar
- [ ] Set up custom domain
- [ ] Enable compression
- [ ] Configure caching rules

---

## ✅ **Step 8: Deployment Verification**

### **8.1 Functional Testing**
- [ ] **Authentication**: Login/logout works
- [ ] **Video Creation**: Can create and edit videos
- [ ] **AI Features**: AI generation works
- [ ] **Collaboration**: Real-time features work
- [ ] **Payments**: Stripe integration works
- [ ] **Admin Panel**: Admin functions work
- [ ] **File Upload**: Media upload works

### **8.2 Performance Testing**
```bash
# Load testing
npm run test -- --testPathPattern=load

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/health
```

### **8.3 Security Testing**
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Rate limiting works
- [ ] Input validation works
- [ ] Authentication required for protected routes

---

## 🔒 **Step 9: Security Hardening**

### **9.1 Enable Security Features**
- [ ] Rate limiting active
- [ ] Audit logging enabled
- [ ] Security headers configured
- [ ] Input sanitization active
- [ ] CSRF protection enabled

### **9.2 Compliance Setup**
- [ ] GDPR compliance active
- [ ] Data retention policies set
- [ ] Audit trail configured
- [ ] Backup procedures documented

---

## 📈 **Step 10: Scaling & Performance**

### **10.1 Auto-Scaling Setup**
```bash
# Using PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### **10.2 Load Balancer Configuration**
- [ ] Configure load balancer
- [ ] Set up health checks
- [ ] Configure sticky sessions
- [ ] Set up SSL termination

---

## 💾 **Step 11: Backup & Disaster Recovery**

### **11.1 Database Backup**
```bash
# Automated backup script
#!/bin/bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### **11.2 Asset Backup**
- [ ] Configure S3/Cloudinary backup
- [ ] Set up cross-region replication
- [ ] Test restore procedures

### **11.3 Disaster Recovery Plan**
- [ ] Document recovery procedures
- [ ] Test backup restoration
- [ ] Set up monitoring alerts
- [ ] Document incident response

---

## 🚀 **Step 12: Go Live**

### **12.1 Pre-Launch Checklist**
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Documentation updated

### **12.2 Launch Day**
- [ ] Deploy to production
- [ ] Monitor logs and metrics
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Check performance metrics

### **12.3 Post-Launch Monitoring**
- [ ] Monitor uptime (target: 99.9%)
- [ ] Track error rates
- [ ] Monitor response times
- [ ] Watch resource usage
- [ ] Monitor user feedback

---

## 📞 **Support & Maintenance**

### **Daily Tasks**
- [ ] Check system health
- [ ] Monitor error logs
- [ ] Review performance metrics
- [ ] Check backup status

### **Weekly Tasks**
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Performance optimization
- [ ] User feedback review

### **Monthly Tasks**
- [ ] Security audit
- [ ] Performance review
- [ ] Backup testing
- [ ] Capacity planning

---

## 🎯 **Success Metrics**

### **Performance Targets**
- [ ] **Uptime**: > 99.9%
- [ ] **Response Time**: < 200ms average
- [ ] **Error Rate**: < 0.1%
- [ ] **Cache Hit Rate**: > 90%
- [ ] **Database Response**: < 50ms

### **Security Targets**
- [ ] **Zero Security Incidents**
- [ ] **All Vulnerabilities Patched**
- [ ] **Compliance Requirements Met**
- [ ] **Audit Trail Complete**

---

## 🆘 **Emergency Procedures**

### **Incident Response**
1. **Assess Impact**: Determine severity
2. **Contain Issue**: Isolate affected systems
3. **Communicate**: Notify stakeholders
4. **Resolve**: Fix the issue
5. **Document**: Record lessons learned

### **Rollback Procedure**
```bash
# Rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.backup.yml up -d
```

---

## ✅ **Final Checklist**

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] All tests passing
- [ ] Security audit passed
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Documentation complete
- [ ] Team trained on procedures
- [ ] Go-live plan approved
- [ ] Support procedures in place

---

## 🎉 **Congratulations!**

Your ForgeVid platform is now ready for production deployment! This checklist ensures a smooth, secure, and scalable launch.

**Remember**: Always test in a staging environment before deploying to production.

---

**Need Help?** Check the troubleshooting guide in `/docs/TROUBLESHOOTING.md` or contact support.







