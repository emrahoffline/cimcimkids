import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { syncAllTimeTotals } from "@/lib/analytics-db";
import { getOrders, saveOrders } from "@/lib/db";
import { appendStatusHistory, type OrderStatus } from "@/lib/order-status";
import {
  activateGiftCardsForOrder,
  getGiftCardsForOrder,
  refundGiftCardForOrder,
} from "@/lib/gift-cards-db";
import { refundDiscountForOrder } from "@/lib/discount-codes-db";
import { sendGiftCardCodesEmail } from "@/lib/email";
import { tryAutoIssueInvoice } from "@/lib/invoices-db";
import { shouldAutoIssueInvoice } from "@/lib/invoice-config";

const PAID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
];

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const orders = await getOrders();
  return NextResponse.json(orders);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id, status } = await request.json();
  const allowed: OrderStatus[] = [
    "pending_payment",
    "pending",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prevStatus = order.status;
  order.status = status;
  order.statusHistory = appendStatusHistory(
    order.statusHistory ?? [],
    status as OrderStatus
  );
  await saveOrders(orders);

  if (status === "cancelled" && prevStatus !== "cancelled") {
    try {
      await refundGiftCardForOrder(order.id);
    } catch (err) {
      console.error("[gift-cards] refund failed:", err);
    }
    try {
      await refundDiscountForOrder(order.id);
    } catch (err) {
      console.error("[discount-codes] refund failed:", err);
    }
  }

  if (
    PAID_STATUSES.includes(status) &&
    prevStatus === "pending_payment"
  ) {
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
        // Also email if cards already exist (idempotent re-send skipped if none pending)
        const existing = await getGiftCardsForOrder(order.id);
        if (existing.some((c) => c.status === "active")) {
          // no-op: codes already sent on first activation
        }
      }
    } catch (err) {
      console.error("[gift-cards] activate/email failed:", err);
    }
    if (shouldAutoIssueInvoice()) {
      await tryAutoIssueInvoice(order.id);
    }
  }

  await syncAllTimeTotals(orders).catch(() => undefined);
  return NextResponse.json(order);
}
