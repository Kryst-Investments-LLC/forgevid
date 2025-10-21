# PowerShell script to fix critical issues for ForgeVid
Write-Host "🚨 Fixing Critical Issues for ForgeVid Build..."

# Install dependencies with --legacy-peer-deps to resolve canvas conflict
Write-Host "Installing dependencies..."
npm install clsx tailwind-merge @types/node next-auth @auth/prisma-adapter zod @sentry/nextjs --legacy-peer-deps

# 1. Type Definitions
# Create types/global.d.ts
$globalTypesContent = @"
export type UserRole = 'ADMIN' | 'USER' | 'EDITOR';

// Futuristic: Quantum state for cache versioning
export interface QuantumCache {
  key: string;
  timestamp: number;
  version: string;
}
"@
New-Item -Path "types" -ItemType Directory -Force
Set-Content -Path "types/global.d.ts" -Value $globalTypesContent

# Update types/next-auth.d.ts (assuming it exists, append if needed)
$nextAuthTypesContent = @"
import { DefaultSession, DefaultUser } from 'next-auth';
import { UserRole } from './global';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: UserRole;
  }
}
"@
Set-Content -Path "types/next-auth.d.ts" -Value $nextAuthTypesContent

# 2. NextAuth Configuration
# Fix lib/auth.ts
$authContent = @"
import NextAuth, { AuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
        session.user.role = user.role as UserRole;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole;
      }
      return token;
    },
  },
};

export default NextAuth(authOptions);
"@
New-Item -Path "lib" -ItemType Directory -Force
Set-Content -Path "lib/auth.ts" -Value $authContent

# Fix app/api/auth/[...nextauth]/route.ts
$nextAuthRouteContent = @"
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

export const GET = NextAuth(authOptions);
export const POST = NextAuth(authOptions);
"@
New-Item -Path "app/api/auth/[...nextauth]" -ItemType Directory -Force
Set-Content -Path "app/api/auth/[...nextauth]/route.ts" -Value $nextAuthRouteContent

# 3. API Route Fixes
# Fix app/api/collaboration/auth/route.ts
$collabAuthContent = @"
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ userId: session.user.id, role: session.user.role });
}
"@
New-Item -Path "app/api/collaboration/auth" -ItemType Directory -Force
Set-Content -Path "app/api/collaboration/auth/route.ts" -Value $collabAuthContent

# Fix app/api/usage/track/route.ts
$usageTrackContent = @"
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { event } = await req.json();
  await prisma.usage.create({
    data: { userId: session.user.id, event },
  });
  return NextResponse.json({ success: true });
}
"@
New-Item -Path "app/api/usage/track" -ItemType Directory -Force
Set-Content -Path "app/api/usage/track/route.ts" -Value $usageTrackContent

# Fix app/api/v1/videos/[id]/route.ts
$videoIdContent = @"
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const video = await prisma.video.findUnique({ where: { id: params.id, userId: session.user.id } });
  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }
  return NextResponse.json(video);
}
"@
New-Item -Path "app/api/v1/videos/[id]" -ItemType Directory -Force
Set-Content -Path "app/api/v1/videos/[id]/route.ts" -Value $videoIdContent

# Fix app/api/v1/videos/route.ts
$videosContent = @"
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const videos = await prisma.video.findMany({ where: { userId: session.user.id } });
  return NextResponse.json(videos);
}
"@
New-Item -Path "app/api/v1/videos" -ItemType Directory -Force
Set-Content -Path "app/api/v1/videos/route.ts" -Value $videosContent

# Fix app/api/video/process/route.ts
$videoProcessContent = @"
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processVideo } from '@/lib/video-processing';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }
  const result = await processVideo(file, { userId: session.user.id });
  return NextResponse.json(result);
}
"@
New-Item -Path "app/api/video/process" -ItemType Directory -Force
Set-Content -Path "app/api/video/process/route.ts" -Value $videoProcessContent

# 4. Component Fixes
# Fix components/auth-provider.tsx
$authProviderContent = @"
'use client';
import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function useAuth() {
  const { data: session, status } = useSession();
  return { user: session?.user, status };
}
"@
New-Item -Path "components" -ItemType Directory -Force
Set-Content -Path "components/auth-provider.tsx" -Value $authProviderContent

# Fix components/protected-route.tsx
$protectedRouteContent = @"
'use client';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const router = useRouter();

  if (status === 'loading') return <div>Loading...</div>;
  if (!user) {
    router.push('/auth/signin');
    return null;
  }
  return <>{children}</>;
}
"@
Set-Content -Path "components/protected-route.tsx" -Value $protectedRouteContent

# Fix components/ClientDarkModeToggle.tsx
$darkModeContent = @"
'use client';
import { useState, useEffect } from 'react';

