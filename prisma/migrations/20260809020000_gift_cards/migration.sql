-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "GiftCardStatus" AS ENUM ('pending_payment', 'active', 'exhausted', 'void');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftCardAmount" DOUBLE PRECISION;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "giftCardCode" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialBalance" DOUBLE PRECISION NOT NULL,
    "remainingBalance" DOUBLE PRECISION NOT NULL,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'pending_payment',
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "message" TEXT,
    "purchasedOrderId" TEXT,
    "createdByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GiftCardRedemption" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCard_code_key" ON "GiftCard"("code");
CREATE INDEX IF NOT EXISTS "GiftCard_status_idx" ON "GiftCard"("status");
CREATE INDEX IF NOT EXISTS "GiftCard_purchasedOrderId_idx" ON "GiftCard"("purchasedOrderId");
CREATE INDEX IF NOT EXISTS "GiftCardRedemption_orderId_idx" ON "GiftCardRedemption"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "GiftCardRedemption_giftCardId_orderId_key" ON "GiftCardRedemption"("giftCardId", "orderId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey"
    FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
