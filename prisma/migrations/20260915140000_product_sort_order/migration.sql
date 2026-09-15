-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE
          WHEN id ~ '^prod_[0-9]{12,}$' THEN substring(id FROM 6)::bigint
          ELSE 0
        END DESC,
        "createdAt" DESC,
        id DESC
    ) - 1 AS rn
  FROM "Product"
)
UPDATE "Product" AS p
SET "sortOrder" = o.rn
FROM ordered AS o
WHERE p.id = o.id;

CREATE INDEX IF NOT EXISTS "Product_sortOrder_idx" ON "Product"("sortOrder");
