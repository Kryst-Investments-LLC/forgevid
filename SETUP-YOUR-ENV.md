# Setting Up Your .env.local File

You already have **ElevenLabs** and **OpenAI** API keys! Here's what else you can configure to unlock more features.

---

## ✅ What You Already Have

```env
# ✅ YOU HAVE THESE
OPENAI_API_KEY="sk-your-openai-key"
ELEVENLABS_API_KEY="your-elevenlabs-key"
```

These enable:
- ✅ AI script generation (GPT-4)
- ✅ Voice synthesis
- ✅ Image generation (DALL-E)
- ✅ Text-to-speech for videos

---

## 🎯 What to Add Next (Priority Order)

### **Priority 1: Database (CRITICAL for saving data)** 🔴

**Without this:** Videos, users, and settings won't persist after refresh!

#### **Option A: Supabase (Recommended - FREE)**
1. Go to https://supabase.com
2. Create a new project (free tier)
3. Get the PostgreSQL connection string
4. Add to `.env.local`:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

#### **Option B: Local PostgreSQL**
1. Install PostgreSQL locally
2. Create database: `createdb forgevid`
3. Add to `.env.local`:

```env
DATABASE_URL="postgresql://localhost:5432/forgevid"
```

**Then run migrations:**
```bash
npx prisma migrate dev
npx prisma generate
```

**What this enables:**
- ✅ Save generated videos
- ✅ User accounts
- ✅ Video history
- ✅ Settings persistence
- ✅ Analytics tracking

---

### **Priority 2: Media Storage (For uploading/storing videos)** 🟡

**Without this:** Can't upload or store video files!

#### **Option A: Cloudinary (Recommended - FREE)**
1. Go to https://cloudinary.com
2. Sign up (free tier: 25GB storage, 25GB bandwidth/month)
3. Get your credentials from dashboard
4. Add to `.env.local`:

```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="your-api-secret"
```

#### **Option B: AWS S3**
```env
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="forgevid-media"
```

**What this enables:**
- ✅ Upload videos
- ✅ Store generated content
- ✅ Serve media via CDN
- ✅ Image/video transformations

---

### **Priority 3: Authentication (For user login)** 🟡

**Without this:** No user accounts, everything is anonymous!

#### **Google OAuth (Recommended)**
1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Add to `.env.local`:

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**What this enables:**
- ✅ User login/signup
- ✅ Secure sessions
- ✅ Per-user data
- ✅ Protected routes

---

### **Priority 4: Payments (For monetization)** 🟢

**Without this:** Can't charge users or manage subscriptions!

#### **Stripe (Standard for payments)**
1. Go to https://stripe.com
2. Sign up and get API keys
3. Use **test mode** for development
4. Add to `.env.local`:

```env
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..." # Get from webhook setup
```

**What this enables:**
- ✅ Subscription management
- ✅ Payment processing
- ✅ Billing page functionality
- ✅ Plan upgrades/downgrades

---

## 📋 Complete .env.local Template

Create a file called `.env.local` in your project root:

```env
# =============================================================================
# ✅ AI SERVICES (YOU HAVE THESE)
# =============================================================================
OPENAI_API_KEY="sk-your-openai-key-here"
ELEVENLABS_API_KEY="your-elevenlabs-key-here"

# =============================================================================
# 🔴 DATABASE (PRIORITY 1 - GET THIS NEXT)
# =============================================================================
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# =============================================================================
# 🟡 MEDIA STORAGE (PRIORITY 2)
# =============================================================================
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# =============================================================================
# 🟡 AUTHENTICATION (PRIORITY 3)
# =============================================================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="generate-this-with-openssl"
NEXTAUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# =============================================================================
# 🟢 PAYMENTS (PRIORITY 4 - Optional for now)
# =============================================================================
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# =============================================================================
# 🔵 OPTIONAL (Nice to have, not required)
# =============================================================================

# Redis (for caching - improves performance)
REDIS_URL="redis://localhost:6379"

# Google Analytics (for tracking)
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"

# Company Information (for legal pages)
NEXT_PUBLIC_COMPANY_NAME="Kryst Investments LLC"
NEXT_PUBLIC_COMPANY_ADDRESS="Your Address"
NEXT_PUBLIC_DPO_EMAIL="krystinvestments@gmail.com"
NEXT_PUBLIC_PRIVACY_EMAIL="krystinvestments@gmail.com"
NEXT_PUBLIC_LEGAL_EMAIL="krystinvestments@gmail.com"
NEXT_PUBLIC_WEBSITE_URL="http://localhost:3000"

# Security
JWT_SECRET="generate-with-openssl-rand-base64-32"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Feature Flags
FEATURE_AI_GENERATION="true"
FEATURE_COLLABORATION="true"
FEATURE_ANALYTICS="true"
FEATURE_PAYMENTS="false"  # Set to true when Stripe is configured

# Environment
NODE_ENV="development"
```

