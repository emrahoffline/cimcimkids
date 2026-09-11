-- AlterTable
ALTER TABLE "Product" ADD COLUMN "code" TEXT;

-- Backfill existing rows
UPDATE "Product"
SET "code" = 'CKP-' || UPPER(SUBSTRING(md5(id || random()::text) FROM 1 FOR 8))
WHERE "code" IS NULL;

-- Make required + unique
ALTER TABLE "Product" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");
