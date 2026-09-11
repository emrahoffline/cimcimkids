-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER NOT NULL DEFAULT 0;

-- Preserve existing in-stock flag as at least 1 unit
UPDATE "Product" SET "stockQuantity" = 1 WHERE "inStock" = true AND "stockQuantity" = 0;
