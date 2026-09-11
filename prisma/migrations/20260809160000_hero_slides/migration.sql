-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altTr" TEXT NOT NULL DEFAULT '',
    "altEn" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroSlide_active_sortOrder_idx" ON "HeroSlide"("active", "sortOrder");

-- Seed the existing static hero so the homepage keeps working
INSERT INTO "HeroSlide" ("id", "imageUrl", "altTr", "altEn", "active", "sortOrder", "createdAt", "updatedAt")
SELECT
  'hero_default_1',
  '/images/hero1.png',
  'CimcimKids — Küçükler İçin Büyük Konfor',
  'CimcimKids — Big Comfort for Little Ones',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "HeroSlide" WHERE "id" = 'hero_default_1'
);
