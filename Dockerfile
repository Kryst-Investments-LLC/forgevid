# Multi-stage Docker build for ForgeVid
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
# The build needs devDependencies — next.config.mjs imports @next/bundle-analyzer
# and next-intl/plugin at load time, and `next build` needs its dev toolchain. The
# `deps` stage above is production-only (npm ci --only=production), so install the
# FULL dependency set here instead of copying that pruned tree. The final `runner`
# stage still ships only the pruned `.next/standalone` output, so image size is
# unaffected.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --loglevel=error
COPY . .

# Install FFmpeg for video processing
# ffmpeg's drawtext needs a real font file. Alpine ships none, and it renamed
# ttf-dejavu -> font-dejavu across releases, so accept either.
RUN apk add --no-cache ffmpeg fontconfig \
    && (apk add --no-cache font-dejavu || apk add --no-cache ttf-dejavu)

# Generate the Prisma client BEFORE the build. App code (e.g. app/admin/page.tsx)
# consumes Prisma's generated query result types; without a generated client those
# resolve to `any` and `next build` fails type-checking under noImplicitAny. Needs
# no DB connection. Also bakes the (musl) client into the traced standalone output.
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Install FFmpeg for video processing
# ffmpeg's drawtext needs a real font file. Alpine ships none, and it renamed
# ttf-dejavu -> font-dejavu across releases, so accept either.
RUN apk add --no-cache ffmpeg fontconfig \
    && (apk add --no-cache font-dejavu || apk add --no-cache ttf-dejavu)

# Create uploads directory
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads

# Switch to non-root user
USER nextjs


# Automated health check: checks if the app responds to /api/monitoring/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
	CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/monitoring/health || exit 1

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
