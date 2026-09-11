ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cargoCost" DOUBLE PRECISION;

CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "description" TEXT,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "postNumber" TEXT,
    "carrier" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Expense_postNumber_key" ON "Expense"("postNumber");
CREATE INDEX IF NOT EXISTS "Expense_kind_cancelledAt_idx" ON "Expense"("kind", "cancelledAt");
CREATE INDEX IF NOT EXISTS "Expense_createdAt_idx" ON "Expense"("createdAt");
CREATE INDEX IF NOT EXISTS "Expense_orderId_idx" ON "Expense"("orderId");
