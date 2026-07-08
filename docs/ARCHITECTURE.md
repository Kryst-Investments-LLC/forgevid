# 🏗️ **FORGEVID ARCHITECTURE DOCUMENTATION**

**Last Updated:** December 2024  
**Version:** 1.0.0  
**Status:** Production Architecture

---

## 📋 **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Security Architecture](#security-architecture)
7. [Deployment Architecture](#deployment-architecture)
8. [Scaling Strategy](#scaling-strategy)

---

## 🎯 **OVERVIEW**

ForgeVid is a comprehensive AI-powered video creation platform built with modern web technologies, designed for scalability, security, and performance.

### **Core Principles**
- **Serverless-First:** Next.js API routes for serverless deployment
- **Type-Safe:** Full TypeScript implementation
- **Real-Time:** WebSocket-based collaboration
- **Security-First:** Enterprise-grade security
- **Scalable:** Designed for horizontal scaling

---

## 🏛️ **SYSTEM ARCHITECTURE**

### **High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Web    │  │  Mobile  │  │    API   │  │  Admin   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Next.js App │  │   Auth Layer │  │  API Routes  │     │
│  │   (Pages)    │  │  (NextAuth)  │  │   (REST)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Socket.io   │  │  AI Services │  │  File Server │     │
│  │ (Collaboration)│  │  (OpenAI)   │  │ (Cloudinary)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Video Gen   │  │   Payments   │  │   Analytics  │     │
│  │  (FFmpeg)    │  │  (Stripe)    │  │  (Custom)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Storage    │  │   Caching    │  │  Monitoring  │     │
│  │ (Cloudinary) │  │   (Redis)    │  │  (Sentry)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  PostgreSQL  │  │  Redis Cache │  │   File Sys   │     │
│  │   (Prisma)   │  │  (Session)   │  │  (Videos)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ **TECHNOLOGY STACK**

### **Frontend**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI Framework:** React 18
- **Styling:** Tailwind CSS
- **Components:** Radix UI + shadcn/ui
- **State Management:** React Context + Zustand
- **Real-Time:** Socket.io Client

### **Backend**
- **Runtime:** Node.js 18+
- **API:** Next.js API Routes
- **Database:** PostgreSQL (Prisma ORM)
- **Caching:** Redis
- **File Storage:** Cloudinary
- **Real-Time:** Socket.io Server

### **AI & Processing**
- **Script Generation:** OpenAI GPT-4
- **Voice Synthesis:** ElevenLabs
- **Video Assembly:** FFmpeg
- **Stock Footage:** Pexels API
- **Emotion AI:** Custom implementation

### **DevOps & Infrastructure**
- **Deployment:** Vercel/VPS
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry
- **CDN:** Cloudflare/Cloudinary
- **Load Testing:** Artillery

### **Security**
- **Authentication:** NextAuth.js
- **Authorization:** Role-based (RBAC)
- **Security Headers:** Helmet
- **Rate Limiting:** express-rate-limit
- **Input Validation:** Zod
- **Audit Logging:** Custom

---

## 🗄️ **DATABASE SCHEMA**

### **Core Models**

**Users & Authentication**
- `User` - User accounts, roles, status
- `Session` - Auth sessions (NextAuth)
- `Account` - OAuth accounts

**Video System**
- `Video` - Video projects/metadata
- `VideoEdit` - Edit history
- `VideoExport` - Export records
- `VideoAnalytics` - View metrics

**Templates**
- `Template` - Template library
- `TemplateCategory` - Categories

**Collaboration**
- `CollaborationRoom` - Real-time rooms
- `CollaborationMember` - Room members
- `CollaborationMessage` - Chat
- `CollaborationEdit` - Edit tracking

**Subscriptions**
- `Subscription` - User subscriptions
- `Payment` - Payment records
- `Organization` - Teams/orgs
- `OrganizationPlan` - Plans

**AI**
- `AIGeneration` - AI request history
- `UsageRecord` - Usage tracking

---

## 🔌 **API ARCHITECTURE**

### **REST API Structure**

**Authentication** `/api/auth/*`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/auth/session`

**Videos** `/api/videos/*`
- `GET /api/videos` - List videos
- `POST /api/videos` - Create video
- `GET /api/videos/[id]` - Get video
- `PUT /api/videos/[id]` - Update video
- `DELETE /api/videos/[id]` - Delete video
- `POST /api/videos/upload` - Upload media

**AI** `/api/ai/*`
- `POST /api/ai/generate` - Generate video
- `POST /api/ai/script` - Generate script
- `POST /api/ai/storyboard` - Generate storyboard
- `POST /api/ai/voice` - Voice synthesis

**Templates** `/api/templates/*`
- `GET /api/templates` - List templates
- `GET /api/templates/[id]` - Get template
- `POST /api/templates/use` - Use template
- `POST /api/templates/remix` - Remix templates
- `POST /api/templates/save` - Save as template

**Editor** `/api/editor/*`
- `GET /api/editor/[id]` - Get editor state
- `POST /api/editor/[id]` - Update state
- `POST /api/editor/export` - Export video

**User** `/api/user/*`
- `GET /api/user/profile` - Get profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/subscription` - Get subscription

**Payments** `/api/payments/*`
- `POST /api/payments/create-checkout-session` - Stripe checkout
- `POST /api/payments/webhook` - Stripe webhooks
- `POST /api/payments/customer-portal` - Portal

**Admin** `/api/admin/*`
- `GET /api/admin/users`
- `GET /api/admin/analytics`
- `GET /api/admin/revenue`

---

## 🔒 **SECURITY ARCHITECTURE**

### **Authentication**
- **Email/Password:** Bcrypt hashing
- **OAuth:** Google, GitHub
- **JWT:** NextAuth.js sessions
- **MFA:** TOTP (planned)

### **Authorization**
- **Roles:** ADMIN, MANAGER, USER, VIEWER
- **RBAC:** Role-based access control
- **Resource:** Ownership checks

### **Security Layers**
1. **Rate Limiting:** 100 req/15min per IP
2. **CORS:** Whitelist origins
3. **Headers:** Helmet.js security headers
4. **Input Validation:** Zod schemas
5. **SQL Injection:** Prisma parameterized queries
6. **XSS:** React auto-escaping
7. **CSRF:** NextAuth protection
8. **Audit Logging:** Security events

---

## 🚀 **DEPLOYMENT ARCHITECTURE**

### **Production Stack**

**Option 1: Serverless (Vercel)**
- Next.js API routes → Vercel Functions
- Database: Postgres (Supabase/Neon)
- Redis: Upstash
- Storage: Cloudinary
- CDN: Vercel Edge Network

**Option 2: VPS (Self-Hosted)**
- Application: Node.js on Ubuntu
- Database: PostgreSQL on same VPS
- Redis: Redis on same VPS
- Storage: Cloudinary or S3
- CDN: Cloudflare

---

## 📈 **SCALING STRATEGY**

### **Horizontal Scaling**
- **Application:** Multiple Node.js instances behind load balancer
- **Database:** Read replicas for read-heavy queries
- **Cache:** Redis cluster for sessions
- **Storage:** CDN for static assets

### **Performance Optimization**
- **Caching:** Redis for hot data
- **CDN:** Static asset delivery
- **Database:** Indexes on frequently queried columns
- **API:** Response caching headers
- **Video:** On-demand transcoding

---

## 📊 **MONITORING & OBSERVABILITY**

### **Metrics**
- **Application:** Response times, error rates
- **Database:** Query performance
- **Infrastructure:** CPU, memory, disk
- **Business:** User growth, revenue

### **Logging**
- **Application:** Structured JSON logs
- **Audit:** Security events
- **Errors:** Sentry integration

### **Alerts**
- **Uptime:** Service availability
- **Errors:** Spike detection
- **Performance:** Slow queries
- **Security:** Failed auth attempts

---

**Architecture Status:** Production-Ready ✅

