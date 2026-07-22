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

# Full node_modules + schema/migrations so `prisma migrate deploy` runs on boot
# (see CMD). The standalone trace bundles @prisma/client but NOT the CLI, its
# schema/migration engine, or the CLI's un-bundled transitive deps (@prisma/config
# -> `effect`, etc.) — copying just prisma/@prisma missed those. The full tree from
# the builder (same alpine base, so musl engines match) is a safe superset for the
# standalone server too. This overwrites the pruned node_modules from standalone.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Install FFmpeg for video processing (+ openssl: Prisma's engine needs libssl on
# Alpine). ffmpeg's drawtext needs a real font file; Alpine renamed ttf-dejavu ->
# font-dejavu across releases, so accept either.
RUN apk add --no-cache ffmpeg fontconfig openssl \
    && (apk add --no-cache font-dejavu || apk add --no-cache ttf-dejavu)

# Writable dirs the render pipeline needs at runtime: uploads, plus the ffmpeg
# scratch (public/temp) and the local render output staged before the Cloudinary
# upload (public/generated). The image runs as non-root `nextjs` and /app/public
# was COPYed as root, so without this the render fails with
# `EACCES: permission denied, mkdir '/app/public/temp'`.
RUN mkdir -p /app/uploads /app/public/temp /app/public/generated \
    && chown -R nextjs:nodejs /app/uploads /app/public

# Switch to non-root user
USER nextjs


# Automated health check: checks if the app responds to /api/monitoring/health
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
	CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/monitoring/health || exit 1

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Apply pending DB migrations, THEN start the server. On a fresh database this
# creates every table; on subsequent boots it's a no-op. Fails loud (&&) so a
# broken migration surfaces instead of silently serving a half-migrated schema.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
