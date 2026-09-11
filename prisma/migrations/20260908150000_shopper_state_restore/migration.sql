-- Shopper cart/favorites already exist on production; restore schema + visitor link
CREATE TABLE IF NOT EXISTS "ShopperState" (
    "email" TEXT NOT NULL,
    "cart" JSONB NOT NULL DEFAULT '[]',
    "favorites" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperState_pkey" PRIMARY KEY ("email")
);

ALTER TABLE "ShopperState" ADD COLUMN IF NOT EXISTS "visitorId" TEXT;

CREATE INDEX IF NOT EXISTS "ShopperState_visitorId_idx" ON "ShopperState"("visitorId");
