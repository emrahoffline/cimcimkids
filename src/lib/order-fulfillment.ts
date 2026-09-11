import "server-only";
import { prisma, requireDatabaseUrl } from "@/lib/prisma";
import { getOrders, saveOrders, type Order } from "@/lib/db";
import { appendStatusHistory } from "@/lib/order-status";
import {
  activateGiftCardsForOrder,
  getGiftCardsForOrder,
} from "@/lib/gift-cards-db";
import { sendGiftCardCodesEmail, sendCustomerOrderReceivedEmail, sendOrderNotificationEmail } from "@/lib/email";
import { tryAutoIssueInvoice } from "@/lib/invoices-db";
import { shouldAutoIssueInvoice } from "@/lib/invoice-config";

export async function finalizePaidOrder(
  orderId: string,
  extra?: {
    iyzicoPaymentId?: string | null;
    lastFourDigits?: string | null;
    cardType?: string | null;
    notifyAdmin?: boolean;
  }
): Promise<Order | null> {
  requireDatabaseUrl();
  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  if (order.status === "cancelled") return order;

  const wasPending = order.status === "pending_payment";
  if (wasPending) {
    order.status = "confirmed";
    order.statusHistory = appendStatusHistory(
      order.statusHistory ?? [],
      "confirmed"
    );
  }

  if (extra?.iyzicoPaymentId) order.iyzicoPaymentId = extra.iyzicoPaymentId;
  if (extra?.lastFourDigits) order.lastFourDigits = extra.lastFourDigits;
  if (extra?.cardType) order.cardType = extra.cardType;

  await saveOrders(orders);

  if (wasPending) {
    await prisma.customer.updateMany({
      where: { email: order.customerEmail.toLowerCase() },
      data: {
        orderCount: { increment: 1 },
        totalSpent: { increment: order.total },
      },
    });

    try {
      const activated = await activateGiftCardsForOrder(order.id);
      if (activated.length > 0) {
        await sendGiftCardCodesEmail({
          to: order.customerEmail,
          customerName: order.customerName,
          orderNumber: order.orderNumber,
          cards: activated.map((c) => ({
            code: c.code,
            balance: c.initialBalance,
          })),
        });
      } else {
        await getGiftCardsForOrder(order.id);
      }
    } catch (err) {
      console.error("[orders] gift-card activate/email failed:", err);
    }

    if (shouldAutoIssueInvoice()) {
      await tryAutoIssueInvoice(order.id, { emailCustomer: false });
    }

    try {
      const invoice = await prisma.invoice.findUnique({
        where: { orderId: order.id },
      });
      const sentInvoice =
        invoice?.status === "sent"
          ? {
              uuid: invoice.uuid,
              invoiceNumber: invoice.invoiceNumber ?? undefined,
              documentType: invoice.documentType,
              grossAmount: invoice.grossAmount,
            }
          : undefined;
      const mailed = await sendCustomerOrderReceivedEmail(order, {
        invoice: sentInvoice,
      });
      if (mailed && invoice?.status === "sent" && !invoice.emailedAt) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { emailedAt: new Date() },
        });
      }
    } catch (err) {
      console.error("[email] Müşteri sipariş e-postası gönderilemedi:", err);
    }

    if (extra?.notifyAdmin) {
      try {
        await sendOrderNotificationEmail(order);
      } catch (err) {
        console.error("[email] Kart ödemesi bildirimi gönderilemedi:", err);
      }
      try {
        const { sendAdminOrderPush } = await import("@/lib/admin-push");
        await sendAdminOrderPush({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
        });
      } catch (err) {
        console.error("[push] Kart ödemesi push gönderilemedi:", err);
      }
    }
  }

  return order;
}
