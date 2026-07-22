-- Purchased-credit ledger (second credit pool, on top of the monthly
-- UsageRecord-based quota in lib/quota.ts). Append-only: SUM(delta) per user
-- is the balance. stripeSessionId is unique so the Stripe webhook can safely
-- retry `checkout.session.completed` without double-granting a purchase.
--
-- Hand-written to match `prisma migrate diff` output for the CreditLedger
-- model added to schema.prisma, following the pattern established in
-- 20260708140000_sync_schema_drift (no local database to run
-- `prisma migrate dev` against — see CLAUDE.md).

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "videoId" TEXT,
    "stripeSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_stripeSessionId_key" ON "credit_ledger"("stripeSessionId");

-- CreateIndex
CREATE INDEX "credit_ledger_userId_idx" ON "credit_ledger"("userId");

-- CreateIndex
CREATE INDEX "credit_ledger_videoId_idx" ON "credit_ledger"("videoId");

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
