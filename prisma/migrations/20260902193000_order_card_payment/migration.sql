-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('bank_transfer', 'card');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE "Order" ADD COLUMN "paymentProvider" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paymentLastFour" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentCardFamily" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentToken_key" ON "Order"("paymentToken");
CREATE INDEX "Order_paymentId_idx" ON "Order"("paymentId");
