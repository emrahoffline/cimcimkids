-- CreateTable
CREATE TABLE "AdminPushSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPushSubscription_endpoint_key" ON "AdminPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "AdminPushSubscription_userEmail_idx" ON "AdminPushSubscription"("userEmail");
