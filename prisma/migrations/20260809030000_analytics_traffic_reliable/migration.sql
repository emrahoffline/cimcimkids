-- AlterTable
ALTER TABLE "AnalyticsEvent" ADD COLUMN IF NOT EXISTS "visitorId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsEvent_visitorId_idx" ON "AnalyticsEvent"("visitorId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsTraffic" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "totalSessionDurationSec" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsTraffic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsVisitor" (
    "id" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "country" TEXT,
    "city" TEXT,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsLocation" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");
CREATE INDEX IF NOT EXISTS "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalyticsLocationVisitor" (
    "visitorId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "AnalyticsLocationVisitor_pkey" PRIMARY KEY ("visitorId","locationId")
);

CREATE INDEX IF NOT EXISTS "AnalyticsLocationVisitor_locationId_idx" ON "AnalyticsLocationVisitor"("locationId");

-- Seed traffic row
INSERT INTO "AnalyticsTraffic" ("id", "pageViews", "sessions", "uniqueVisitors", "totalSessionDurationSec", "completedSessions", "updatedAt")
VALUES (1, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
