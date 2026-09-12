ALTER TABLE "AnalyticsSession" ADD COLUMN IF NOT EXISTS "landingPath" TEXT;
ALTER TABLE "AnalyticsSession" ADD COLUMN IF NOT EXISTS "exitPath" TEXT;
ALTER TABLE "AnalyticsSession" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "AnalyticsSession" ADD COLUMN IF NOT EXISTS "referrer" TEXT;

CREATE INDEX IF NOT EXISTS "AnalyticsSession_source_idx" ON "AnalyticsSession"("source");
