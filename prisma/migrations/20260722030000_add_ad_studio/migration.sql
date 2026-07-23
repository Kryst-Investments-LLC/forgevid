-- Ad Studio: marketing campaigns (one concept -> a matrix of ad creatives) and
-- the per-variant creatives (linked to a generated Video, with winners/ROAS for
-- the winners library). Hand-written to match `prisma migrate diff` for the
-- AdCampaign / AdCreative models, following the 20260722020000 pattern (no local
-- DB — see CLAUDE.md). CREATE TABLE / INDEX only; safe on a live database.

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "videoId" TEXT,
    "label" TEXT NOT NULL,
    "hook" TEXT,
    "cta" TEXT,
    "aspect" TEXT,
    "platform" TEXT NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "roas" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_campaigns_userId_idx" ON "ad_campaigns"("userId");

-- CreateIndex
CREATE INDEX "ad_creatives_userId_idx" ON "ad_creatives"("userId");

-- CreateIndex
CREATE INDEX "ad_creatives_campaignId_idx" ON "ad_creatives"("campaignId");