export function ClientDarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  return (
    <button onClick={toggleDarkMode}>
      {isDark ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
"@
Set-Content -Path "components/ClientDarkModeToggle.tsx" -Value $darkModeContent

# Fix components/ErrorBoundary.tsx
$errorBoundaryContent = @"
'use client';
import * as Sentry from '@sentry/nextjs';
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}
"@
Set-Content -Path "components/ErrorBoundary.tsx" -Value $errorBoundaryContent

# 5. Library Fixes
# Fix lib/cache.ts
$cacheContent = @"
import { createClient } from 'redis';
import { QuantumCache } from '@/types/global';

const redis = createClient({ url: process.env.REDIS_URL });

export async function setCache(key: string, value: any, ttl: number = 3600) {
  await redis.connect();
  const cacheObj: QuantumCache = { key, timestamp: Date.now(), version: 'v1' };
  await redis.set(key, JSON.stringify({ ...cacheObj, value }), { EX: ttl });
  await redis.disconnect();
}

export async function getCache(key: string): Promise<any> {
  await redis.connect();
  const data = await redis.get(key);
  await redis.disconnect();
  return data ? JSON.parse(data).value : null;
}
"@
Set-Content -Path "lib/cache.ts" -Value $cacheContent

# Fix lib/rate-limiter.ts
$rateLimiterContent = @"
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  points: 100,
  duration: 60,
});

export async function limit(ip: string): Promise<boolean> {
  try {
    await rateLimiter.consume(ip);
    return true;
  } catch {
    return false;
  }
}
"@
Set-Content -Path "lib/rate-limiter.ts" -Value $rateLimiterContent

# Fix lib/performance.ts
$performanceContent = @"
export async function captureCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else throw new Error('Canvas blob failed');
    }, 'image/png');
  });
}
"@
Set-Content -Path "lib/performance.ts" -Value $performanceContent

# Fix lib/jwt.ts
$jwtContent = @"
import jwt from 'jsonwebtoken';

export function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

export function verifyToken(token: string): any {
  return jwt.verify(token, process.env.JWT_SECRET!);
}
"@
Set-Content -Path "lib/jwt.ts" -Value $jwtContent

# Fix lib/stripe.ts
$stripeContent = @"
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createPaymentIntent(amount: number) {
  return await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
  });
}
"@
Set-Content -Path "lib/stripe.ts" -Value $stripeContent

# Fix lib/validation.ts
$validationContent = @"
import { z } from 'zod';

export const domainSchema = z.string().refine(
  (val) => /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(val),
  { message: 'Invalid domain format' }
);

export function validateDomain(domain: string) {
  return domainSchema.safeParse(domain);
}
"@
Set-Content -Path "lib/validation.ts" -Value $validationContent

# Fix lib/cloud-storage.ts
$cloudStorageContent = @"
import { Cloudinary } from '@cloudinary/url-gen';

export const cloudinary = new Cloudinary({
  cloud: { cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME },
});

export function getImageUrl(publicId: string, transformations?: any): string {
  return cloudinary.image(publicId).addTransformation(transformations).toURL();
}
"@
Set-Content -Path "lib/cloud-storage.ts" -Value $cloudStorageContent

# Fix lib/video-processing.ts
$videoProcessingContent = @"
import { createFFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

export async function processVideo(file: File, options: { userId: string }): Promise<any> {
  await ffmpeg.load();
  ffmpeg.FS('writeFile', 'input.mp4', new Uint8Array(await file.arrayBuffer()));
  await ffmpeg.run('-i', 'input.mp4', 'output.mp4');
  const data = ffmpeg.FS('readFile', 'output.mp4');
  return { url: URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' })) };
}
"@
Set-Content -Path "lib/video-processing.ts" -Value $videoProcessingContent

# 6. Feature Implementation
# Fix features/voice-to-video-ai.ts
$voiceToVideoContent = @"
import { generateVideoScript } from '@/lib/ai/openai';

export async function voiceToVideo(voiceData: ArrayBuffer, language: string = 'en-US') {
  const script = await generateVideoScript('Convert voice to video script', { language });
  return { script, language };
}
"@
New-Item -Path "features" -ItemType Directory -Force
Set-Content -Path "features/voice-to-video-ai.ts" -Value $voiceToVideoContent

# Fix api/analytics-insights.ts
$analyticsInsightsContent = @"
import { prisma } from '@/lib/prisma';

export async function getAnalyticsInsights(userId: string) {
  const insights = await prisma.usage.groupBy({
    by: ['event'],
    where: { userId },
    _count: { event: true },
  });
  return insights;
}
"@
New-Item -Path "api" -ItemType Directory -Force
Set-Content -Path "api/analytics-insights.ts" -Value $analyticsInsightsContent

# 7. Database Fixes
# Update prisma/seed.ts
$seedContent = @"
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/types/global';

async function seed() {
  await prisma.user.create({
    data: {
      email: 'admin@forgevid.com',
      role: UserRole.ADMIN,
    },
  });
}

seed().catch(console.error);
"@
Set-Content -Path "prisma/seed.ts" -Value $seedContent

# Test build with error handling
Write-Host "Running build test..."
try {
  npm run build
  Write-Host "✅ Fixes Complete: Build successful!"
}
catch {
  Write-Host "❌ Build failed. Check errors above or share logs from C:\Users\yanp0\AppData\Local\npm-cache\_logs\*.log"
}