-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "ages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill from single ageRange
UPDATE "Product"
SET "ages" = ARRAY["ageRange"]
WHERE "ageRange" IS NOT NULL
  AND "ageRange" <> ''
  AND (cardinality("ages") = 0 OR "ages" IS NULL);
