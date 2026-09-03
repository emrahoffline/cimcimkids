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

  const body = await request.json();
  const { id, status, resendEmail } = body as {
    id?: string;
    status?: string;
    resendEmail?: boolean;
  };

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (resendEmail) {
    try {
      const sent = await sendCustomerPaymentConfirmationEmail(order);
      if (!sent) {
        return NextResponse.json(
          { error: "E-posta gönderilemedi. SMTP ayarlarını kontrol edin." },
          { status: 503 }
        );
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[email] Müşteri sipariş maili gönderilemedi:", err);
      return NextResponse.json(
        { error: "E-posta gönderilemedi." },
        { status: 500 }
      );
    }
  }

  const allowed = [
    "pending_payment",
    "pending",
    "confirmed",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
  if (!status || !allowed.includes(status as (typeof allowed)[number])) {
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });
  }

  const prevStatus = order.status;
  order.status = status as (typeof allowed)[number];
  await saveOrders(orders);
  await syncAllTimeTotals(orders).catch(() => undefined);

  if (
    prevStatus === "pending_payment" &&
    PAID_STATUSES.includes(status as (typeof PAID_STATUSES)[number])
  ) {
    try {
      await sendCustomerPaymentConfirmationEmail(order);
    } catch (err) {
      console.error("[email] Müşteri sipariş maili gönderilemedi:", err);
    }
  }

  return NextResponse.json(order);
}
