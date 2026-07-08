# 🚀 **FORGEVID DEPLOYMENT GUIDE**

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** Production Deployment

---

## 📋 **TABLE OF CONTENTS**

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Serverless Deployment (Vercel)](#serverless-deployment-vercel)
4. [VPS Deployment](#vps-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Post-Deployment](#post-deployment)

---

## ✅ **PREREQUISITES**

### **Required Accounts**
- ✅ GitHub account
- ✅ Vercel account (for serverless)
- ✅ PostgreSQL database (Supabase/Neon/AWS RDS)
- ✅ Cloudinary account
- ✅ Stripe account
- ✅ OpenAI API key
- ✅ Google OAuth credentials

### **Required Knowledge**
- Basic command line
- Git
- Node.js/npm
- Environment variables

---

## 🎯 **DEPLOYMENT OPTIONS**

### **Option 1: Serverless (Recommended)**
- **Platform:** Vercel
- **Pros:** Auto-scaling, zero config, CDN
- **Cons:** Cold starts, time limits
- **Best For:** Production MVP launch

### **Option 2: VPS (Self-Hosted)**
- **Platform:** DigitalOcean, AWS EC2, Linode
- **Pros:** Full control, predictable costs
- **Cons:** Manual scaling, maintenance
- **Best For:** Enterprise, high-volume

---

## 🌐 **SERVERLESS DEPLOYMENT (VERCEL)**

### **Step 1: Prepare Repository**

```bash
# Ensure your code is committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

### **Step 2: Deploy to Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production
vercel --prod
```

### **Step 3: Configure Environment Variables**

In Vercel Dashboard → Project → Settings → Environment Variables:

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/forgevid

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key

# APIs
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...

# Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Optional
REDIS_URL=redis://...
SENTRY_DSN=https://...
```

### **Step 4: Database Setup**

```bash
# Run migrations in production
npx prisma migrate deploy

# Seed database (optional)
npx prisma db seed
```

---

## 🖥️ **VPS DEPLOYMENT**

### **Step 1: Provision Server**

**Recommended Specs:**
- 4 vCPU
- 8GB RAM
- 100GB SSD
- Ubuntu 22.04 LTS

### **Step 2: Initial Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Redis
sudo apt install redis-server

# Install Nginx
sudo apt install nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### **Step 3: Deploy Application**

```bash
# Clone repository
git clone https://github.com/krystinvestments/forgevid.git
cd forgevid

# Install dependencies
npm install

# Build application
npm run build

# Start with PM2
pm2 start npm --name "forgevid" -- start
pm2 save
pm2 startup
```

### **Step 4: Configure Nginx**

```nginx
# /etc/nginx/sites-available/forgevid
server {
    listen 80;
    server_name forgevid.com www.forgevid.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/forgevid /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 5: SSL Certificate**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d forgevid.com -d www.forgevid.com
```

---

## ⚙️ **ENVIRONMENT CONFIGURATION**

### **Required Variables**

```env
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/forgevid

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-secret>

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Optional
REDIS_URL=redis://localhost:6379
SENTRY_DSN=https://...
```

### **Generate Secrets**

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate random secrets
openssl rand -hex 32
```

---

## 🗄️ **DATABASE SETUP**

### **Production Database**

**Option 1: Supabase (Recommended)**
1. Create account at supabase.com
2. Create new project
3. Copy connection string
4. Set DATABASE_URL

**Option 2: AWS RDS**
1. Create PostgreSQL instance
2. Configure security group
3. Get connection string
4. Set DATABASE_URL

### **Run Migrations**

```bash
# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npm run db:seed
```

---

## ✅ **POST-DEPLOYMENT**

### **Health Checks**

```bash
# Check application
curl https://yourdomain.com/api/health

# Check database
npx prisma db pull

# Check services
pm2 status
```

### **Monitoring Setup**

```bash
# Install Sentry
# Already configured in code

# Setup Uptime Monitoring
# UptimeRobot, Pingdom, or similar

# Setup Error Alerts
# Via Sentry dashboard
```

### **Backup Configuration**

```bash
# Database backups
# Automated via Supabase/AWS RDS

# File backups
# Configure Cloudinary auto-backup

# Manual backup
npm run db:backup
```

---

## 🔐 **SECURITY CHECKLIST**

- [ ] All environment variables set
- [ ] HTTPS/SSL configured
- [ ] Database secured
- [ ] Firewall rules in place
- [ ] Rate limiting active
- [ ] CORS configured
- [ ] Security headers set
- [ ] Monitoring enabled
- [ ] Backups configured

---

## 📊 **DEPLOYMENT COMMANDS REFERENCE**

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Database
npm run db:migrate
npm run db:seed
npm run db:backup

# Deployment
vercel --prod           # Serverless
pm2 restart forgevid    # VPS

# Monitoring
pm2 logs forgevid
pm2 monit
```

---

**Deployment Status:** Ready for Production ✅

