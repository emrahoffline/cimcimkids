-- Restore Instagram-style stories (table already exists on production)
CREATE TABLE IF NOT EXISTS "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "mediaUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT NOT NULL DEFAULT '',
    "linkUrl" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Story_active_sortOrder_idx" ON "Story"("active", "sortOrder");
CREATE INDEX IF NOT EXISTS "Story_groupId_idx" ON "Story"("groupId");
