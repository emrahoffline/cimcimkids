import "server-only";
import { randomBytes, randomUUID } from "crypto";
import type {
  Invoice as DbInvoice,
  InvoiceDocumentType,
  InvoiceStatus,
} from "@prisma/client";
import { prisma, requireDatabaseUrl } from "./prisma";
import { getOrders, type Order } from "./db";
import { getEFaturaProvider, isEFaturaConfigured } from "./invoice-config";
import { resolveDocumentType, sendInvoiceToGib } from "./efatura/issue";
import { EFaturaError } from "./efatura/errors";
import { sendInvoiceEmail } from "./email";
import type { InvoiceRecord } from "./invoices";

export type { InvoiceRecord } from "./invoices";

const STALE_SENDING_MS = 2 * 60 * 1000;

export function mapInvoice(
  row: DbInvoice,
  extra?: { orderNumber?: string; customerName?: string; customerEmail?: string }
): InvoiceRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    uuid: row.uuid,
    invoiceNumber: row.invoiceNumber ?? undefined,
    documentType: row.documentType,
    status: row.status,
    netAmount: row.netAmount,
    vatAmount: row.vatAmount,
    grossAmount: row.grossAmount,
    errorMessage: row.errorMessage ?? undefined,
    issuedAt: row.issuedAt?.toISOString(),
    emailedAt: row.emailedAt?.toISOString(),
    provider: row.provider,
    createdAt: row.createdAt.toISOString(),
    ...extra,
  };
}

export async function listInvoices(): Promise<InvoiceRecord[]> {
  requireDatabaseUrl();
  const rows = await prisma.invoice.findMany({
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerEmail: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) =>
    mapInvoice(row, {
      orderNumber: row.order.orderNumber,
      customerName: row.order.customerName,
      customerEmail: row.order.customerEmail,
    })
  );
}

export async function getInvoiceById(id: string): Promise<InvoiceRecord | null> {
  requireDatabaseUrl();
  const row = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          orderNumber: true,
          customerName: true,
          customerEmail: true,
        },
      },
    },
  });
  if (!row) return null;
  return mapInvoice(row, {
    orderNumber: row.order.orderNumber,
    customerName: row.order.customerName,
    customerEmail: row.order.customerEmail,
  });
}

const invoiceOrderSelect = {
  orderNumber: true,
  customerName: true,
  customerEmail: true,
} as const;

export async function cancelInvoice(id: string): Promise<InvoiceRecord | null> {
  requireDatabaseUrl();
  const row = await prisma.invoice.findUnique({
    where: { id },
    include: { order: { select: invoiceOrderSelect } },
  });
  if (!row) return null;
  if (row.status === "cancelled") {
    return mapInvoice(row, {
      orderNumber: row.order.orderNumber,
      customerName: row.order.customerName,
      customerEmail: row.order.customerEmail,
    });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "cancelled" },
    include: { order: { select: invoiceOrderSelect } },
  });
  return mapInvoice(updated, {
    orderNumber: updated.order.orderNumber,
    customerName: updated.order.customerName,
    customerEmail: updated.order.customerEmail,
  });
}

function canRetry(row: DbInvoice | null): boolean {
  if (!row) return true;
  if (row.status === "sent") return false;
  if (row.status === "sending") {
    return Date.now() - row.updatedAt.getTime() > STALE_SENDING_MS;
  }
  return row.status === "failed" || row.status === "pending" || row.status === "cancelled";
}

export async function issueInvoiceForOrder(
  orderId: string,
  opts?: { emailCustomer?: boolean }
): Promise<{ invoice: InvoiceRecord; order: Order }> {
  requireDatabaseUrl();
  if (!isEFaturaConfigured()) {
    throw new Error("EFATURA_NOT_CONFIGURED");
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (order.status === "cancelled" || order.status === "pending_payment") {
    throw new Error("ORDER_NOT_PAID");
  }
  if (order.invoiceKind === "corporate" && !order.taxId) {
    throw new Error("MISSING_TAX_ID");
  }

  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing?.status === "sent") {
    return { invoice: mapInvoice(existing), order };
  }
  if (!canRetry(existing)) {
    throw new Error("INVOICE_IN_PROGRESS");
  }

  const documentType = await resolveDocumentType(order.taxId);
  const uuid =
    existing?.status === "cancelled" || !existing?.uuid
      ? randomUUID()
      : existing.uuid;
  const id = existing?.id ?? `inv_${Date.now()}_${randomBytes(3).toString("hex")}`;

  const provider = getEFaturaProvider() ?? "bien";
  const sending = await prisma.invoice.upsert({
    where: { orderId },
    create: {
      id,
      orderId,
      uuid,
      documentType: documentType as InvoiceDocumentType,
      status: "sending" as InvoiceStatus,
      provider,
      netAmount: 0,
      vatAmount: 0,
      grossAmount: 0,
    },
    update: {
      uuid,
      documentType: documentType as InvoiceDocumentType,
      status: "sending",
      provider,
      errorMessage: null,
      ...(existing?.status === "cancelled"
        ? { invoiceNumber: null, issuedAt: null, emailedAt: null }
        : {}),
    },
  });

  try {
    const { result, totals } = await sendInvoiceToGib(order, documentType, uuid);
    const issued = await prisma.invoice.update({
      where: { id: sending.id },
      data: {
        uuid: result.uuid,
        invoiceNumber: result.invoiceNumber ?? undefined,
        documentType: documentType as InvoiceDocumentType,
        status: "sent",
        netAmount: totals.net,
        vatAmount: totals.vat,
        grossAmount: totals.gross,
        issuedAt: new Date(),
        errorMessage: null,
      },
    });

    let emailedAt = issued.emailedAt;
    const shouldEmail = opts?.emailCustomer !== false;
    if (shouldEmail) {
      try {
        const ok = await sendInvoiceEmail({
          order,
          invoice: mapInvoice(issued),
        });
        if (ok) {
          const updated = await prisma.invoice.update({
            where: { id: issued.id },
            data: { emailedAt: new Date() },
          });
          emailedAt = updated.emailedAt;
        }
      } catch (err) {
        console.error("[efatura] müşteri faturası e-postası gönderilemedi:", err);
      }
    }

    return {
      invoice: mapInvoice({ ...issued, emailedAt }),
      order,
    };
  } catch (err) {
    const message =
      err instanceof EFaturaError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Fatura gönderilemedi";
    await prisma.invoice.update({
      where: { id: sending.id },
      data: {
        status: "failed",
        errorMessage: message.slice(0, 1000),
      },
    });
    throw err;
  }
}

export async function tryAutoIssueInvoice(
  orderId: string,
  opts?: { emailCustomer?: boolean }
): Promise<void> {
  try {
    await issueInvoiceForOrder(orderId, opts);
  } catch (err) {
    console.error("[efatura] otomatik kesim başarısız:", err);
  }
}
