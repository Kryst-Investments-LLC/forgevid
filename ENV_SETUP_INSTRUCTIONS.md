# Environment Setup Instructions for ForgeVid

## 🔑 Required API Keys Setup

To make the platform fully functional, you need to create a `.env.local` file in the root directory with the following variables:

### 1. Create `.env.local` file

Create a new file called `.env.local` in the root of your project (C:\Users\yanp0\OneDrive\Documentos\proyectos\forgevid\)

### 2. Add the following content:

```env
# ===== REQUIRED FOR VIDEO GENERATION =====

# OpenAI API Key (for AI script generation)
OPENAI_API_KEY="sk-..." # Replace with your actual OpenAI API key
OPENAI_SECRET_KEY="sk-..." # Same as above

# ElevenLabs API Key (for voice synthesis)
ELEVENLABS_API_KEY="..." # Replace with your actual ElevenLabs API key

# Pexels API Key (for stock video footage - OPTIONAL but recommended)
PEXELS_API_KEY="..." # Get free API key from https://www.pexels.com/api/

# ===== REQUIRED FOR DATABASE =====

# Supabase Database URL
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.txumhynzvmjqefzwqkrx.supabase.co:5432/postgres"
# Replace [YOUR_PASSWORD] with your actual Supabase database password

# ===== REQUIRED FOR AUTHENTICATION =====

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-change-in-production-12345"

# ===== OPTIONAL (for deployment) =====

# Cloudinary (for media storage)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Stripe (for payments)
STRIPE_PUBLIC_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Google Analytics
NEXT_PUBLIC_GA_ID="GA_MEASUREMENT_ID"

# Company Info
NEXT_PUBLIC_COMPANY_NAME="Kryst Investments LLC"
NEXT_PUBLIC_PRIVACY_EMAIL="krystinvestments@gmail.com"
NEXT_PUBLIC_WEBSITE_URL="http://localhost:3000"
```

### 3. How to get API keys:

#### OpenAI API Key:
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste it in the `.env.local` file

#### ElevenLabs API Key:
1. Go to https://elevenlabs.io/
2. Sign up/login
3. Go to Profile Settings -> API Keys
4. Copy your API key

#### Supabase Database Password:
1. Go to your Supabase project: https://supabase.com/dashboard/project/txumhynzvmjqefzwqkrx
2. Go to Settings -> Database
3. Find your database password (the one you set when creating the project)
4. Replace `[YOUR_PASSWORD]` in the DATABASE_URL

### 4. Restart the development server:

After creating the `.env.local` file, stop and restart your server:

```powershell
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## 🚀 Current Status

### ✅ What's Working:
- Dashboard access (no authentication required in development)
- All feature pages (Templates, Media Library, AI Studio, etc.)
- UI and navigation
- Feature gates bypassed for development

### ⚠️ What Needs API Keys:
- **Video Generation**: Requires OpenAI API key
- **Voice Synthesis**: Requires ElevenLabs API key
- **Database Operations**: Requires Supabase database password

### 📝 Notes:

1. **Video Generation**: Currently uses OpenAI GPT-4 to generate video scripts. The actual video is a placeholder from Google's test videos. To generate real custom videos, you would need to integrate with:
   - Runway ML (https://runwayml.com/)
   - D-ID (https://www.d-id.com/)
   - Synthesia (https://www.synthesia.io/)
   - Pictory (https://pictory.ai/)

2. **Different Videos Per Style**: The system now returns different placeholder videos based on the selected style:
   - **Cinematic**: ForBiggerBlazes.mp4
   - **Energetic**: ForBiggerEscapes.mp4
   - **Modern**: ForBiggerFun.mp4
   - **Professional**: ForBiggerJoyrides.mp4

3. **Database Errors**: If you see "Authentication failed against database server" errors, it means your DATABASE_URL password is incorrect. Double-check your Supabase password.

## 🔧 Testing the Platform

Once you've set up the `.env.local` file:

1. Go to http://localhost:3000/dashboard/ai
2. Enter a video description
3. Select a style (Modern, Cinematic, Energetic, or Professional)
4. Click "Generate Video"
5. The system will:
   - Use OpenAI to generate a video script based on your prompt
   - Return a placeholder video that matches your selected style
   - Show the generated script in the console

## 💡 Need Help?

If you encounter any issues, check:
1. `.env.local` file exists and has all required keys
2. API keys are valid and not expired
3. Server is restarted after adding `.env.local`
4. Check the terminal/console for specific error messages

