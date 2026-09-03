-- CreateTable
CREATE TABLE "ShopperState" (
    "email" TEXT NOT NULL,
    "cart" JSONB NOT NULL DEFAULT '[]',
    "favorites" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperState_pkey" PRIMARY KEY ("email")
);
