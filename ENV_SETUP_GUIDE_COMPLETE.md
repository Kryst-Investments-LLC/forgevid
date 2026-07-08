# 🔧 **COMPLETE ENVIRONMENT SETUP GUIDE**

## ✅ **Step-by-Step Setup for All Required Services**

---

## 🔴 **CRITICAL - Must Have**

### **1. Database (Supabase) - Already Set Up** ✅

Your database is already connected and working!

```bash
# Database URL format
DATABASE_URL="postgresql://postgres:[password]@db.txumhynzvmjqefzwqkrx.supabase.co:5432/postgres"
```

**Status:** ✅ Already configured

---

### **2. OpenAI API Key** 🔴 **REQUIRED**

**Why:** Core video generation depends on this

**Steps:**
1. Go to https://platform.openai.com/api-keys
2. Sign up/login
3. Create new API key
4. Add to `.env.local`:
   ```bash
   OPENAI_API_KEY="sk-..."
   ```

**Cost:** ~$0.03-0.10 per video

---

### **3. NextAuth Secret** 🔴 **REQUIRED**

**Generate:**
```bash
openssl rand -base64 32
```

**Add to `.env.local`:**
```bash
NEXTAUTH_SECRET="generated-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 🟠 **HIGH PRIORITY - Needed for Full Functionality**

### **4. Google OAuth** 🟠

**Why:** Allows users to sign in with Google

**Steps:**
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Secret

**Add to `.env.local`:**
```bash
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxxxx"
```

---

### **5. Stripe Setup** 🟠 **REQUIRED FOR PAYMENTS**

**Why:** Process payments for subscriptions

**Steps:**

**A. Get Stripe Keys:**
1. Go to https://dashboard.stripe.com/
2. Sign up/login
3. Go to "Developers" → "API keys"
4. Copy Publishable key and Secret key

**B. Create Products/Prices:**
1. Go to "Products" → "Add product"
2. Create 3 products:
   - **Starter Plan**: $29/month
   - **Pro Plan**: $99/month
   - **Enterprise Plan**: $299/month
3. Copy the Price IDs (they start with `price_...`)

**C. Set up Webhook:**
1. Go to "Developers" → "Webhooks"
2. Click "Add endpoint"
3. Endpoint URL: `http://localhost:3000/api/webhooks/stripe` (use ngrok for testing)
4. Select events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
5. Copy the webhook signing secret

**Add to `.env.local`:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."
```

---

### **6. Cloudinary Setup** 🟠

**Why:** Store uploaded videos and generated content

**Steps:**
1. Go to https://cloudinary.com/users/register_free
2. Sign up for free account
3. Go to Dashboard
4. Copy Cloud Name, API Key, API Secret

**Add to `.env.local`:**
```bash
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="123456789"
CLOUDINARY_API_SECRET="your-secret-here"
```

---

## 🟡 **OPTIONAL - Enhance Functionality**

### **7. Pexels API** 🟡

**Why:** Stock footage for video generation (has free tier)

**Steps:**
1. Go to https://www.pexels.com/api/
2. Sign up
3. Get API key

**Add to `.env.local`:**
```bash
PEXELS_API_KEY="your-pexels-key"
```

---

### **8. Sentry (Error Monitoring)** 🟡

**Why:** Track errors in production

**Steps:**
1. Go to https://sentry.io/
2. Create project
3. Select "Next.js"
4. Copy DSN

**Add to `.env.local`:**
```bash
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

---

## 📋 **Complete .env.local Template**

Create a file named `.env.local` in your project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OpenAI
OPENAI_API_KEY="sk-your-key-here"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-key"
CLOUDINARY_API_SECRET="your-secret"

# Optional
PEXELS_API_KEY="your-pexels-key"
SENTRY_DSN="your-sentry-dsn"
```

---

## ✅ **Verification Checklist**

After setup, verify:

- [ ] Database connection working (`npm run dev` should connect)
- [ ] OpenAI working (test video generation)
- [ ] Google OAuth working (test sign-in)
- [ ] Stripe checkout working (test subscription)
- [ ] Cloudinary upload working (test video upload)
- [ ] Webhooks receiving events

---

## 🚀 **Quick Start (TLDR)**

1. ✅ Database: Already set up
2. 🔴 Get OpenAI key: https://platform.openai.com/api-keys
3. 🔴 Generate NEXTAUTH_SECRET: `openssl rand -base64 32`
4. 🟠 Get Google OAuth: https://console.cloud.google.com/
5. 🟠 Get Stripe keys: https://dashboard.stripe.com/
6. 🟠 Get Cloudinary: https://cloudinary.com/
7. 🟡 (Optional) Get Pexels: https://www.pexels.com/api/

**Time to complete:** 30-60 minutes

---

## 📞 **Need Help?**

- Database issues: Check Supabase dashboard
- OpenAI: Check platform.openai.com for API usage
- Stripe: Check dashboard.stripe.com for webhook events
- Cloudinary: Check cloudinary.com/console for uploads

---

**Next:** Once all environment variables are set, proceed to end-to-end testing!


