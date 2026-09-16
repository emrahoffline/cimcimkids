CREATE TABLE "StockNotification" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "ageLabel" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'tr',
  "claimedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockNotification_productId_ageLabel_email_key"
  ON "StockNotification"("productId", "ageLabel", "email");
CREATE INDEX "StockNotification_sentAt_idx"
  ON "StockNotification"("sentAt");
CREATE INDEX "StockNotification_productId_sentAt_idx"
  ON "StockNotification"("productId", "sentAt");

ALTER TABLE "StockNotification"
  ADD CONSTRAINT "StockNotification_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
