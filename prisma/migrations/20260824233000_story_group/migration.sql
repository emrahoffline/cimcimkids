-- AlterTable
ALTER TABLE "Story" ADD COLUMN IF NOT EXISTS "groupId" TEXT NOT NULL DEFAULT '';

UPDATE "Story" SET "groupId" = "id" WHERE "groupId" = '';

CREATE INDEX IF NOT EXISTS "Story_groupId_idx" ON "Story"("groupId");
