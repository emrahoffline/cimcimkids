/** Client-safe invoice types (no server-only imports). */

export type InvoiceStatus =
  | "pending"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export type InvoiceDocumentType = "e_archive" | "e_invoice";

export type InvoiceRecord = {
  id: string;
  orderId: string;
  uuid: string;
  invoiceNumber?: string;
  documentType: InvoiceDocumentType;
  status: InvoiceStatus;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  errorMessage?: string;
  issuedAt?: string;
  emailedAt?: string;
  provider: string;
  createdAt: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
};