---

## 🚀 Quick Setup Guide

### **Step 1: Create the file**
```bash
# In your project root
touch .env.local
# Or on Windows
New-Item .env.local -Type File
```

### **Step 2: Add your existing keys**
```env
OPENAI_API_KEY="sk-your-key"
ELEVENLABS_API_KEY="your-key"
```

### **Step 3: Add database (RECOMMENDED)**
```env
# Get from Supabase.com (free)
DATABASE_URL="postgresql://..."
```

### **Step 4: Run database setup**
```bash
npx prisma generate
npx prisma migrate dev
```

### **Step 5: Restart dev server**
```bash
npm run dev
```

---

## 🧪 Test What's Working

After adding keys, test the features:

### **With OpenAI + ElevenLabs only:**
```bash
npm run dev
```
- ✅ AI script generation works
- ✅ Voice synthesis works
- ✅ Image generation works
- ❌ Can't save videos (need database)
- ❌ Can't upload files (need storage)

### **With Database added:**
- ✅ Everything above +
- ✅ Save generated content
- ✅ User data persists
- ✅ Video history

### **With Cloudinary added:**
- ✅ Everything above +
- ✅ Upload videos
- ✅ Store media files
- ✅ Serve via CDN

### **With Auth added:**
- ✅ Everything above +
- ✅ User login/signup
- ✅ Secure access
- ✅ Per-user content

---

## 💰 Cost Breakdown

| Service | Free Tier | Cost (if paid) | Priority |
|---------|-----------|----------------|----------|
| **OpenAI** | ✅ $5 credit | ~$10-30/month | ✅ You have it |
| **ElevenLabs** | ✅ 10K chars/month | $22/month | ✅ You have it |
| **Supabase (DB)** | ✅ 500MB, 2GB transfer | $25/month | 🔴 GET THIS |
| **Cloudinary** | ✅ 25GB storage | $99/month | 🟡 Recommended |
| **Google OAuth** | ✅ Free | Free | 🟡 Recommended |
| **Stripe** | ✅ Free (% fee) | % of transactions | 🟢 Optional |

**Total for full functionality:** $0-10/month (using free tiers)

---

## ⚡ Quick Commands

### **Generate NEXTAUTH_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### **Test database connection:**
```bash
npx prisma studio
# Opens GUI at http://localhost:5555
```

### **Check what env vars are loaded:**
```bash
# In your project
node -e "console.log(process.env.OPENAI_API_KEY ? '✅ OpenAI configured' : '❌ OpenAI missing')"
```

---

## 🎯 Recommended Next Steps

1. **Right Now:** Add **DATABASE_URL** (Supabase free tier)
   - Takes 5 minutes
   - Enables saving everything
   - Critical for real usage

2. **This Week:** Add **Cloudinary** (free tier)
   - Takes 5 minutes
   - Enables file uploads
   - Important for media handling

3. **Later:** Add **Google OAuth**
   - Takes 15 minutes
   - Enables user accounts
   - Needed for production

4. **Much Later:** Add **Stripe**
   - Takes 30 minutes
   - Enables payments
   - Only when monetizing

---

## ✅ Summary

**You have:** OpenAI + ElevenLabs
**You need next:** Database (Supabase - FREE)
**Then:** Cloudinary (FREE tier)
**Total time:** ~15 minutes
**Total cost:** $0 (all free tiers!)

Your platform will then be **fully functional** for development and testing! 🚀


