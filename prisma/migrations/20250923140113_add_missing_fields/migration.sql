/*
  Warnings:

  - Added the required column `fileName` to the `media_assets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "fileName" TEXT;
UPDATE "media_assets" SET "fileName" = 'unknown_file' WHERE "fileName" IS NULL;
ALTER TABLE "media_assets" ALTER COLUMN     "fileName" SET NOT NULL;

-- AlterTable
ALTER TABLE "usage_records" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resourceType" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "metadata" TEXT;
