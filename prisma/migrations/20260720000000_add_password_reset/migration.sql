-- Password reset: store a SHA-256 hash of the emailed token (never the raw token)
-- and its expiry. Both nullable; set on request, cleared on use/expiry.
ALTER TABLE "users" ADD COLUMN "resetTokenHash" TEXT;
ALTER TABLE "users" ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);
