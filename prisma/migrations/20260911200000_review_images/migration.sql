-- AlterTable
ALTER TABLE "ProductReview" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
