-- Add template enhancements schema
-- Run with: psql $DATABASE_URL -f add-template-enhancements.sql

-- Template Ratings
CREATE TABLE IF NOT EXISTS "template_ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    UNIQUE ("templateId", "userId")
);

CREATE INDEX "template_ratings_templateId_idx" ON "template_ratings"("templateId");
CREATE INDEX "template_ratings_userId_idx" ON "template_ratings"("userId");
CREATE INDEX "template_ratings_createdAt_idx" ON "template_ratings"("createdAt");

-- Template Favorites
CREATE TABLE IF NOT EXISTS "template_favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    UNIQUE ("templateId", "userId")
);

CREATE INDEX "template_favorites_templateId_idx" ON "template_favorites"("templateId");
CREATE INDEX "template_favorites_userId_idx" ON "template_favorites"("userId");

-- Template Moderation Queue
CREATE TABLE IF NOT EXISTS "template_moderation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    "moderatorId" TEXT,
    "rejectionReason" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE,
    FOREIGN KEY ("moderatorId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX "template_moderation_templateId_idx" ON "template_moderation"("templateId");
CREATE INDEX "template_moderation_status_idx" ON "template_moderation"("status");
CREATE INDEX "template_moderation_createdAt_idx" ON "template_moderation"("createdAt");

-- Template Analytics
CREATE TABLE IF NOT EXISTS "template_analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE CASCADE,
    UNIQUE ("templateId", "date")
);

CREATE INDEX "template_analytics_templateId_idx" ON "template_analytics"("templateId");
CREATE INDEX "template_analytics_date_idx" ON "template_analytics"("date");

-- Update templates table to include moderation status
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT DEFAULT 'approved' CHECK (moderationStatus IN ('pending', 'approved', 'rejected', 'flagged'));
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "totalRatings" INTEGER DEFAULT 0;
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "averageRating" DECIMAL(3,2);
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "favoriteCount" INTEGER DEFAULT 0;

-- Create index on moderation status
CREATE INDEX IF NOT EXISTS "templates_moderationStatus_idx" ON "templates"("moderationStatus");

-- Add trigger to update average rating when ratings change
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE templates
    SET 
        "totalRatings" = (
            SELECT COUNT(*) 
            FROM template_ratings 
            WHERE "templateId" = NEW."templateId"
        ),
        "averageRating" = (
            SELECT AVG(rating) 
            FROM template_ratings 
            WHERE "templateId" = NEW."templateId"
        )
    WHERE id = NEW."templateId";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON template_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_template_rating();

-- Add trigger to update favorite count
CREATE OR REPLACE FUNCTION update_template_favorites()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE templates
    SET "favoriteCount" = (
        SELECT COUNT(*) 
        FROM template_favorites 
        WHERE "templateId" = NEW."templateId"
    )
    WHERE id = NEW."templateId";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_favorites_trigger
    AFTER INSERT OR DELETE ON template_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_template_favorites();

-- Add trigger to update analytics on template view/use
CREATE OR REPLACE FUNCTION update_template_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO template_analytics ("templateId", "date", "views", "uses", "createdAt", "updatedAt")
    VALUES (NEW."templateId", CURRENT_DATE, 0, 1, NOW(), NOW())
    ON CONFLICT ("templateId", "date") 
    DO UPDATE SET "uses" = template_analytics."uses" + 1, "updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

