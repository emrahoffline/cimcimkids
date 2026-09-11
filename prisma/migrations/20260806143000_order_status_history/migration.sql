-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "statusHistory" JSONB;
