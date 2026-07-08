-- Per-user brand kit: logo overlay, caption colour/font, intro/outro clips.
-- Applied at render time for paid plans only (see lib/plan.ts).

CREATE TABLE "brand_kits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "logoPosition" TEXT NOT NULL DEFAULT 'bottom-right',
    "primaryColor" TEXT,
    "fontFamily" TEXT,
    "introUrl" TEXT,
    "outroUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "brand_kits_userId_key" ON "brand_kits"("userId");
CREATE INDEX "brand_kits_userId_idx" ON "brand_kits"("userId");

ALTER TABLE "brand_kits"
    ADD CONSTRAINT "brand_kits_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
