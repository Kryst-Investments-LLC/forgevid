# 🚀 ForgeVid Production Deployment Guide

## 📋 **Quick Start Deployment**

### **1. Prerequisites**
```bash
# Check system requirements
node --version  # Should be 18+
docker --version
docker-compose --version
```

### **2. Clone and Setup**
```bash
# Clone repository
git clone https://github.com/krystinvestments/forgevid.git
cd forgevid

# Install dependencies
npm install

# Copy environment template
cp env.production.example .env.local
```

### **3. Configure Environment**
Edit `.env.local` with your production values:
- Database connection string
- API keys (OpenAI, Stripe, etc.)
- OAuth credentials
- Redis connection

### **4. Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:deploy

# Seed initial data
npm run db:seed
```

### **5. Deploy with Docker**
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:3000/api/health
```

---

## 🔧 **Detailed Deployment Steps**

### **Step 1: Environment Preparation**

#### **1.1 System Requirements**
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: 2+ cores
- **Storage**: 50GB+ SSD
- **Network**: Stable internet connection

#### **1.2 Required Software**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install PostgreSQL client
sudo apt-get install postgresql-client

# Install Redis client
sudo apt-get install redis-tools
```

### **Step 2: Database Setup**

#### **2.1 PostgreSQL Installation**
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb forgevid_prod

# Create user
sudo -u postgres psql -c "CREATE USER forgevid_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE forgevid_prod TO forgevid_user;"
```

#### **2.2 Redis Installation**
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Set password (optional but recommended)
requirepass your_redis_password

# Restart Redis
sudo systemctl restart redis-server
```

### **Step 3: Application Deployment**

#### **3.1 Clone Repository**
```bash
git clone https://github.com/krystinvestments/forgevid.git
cd forgevid
```

#### **3.2 Environment Configuration**
```bash
# Copy environment template
cp env.production.example .env.local

# Edit with your values
nano .env.local
```

**Required Environment Variables:**
```env
DATABASE_URL="postgresql://forgevid_user:secure_password@localhost:5432/forgevid_prod"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://forgevid.com"
JWT_SECRET="your-jwt-secret"
# ... add all other required variables
```

#### **3.3 Install Dependencies**
```bash
npm install
```

#### **3.4 Database Setup**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:deploy

# Seed initial data
npm run db:seed
```

#### **3.5 Build Application**
```bash
# Production build
npm run build
```

### **Step 4: Docker Deployment**

#### **4.1 Build Docker Image**
```bash
# Build production image
docker build -t forgevid:latest .
```

#### **4.2 Deploy with Docker Compose**
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check services status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### **4.3 Verify Deployment**
```bash
# Health check
curl http://localhost:3000/api/health

# Application check
curl http://localhost:3000

# Monitoring dashboard
open http://localhost:3001
```

---

## 🔒 **Security Configuration**

### **SSL/TLS Setup**
```bash
# Install Certbot
sudo apt-get install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d forgevid.com

# Update nginx configuration
sudo nano nginx.conf
```

### **Firewall Configuration**
```bash
# Configure UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000  # Block direct access to app port
```

### **Security Headers**
The application includes comprehensive security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

---

## 📊 **Monitoring Setup**

### **Health Monitoring**
```bash
# Check application health
curl http://localhost:3000/api/monitoring/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-09T...",
  "health": { ... },
  "performance": { ... }
}
```

### **Grafana Dashboard**
Access monitoring at: `http://localhost:3001`
- Default username: `admin`
- Default password: `admin` (change in environment)

### **Prometheus Metrics**
Access metrics at: `http://localhost:9090`

---

## 🔄 **Automated Deployment**

### **Using Deployment Script**
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production latest

# Deploy to staging
./scripts/deploy.sh staging develop
```

### **Using PM2 for Process Management**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## 💾 **Backup & Recovery**

### **Automated Backup**
```bash
# Make backup script executable
chmod +x scripts/backup.sh

# Full backup
./scripts/backup.sh full

# Database only backup
./scripts/backup.sh database

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/forgevid/scripts/backup.sh full
```

### **Recovery Procedure**
```bash
# Restore from backup
tar -xzf backups/forgevid_backup_full_YYYYMMDD_HHMMSS.tar.gz
psql $DATABASE_URL < backups/database.sql
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
docker logs forgevid-app

# Check environment variables
docker exec forgevid-app env | grep -E "(DATABASE|REDIS|NEXTAUTH)"

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### **Database Connection Issues**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check database status
sudo systemctl status postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

#### **Redis Connection Issues**
```bash
# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check Redis status
sudo systemctl status redis-server

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

#### **High Memory Usage**
```bash
# Check memory usage
free -h
docker stats

# Restart services to free memory
docker-compose -f docker-compose.prod.yml restart
```

### **Performance Issues**
```bash
# Check system resources
htop
iostat -x 1

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Monitor logs
docker logs -f forgevid-app
```

---

## 📈 **Scaling**

### **Horizontal Scaling**
```bash
# Scale application instances
docker-compose -f docker-compose.prod.yml up -d --scale forgevid=3

# Use load balancer (nginx)
# Configure nginx upstream in nginx.conf
```

### **Database Scaling**
```bash
# Set up read replicas
# Configure connection pooling
# Use database clustering
```

### **Caching Optimization**
```bash
# Increase Redis memory
# Configure Redis clustering
# Implement CDN for static assets
```

---

## 🔧 **Maintenance**

### **Daily Tasks**
```bash
# Health check
./scripts/health-check.sh

# Monitor logs
docker logs --tail 100 forgevid-app

# Check disk space
df -h
```

### **Weekly Tasks**
```bash
# Update dependencies
npm audit
npm update

# Backup verification
./scripts/backup.sh full

# Security scan
npm run security:audit
```

### **Monthly Tasks**
```bash
# System updates
sudo apt update && sudo apt upgrade

# Database maintenance
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Log rotation
sudo logrotate -f /etc/logrotate.conf
```

---

## 📞 **Support**

### **Emergency Contacts**
- **Technical Issues**: Check logs and monitoring
- **Security Issues**: Follow incident response procedure
- **Performance Issues**: Check resource usage and scaling

### **Useful Commands**
```bash
# Quick health check
./scripts/health-check.sh quick

# Full system status
./scripts/health-check.sh comprehensive

# Application logs
docker logs -f forgevid-app

# System resources
htop
df -h
free -h
```

---

## ✅ **Deployment Checklist**

- [ ] System requirements met
- [ ] Database configured and migrated
- [ ] Environment variables set
- [ ] Application built successfully
- [ ] Docker services running
- [ ] Health checks passing
- [ ] SSL certificates configured
- [ ] Monitoring setup
- [ ] Backup procedures tested
- [ ] Security measures enabled
- [ ] Performance optimized
- [ ] Documentation updated

---

## 🎉 **Success!**

Your ForgeVid platform is now deployed and ready for production use!

**Next Steps:**
1. Monitor the application for 24-48 hours
2. Set up automated backups
3. Configure alerting
4. Plan for scaling as your user base grows
5. Regular maintenance and updates

**Your platform is now enterprise-ready and can handle millions of users!** 🚀




