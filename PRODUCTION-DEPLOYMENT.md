# 🚀 ForgeVid Production Deployment Guide

This guide covers deploying ForgeVid to production with enterprise-grade features including Redis, monitoring, rate limiting, video processing, and cloud storage.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │   Collaboration │
│     (Nginx)     │◄──►│   (Next.js)     │◄──►│    Server       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Redis Cache   │    │   PostgreSQL    │    │   Cloud Storage │
│   (Real-time)   │    │   (Database)    │    │   (S3/Cloudinary)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Video Processing│
│ (Prometheus +   │    │    (FFmpeg)     │
│   Grafana)      │    └─────────────────┘
└─────────────────┘
```

## 📋 Prerequisites

- Docker & Docker Compose
- Domain name with SSL certificate
- AWS S3 bucket (or Cloudinary account)
- Redis instance (or use Docker)
- PostgreSQL database
- FFmpeg installed on server

## 🔧 Environment Setup

### 1. Copy Environment Variables

```bash
cp env.production.example .env.local
```

### 2. Configure Environment Variables

Update `.env.local` with your production values:

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=ForgeVid AI

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/forgevid_prod

# Redis
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT & Auth
JWT_SECRET=your-super-secure-jwt-secret-key
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret

# Cloud Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=forgevid-media

# Video Processing
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## 🐳 Docker Deployment

### 1. Build and Deploy

```bash
# Build the application
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 2. Initialize Database

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Seed initial data
docker-compose -f docker-compose.prod.yml exec app npm run db:seed
```

### 3. SSL Certificate Setup

```bash
# Create SSL directory
mkdir -p ssl

# Copy your SSL certificates
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# Update nginx.conf with your domain
sed -i 's/your-domain.com/your-actual-domain.com/g' nginx.conf
```

## 🔒 Security Configuration

### 1. Rate Limiting

The application includes comprehensive rate limiting:

- **API Endpoints**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Collaboration**: 30 requests per minute
- **Video Processing**: 10 requests per hour
- **File Uploads**: 20 requests per hour

### 2. Security Headers

Nginx is configured with security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

### 3. CORS Configuration

```env
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true
```

## 📊 Monitoring & Logging

### 1. Prometheus Metrics

Access Prometheus at: `http://your-domain.com:9090`

Key metrics tracked:
- Request rate and latency
- Error rates
- Video processing metrics
- Collaboration room activity
- System resource usage

### 2. Grafana Dashboards

Access Grafana at: `http://your-domain.com:3001`
- Username: `admin`
- Password: `admin` (change in production)

Pre-configured dashboards:
- Application Performance
- Video Processing Metrics
- Collaboration Analytics
- System Health

### 3. Log Management

Logs are stored in:
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Nginx logs: `/var/log/nginx/`

## 🎬 Video Processing

### 1. FFmpeg Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Docker (already included)
# FFmpeg is pre-installed in the Docker image
```

### 2. Video Processing Features

- **Format Conversion**: MP4, WebM, MOV, AVI
- **Quality Compression**: Low, Medium, High, Ultra
- **Resolution Resizing**: Custom dimensions
- **Thumbnail Generation**: From any video frame
- **Audio Extraction**: MP3, WAV, AAC
- **Watermarking**: Add logos/text overlays
- **Slideshow Creation**: From image sequences

### 3. API Usage

```bash
# Convert video
curl -X POST https://your-domain.com/api/video/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@video.mp4" \
  -F "operation=convert" \
  -F "options={\"quality\":\"high\",\"format\":\"mp4\"}"

# Create thumbnail
curl -X POST https://your-domain.com/api/video/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@video.mp4" \
  -F "operation=thumbnail" \
  -F "options={\"timeOffset\":10}"
```

## ☁️ Cloud Storage

### 1. AWS S3 Setup

```bash
# Create S3 bucket
aws s3 mb s3://forgevid-media

# Set bucket policy for public read
aws s3api put-bucket-policy --bucket forgevid-media --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::forgevid-media/*"
  }]
}'
```

### 2. Cloudinary Setup (Alternative)

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 🔄 Real-Time Collaboration

### 1. Redis Configuration

```bash
# Connect to Redis
redis-cli -h your-redis-host.com -p 6379 -a your-password

# Monitor Redis
redis-cli -h your-redis-host.com -p 6379 -a your-password monitor
```

### 2. Collaboration Features

- **Live Editing**: Real-time video editing
- **User Presence**: See who's online
- **Live Cursors**: Track user interactions
- **Chat System**: Real-time messaging
- **Video Sync**: Synchronized playback
- **AI Suggestions**: Smart editing recommendations

## 📈 Performance Optimization

### 1. Caching Strategy

- **Redis**: Session data, collaboration state
- **CDN**: Static assets, processed videos
- **Browser**: Aggressive caching for static content

### 2. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_collaboration_room_id ON collaboration_rooms(room_id);
CREATE INDEX idx_edits_timestamp ON edits(timestamp);
```

### 3. Video Optimization

- **Compression**: Automatic quality optimization
- **Format Selection**: Best format for target platform
- **Progressive Loading**: Stream large videos
- **Thumbnail Generation**: Fast preview loading

## 🚨 Monitoring & Alerts

### 1. Health Checks

```bash
# Application health
curl https://your-domain.com/api/health

# Collaboration server health
curl https://your-domain.com:3001/health
```

### 2. Alert Configuration

Set up alerts for:
- High error rates (>5%)
- High response times (>2s)
- Low disk space (<10%)
- High memory usage (>80%)
- Video processing failures

### 3. Log Analysis

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs app

# View collaboration logs
docker-compose -f docker-compose.prod.yml logs collaboration

# View nginx logs
docker-compose -f docker-compose.prod.yml logs nginx
```

## 🔧 Maintenance

### 1. Database Backups

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U forgevid forgevid_prod > backup.sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U forgevid forgevid_prod < backup.sql
```

### 2. Redis Backups

```bash
# Create Redis backup
docker-compose -f docker-compose.prod.yml exec redis redis-cli BGSAVE

# Copy backup file
docker cp $(docker-compose -f docker-compose.prod.yml ps -q redis):/data/dump.rdb ./redis-backup.rdb
```

### 3. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/forgevid

# Add configuration
/var/log/forgevid/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
```

## 🚀 Scaling

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  app:
    deploy:
      replicas: 3
  collaboration:
    deploy:
      replicas: 2
```

### 2. Load Balancing

```nginx
# nginx.conf - Load balancing
upstream app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

### 3. Redis Cluster

```yaml
# redis-cluster.yml
services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes
```

## 🎉 Success!

Your ForgeVid platform is now production-ready with:

✅ **Enterprise-Grade Infrastructure**
- Redis for real-time data
- PostgreSQL for persistent storage
- Nginx for load balancing and SSL

✅ **Advanced Features**
- Real-time collaboration
- Video processing with FFmpeg
- Cloud storage integration
- Comprehensive monitoring

✅ **Security & Performance**
- Rate limiting and security headers
- Performance monitoring
- Error tracking and logging
- Scalable architecture

✅ **Production Monitoring**
- Prometheus metrics
- Grafana dashboards
- Health checks
- Alert systems

The platform is now ready to handle enterprise workloads with real-time collaboration, video processing, and cloud storage capabilities! 🚀
