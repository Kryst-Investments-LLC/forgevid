-- Bring the migration history back in line with schema.prisma.
--
-- The project had been evolving the schema with `prisma db push`, which applies
-- changes but records no migration. As a result `prisma migrate deploy` against
-- a FRESH database produced a schema missing two whole tables
-- (sso_configurations, beta_access_entries), two video_exports columns
-- (fileUrl, progress) and ~30 indexes — so a clean production deploy would crash
-- on SSO lookups and on editor exports.
--
-- Generated with:
--   prisma migrate diff --from-schema-datasource --to-schema-datamodel --script
-- Verified: after this migration, `prisma migrate diff --exit-code` reports no drift.

-- AlterTable
ALTER TABLE "video_exports" ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sso_configurations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "provider" "SSOProvider" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "metadataUrl" TEXT,
    "issuer" TEXT,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "tenantId" TEXT,
    "entityId" TEXT,
    "certificate" TEXT,
    "defaultRole" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sso_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beta_access_entries" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "inviteCode" TEXT,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "beta_access_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sso_configurations_organizationId_idx" ON "sso_configurations"("organizationId");

-- CreateIndex
CREATE INDEX "sso_configurations_provider_idx" ON "sso_configurations"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "sso_configurations_provider_organizationId_key" ON "sso_configurations"("provider", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "beta_access_entries_email_key" ON "beta_access_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "beta_access_entries_inviteCode_key" ON "beta_access_entries"("inviteCode");

-- CreateIndex
CREATE INDEX "beta_access_entries_email_idx" ON "beta_access_entries"("email");

-- CreateIndex
CREATE INDEX "beta_access_entries_inviteCode_idx" ON "beta_access_entries"("inviteCode");

-- CreateIndex
CREATE INDEX "beta_access_entries_isActive_idx" ON "beta_access_entries"("isActive");

-- CreateIndex
CREATE INDEX "ai_generations_userId_idx" ON "ai_generations"("userId");

-- CreateIndex
CREATE INDEX "ai_generations_createdAt_idx" ON "ai_generations"("createdAt");

-- CreateIndex
CREATE INDEX "ai_generations_type_idx" ON "ai_generations"("type");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "collaboration_edits_roomId_idx" ON "collaboration_edits"("roomId");

-- CreateIndex
CREATE INDEX "collaboration_messages_roomId_idx" ON "collaboration_messages"("roomId");

-- CreateIndex
CREATE INDEX "collaboration_rooms_createdById_idx" ON "collaboration_rooms"("createdById");

-- CreateIndex
CREATE INDEX "collaboration_rooms_isActive_idx" ON "collaboration_rooms"("isActive");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_createdAt_idx" ON "payments"("createdAt");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "subscriptions_canceledAt_idx" ON "subscriptions"("canceledAt");

-- CreateIndex
CREATE INDEX "templates_isPublic_favoriteCount_averageRating_usageCount_c_idx" ON "templates"("isPublic", "favoriteCount", "averageRating", "usageCount", "createdAt");

-- CreateIndex
CREATE INDEX "templates_category_idx" ON "templates"("category");

-- CreateIndex
CREATE INDEX "usage_records_userId_idx" ON "usage_records"("userId");

-- CreateIndex
CREATE INDEX "usage_records_action_idx" ON "usage_records"("action");

-- CreateIndex
CREATE INDEX "usage_records_timestamp_idx" ON "usage_records"("timestamp");

-- CreateIndex
CREATE INDEX "usage_records_userId_action_timestamp_idx" ON "usage_records"("userId", "action", "timestamp");

-- CreateIndex
CREATE INDEX "video_analytics_videoId_idx" ON "video_analytics"("videoId");

-- CreateIndex
CREATE INDEX "video_analytics_views_idx" ON "video_analytics"("views");

-- CreateIndex
CREATE INDEX "video_analytics_shares_idx" ON "video_analytics"("shares");

-- CreateIndex
CREATE INDEX "video_exports_videoId_idx" ON "video_exports"("videoId");

-- CreateIndex
CREATE INDEX "video_exports_status_idx" ON "video_exports"("status");

-- AddForeignKey
ALTER TABLE "sso_configurations" ADD CONSTRAINT "sso_configurations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beta_access_entries" ADD CONSTRAINT "beta_access_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

