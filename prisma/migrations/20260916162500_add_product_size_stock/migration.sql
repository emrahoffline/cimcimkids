CREATE TABLE "ProductSizeStock" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "ageLabel" TEXT NOT NULL,
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductSizeStock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductSizeStock_stockQuantity_check" CHECK ("stockQuantity" >= 0)
);

ALTER TABLE "OrderItem" ADD COLUMN "ageLabel" TEXT;

CREATE UNIQUE INDEX "ProductSizeStock_productId_ageLabel_key"
  ON "ProductSizeStock"("productId", "ageLabel");
CREATE INDEX "ProductSizeStock_productId_idx"
  ON "ProductSizeStock"("productId");

ALTER TABLE "ProductSizeStock"
  ADD CONSTRAINT "ProductSizeStock_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ProductSizeStock" ("id", "productId", "ageLabel", "stockQuantity")
SELECT p.id || '::' || md5(age.age_label), p.id, age.age_label, 1
FROM "Product" p
CROSS JOIN LATERAL unnest(p.ages) AS age(age_label)
ON CONFLICT ("productId", "ageLabel") DO NOTHING;

UPDATE "Product" p
SET
  "stockQuantity" = totals.total,
  "inStock" = totals.total > 0
FROM (
  SELECT "productId", SUM("stockQuantity")::INTEGER AS total
  FROM "ProductSizeStock"
  GROUP BY "productId"
) totals
WHERE p.id = totals."productId";

WITH matches AS (
  SELECT DISTINCT ON (oi.id) oi.id, age.age_label
  FROM "OrderItem" oi
  JOIN "Product" p ON p.id = oi."productId"
  CROSS JOIN LATERAL unnest(p.ages) AS age(age_label)
  WHERE oi."ageLabel" IS NULL
    AND oi.name LIKE '%(' || age.age_label || '%'
  ORDER BY oi.id, length(age.age_label) DESC
)
UPDATE "OrderItem" oi
SET "ageLabel" = matches.age_label
FROM matches
WHERE oi.id = matches.id;
