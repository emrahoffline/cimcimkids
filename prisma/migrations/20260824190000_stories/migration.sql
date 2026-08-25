-- CreateTable
CREATE TABLE IF NOT EXISTS "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "mediaUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Story_active_sortOrder_idx" ON "Story"("active", "sortOrder");
