-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "transcript" TEXT;

-- CreateIndex
CREATE INDEX "organization_plans_organizationId_idx" ON "organization_plans"("organizationId");

-- CreateIndex
CREATE INDEX "organization_plans_planType_idx" ON "organization_plans"("planType");

-- CreateIndex
CREATE INDEX "organization_plans_isActive_idx" ON "organization_plans"("isActive");

-- CreateIndex
CREATE INDEX "organizations_name_idx" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "organizations_domain_idx" ON "organizations"("domain");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "video_edits_videoId_idx" ON "video_edits"("videoId");

-- CreateIndex
CREATE INDEX "video_edits_userId_idx" ON "video_edits"("userId");

-- CreateIndex
CREATE INDEX "video_edits_timestamp_idx" ON "video_edits"("timestamp");

-- CreateIndex
CREATE INDEX "videos_userId_idx" ON "videos"("userId");

-- CreateIndex
CREATE INDEX "videos_organizationId_idx" ON "videos"("organizationId");

-- CreateIndex
CREATE INDEX "videos_status_idx" ON "videos"("status");

-- CreateIndex
CREATE INDEX "videos_createdAt_idx" ON "videos"("createdAt");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
