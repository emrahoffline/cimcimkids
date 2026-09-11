-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "InvoiceBuyerKind" AS ENUM ('individual', 'corporate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceDocumentType" AS ENUM ('e_archive', 'e_invoice');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'sending', 'sent', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceKind" "InvoiceBuyerKind" NOT NULL DEFAULT 'individual';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "taxOffice" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "companyTitle" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceDistrict" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "invoiceCity" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "documentType" "InvoiceDocumentType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'nilvera',
    "netAmount" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "errorMessage" TEXT,
    "issuedAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_uuid_key" ON "Invoice"("uuid");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
