-- Async review comments on a video (Share & Review). Left by the owner or by
-- anyone with the public share link. Hand-written to match `prisma migrate diff`
-- for the VideoComment model, following the 20260722010000_add_referrals pattern
-- (no local DB — see CLAUDE.md). CREATE TABLE / INDEX only; safe on a live DB.

-- CreateTable
CREATE TABLE "video_comments" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "timestampSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_comments_videoId_idx" ON "video_comments"("videoId");
