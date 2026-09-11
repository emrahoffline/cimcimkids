-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "colors" JSONB;

-- Backfill gallery from cover image
UPDATE "Product"
SET "images" = ARRAY["image"]
WHERE "image" IS NOT NULL
  AND "image" <> ''
  AND (cardinality("images") = 0 OR "images" IS NULL);
