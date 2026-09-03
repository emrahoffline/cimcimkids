import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { syncAllTimeTotals } from "@/lib/analytics-db";
import { getOrders, saveOrders } from "@/lib/db";
import { sendCustomerPaymentConfirmationEmail } from "@/lib/email";

const PAID_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
] as const;

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
  const allowed = [
    "pending_payment",
    "pending",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
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
  await saveOrders(orders);

  if (
    prevStatus === "pending_payment" &&
    (PAID_STATUSES as readonly string[]).includes(status)
  ) {
    try {
      await sendCustomerPaymentConfirmationEmail(order);
    } catch (err) {
      console.error("[email] Müşteri ödeme onay maili gönderilemedi:", err);
    }
  }

  await syncAllTimeTotals(orders).catch(() => undefined);
  return NextResponse.json(order);
}
