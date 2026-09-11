-- CreateTable
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" TEXT NOT NULL,
    "textTr" TEXT NOT NULL,
    "textEn" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_active_sortOrder_idx" ON "Announcement"("active", "sortOrder");
