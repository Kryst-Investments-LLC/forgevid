-- Referral program: a per-user share code (referral_accounts) and one row per
-- referred sign-up (referral_signups). Hand-written to match `prisma migrate
-- diff` output for the ReferralAccount / ReferralSignup models, following the
-- pattern in 20260722000000_add_credit_ledger (no local DB to run
-- `prisma migrate dev` against — see CLAUDE.md). Only CREATE TABLE / INDEX, no
-- ALTER on existing tables, so it is safe on a live database.

-- CreateTable
CREATE TABLE "referral_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_signups" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "rewardCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_accounts_userId_key" ON "referral_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referral_accounts_code_key" ON "referral_accounts"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_signups_referredUserId_key" ON "referral_signups"("referredUserId");

-- CreateIndex
CREATE INDEX "referral_signups_referrerId_idx" ON "referral_signups"("referrerId");
