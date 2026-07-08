-- AlterTable
ALTER TABLE "templates" ADD COLUMN     "averageRating" DECIMAL(65,30),
ADD COLUMN     "favoriteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "moderationStatus" TEXT DEFAULT 'approved',
ADD COLUMN     "totalRatings" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "template_ratings" (
    "id" TEXT NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "template_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_favorites" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "template_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_moderation" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "moderatorId" TEXT,
    "rejectionReason" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "template_moderation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "template_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_ratings_templateId_idx" ON "template_ratings"("templateId");

-- CreateIndex
CREATE INDEX "template_ratings_userId_idx" ON "template_ratings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "template_ratings_templateId_userId_key" ON "template_ratings"("templateId", "userId");

-- CreateIndex
CREATE INDEX "template_favorites_templateId_idx" ON "template_favorites"("templateId");

-- CreateIndex
CREATE INDEX "template_favorites_userId_idx" ON "template_favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "template_favorites_templateId_userId_key" ON "template_favorites"("templateId", "userId");

-- CreateIndex
CREATE INDEX "template_moderation_templateId_idx" ON "template_moderation"("templateId");

-- CreateIndex
CREATE INDEX "template_moderation_status_idx" ON "template_moderation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "template_moderation_templateId_key" ON "template_moderation"("templateId");

-- CreateIndex
CREATE INDEX "template_analytics_templateId_idx" ON "template_analytics"("templateId");

-- CreateIndex
CREATE INDEX "template_analytics_date_idx" ON "template_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "template_analytics_templateId_date_key" ON "template_analytics"("templateId", "date");

-- CreateIndex
CREATE INDEX "templates_moderationStatus_idx" ON "templates"("moderationStatus");

-- AddForeignKey
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_ratings" ADD CONSTRAINT "template_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_favorites" ADD CONSTRAINT "template_favorites_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_favorites" ADD CONSTRAINT "template_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_moderation" ADD CONSTRAINT "template_moderation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_moderation" ADD CONSTRAINT "template_moderation_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_analytics" ADD CONSTRAINT "template_analytics_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
