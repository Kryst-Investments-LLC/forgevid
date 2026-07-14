-- Abuse reports (from anyone) + an auto-moderation audit trail.
CREATE TABLE "content_reports" (
    "id" TEXT NOT NULL,
    "videoId" TEXT,
    "reporterEmail" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "source" TEXT NOT NULL DEFAULT 'user',
    "categories" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_reports_status_idx" ON "content_reports"("status");
CREATE INDEX "content_reports_videoId_idx" ON "content_reports"("videoId");
