-- Seed the default free-shipping announcement shown on the storefront banner
INSERT INTO "Announcement" ("id", "textTr", "textEn", "active", "sortOrder", "createdAt", "updatedAt")
SELECT
  'ann_default_free_shipping',
  '1500 TL ve üzeri alışverişlerde kargo ücretsiz',
  'Free shipping on orders of 1,500 TL and above',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "Announcement" WHERE "id" = 'ann_default_free_shipping'
);
