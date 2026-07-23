# ─────────────────────────────────────────────────────────────────────────────
# ForgeVid — Railway environment variables (XPRIZE launch)
# Set these in Railway → forgevid service → Variables. Values marked (.env.local)
# are copied verbatim from your local C:\Users\yanp0\dev\forgevid\.env.local.
# NEVER commit real values — this file is a NAMES-ONLY template.
# ─────────────────────────────────────────────────────────────────────────────

# --- Runtime ---
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
# Force the container's system ffmpeg (apk). Without this the resolver may pick
# ffmpeg-static (glibc) which can't exec on Alpine musl → degraded/hard-cut renders.
FFMPEG_PATH=/usr/bin/ffmpeg

# --- Auth / crypto (generate fresh 32+ char secrets) ---
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
NEXTAUTH_URL=https://forgevid.com     # use the Railway URL first, switch to forgevid.com after DNS
NEXTAUTH_SECRET=
JWT_SECRET=
ENCRYPTION_KEY=

# --- Database (Neon Postgres — create a SEPARATE db from Atiende) ---
# Use the direct/unpooled Neon URL. Migrations run via `prisma migrate deploy`.
DATABASE_URL=

# --- AI providers (.env.local) ---
OPENAI_API_KEY=
# Gemini as the text-LLM (Build with Gemini). LLM_PROVIDER=gemini routes all
# script/hook/chat/storyboard completions to Gemini via its OpenAI-compatible
# endpoint. Keep OPENAI_API_KEY too: Whisper transcription, DALL-E images and
# moderation have no Gemini equivalent and stay on OpenAI.
GEMINI_API_KEY=
LLM_PROVIDER=gemini
ELEVENLABS_API_KEY=
PEXELS_API_KEY=
# Optional — avatars (Pro feature). Omit for launch if unused.
HEYGEN_API_KEY=

# --- Storage (CRITICAL — without Cloudinary, rendered videos vanish on restart) ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# --- Stripe (from scripts/setup-stripe-products.js output) ---
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_ENTERPRISE_PRICE_ID=
# One-time purchased-credit packs (lib/credits.ts CreditLedger pool — never
# expire, consumed only once the monthly plan allowance runs out).
# TOPUP10/TOPUP25 are gated to active paid subscribers server-side.
STRIPE_SINGLE_PRICE_ID=
STRIPE_TOPUP10_PRICE_ID=
STRIPE_TOPUP25_PRICE_ID=

# --- Redis (OPTIONAL) ---
# Leave UNSET for launch → generation runs inline (fine at low volume).
# Add a Railway Redis service + this URL to move rendering onto the worker.
# REDIS_URL=
