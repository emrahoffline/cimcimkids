-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DiscountCodeKind" AS ENUM ('percent', 'amount');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountCode" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "DiscountCodeKind" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DiscountCodeRedemption" (
    "id" TEXT NOT NULL,
    "discountCodeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCodeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX IF NOT EXISTS "DiscountCode_active_idx" ON "DiscountCode"("active");
CREATE UNIQUE INDEX IF NOT EXISTS "DiscountCodeRedemption_discountCodeId_orderId_key" ON "DiscountCodeRedemption"("discountCodeId", "orderId");
CREATE INDEX IF NOT EXISTS "DiscountCodeRedemption_orderId_idx" ON "DiscountCodeRedemption"("orderId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DiscountCodeRedemption" ADD CONSTRAINT "DiscountCodeRedemption_discountCodeId_fkey"
    FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
