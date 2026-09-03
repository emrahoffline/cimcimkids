import { NextResponse } from "next/server";
import {
  amountsMatch,
  retrieveCheckoutForm,
} from "@/lib/iyzico";
import {
  getOrderByNumber,
  getOrderByPaymentToken,
  markOrderPaid,
  type Order,
} from "@/lib/db";
import { sendOrderNotificationEmail, sendCustomerPaymentConfirmationEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { SITE_ORIGIN } from "@/lib/seo";

function resultUrl(
  locale: string,
  status: "success" | "failure" | "pending",
  orderNumber?: string
) {
  const origin = (process.env.NEXTAUTH_URL?.trim() || SITE_ORIGIN).replace(
    /\/$/,
    ""
  );
  const params = new URLSearchParams({ status });
  if (orderNumber) params.set("order", orderNumber);
  return `${origin}/${locale}/checkout/result?${params.toString()}`;
}

function parseLocale(value: string | null): "tr" | "en" {
  return value === "en" ? "en" : "tr";
}

async function notifyCustomerPaid(order: Order) {
  try {
    await sendCustomerPaymentConfirmationEmail(order);
  } catch (err) {
    console.error("[email] Müşteri sipariş maili gönderilemedi:", err);
  }
}

async function notifyPaid(order: Order) {
  try {
    await sendOrderNotificationEmail(order);
  } catch (err) {
    console.error("[email] Ödenen sipariş bildirimi gönderilemedi:", err);
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, {
    windowMs: 60_000,
    max: 40,
    keyPrefix: "iyzico-callback",
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const locale = parseLocale(url.searchParams.get("locale"));

  let token = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as { token?: unknown };
      token = typeof json.token === "string" ? json.token.trim() : "";
    } else {
      const form = await request.formData();
      token = String(form.get("token") ?? "").trim();
    }
  } catch {
    token = "";
  }

  if (!token || token.length > 200) {
    return NextResponse.redirect(resultUrl(locale, "failure"), 303);
  }

  let retrieved;
  try {
    retrieved = await retrieveCheckoutForm(token, locale);
  } catch (err) {
    console.error("[iyzico] Ödeme sonucu alınamadı:", err);
    return NextResponse.redirect(resultUrl(locale, "failure"), 303);
  }

  const order =
    (await getOrderByPaymentToken(token)) ??
    (retrieved.conversationId
      ? await getOrderByNumber(retrieved.conversationId)
      : null);

  if (!order) {
    return NextResponse.redirect(resultUrl(locale, "failure"), 303);
  }

  const paymentStatus = (retrieved.paymentStatus ?? "").toUpperCase();
  const apiOk = retrieved.status === "success";
  const paidOk = apiOk && paymentStatus === "SUCCESS";

  const conversationOk =
    retrieved.conversationId === order.orderNumber ||
    retrieved.basketId === order.orderNumber;
  if (
    !paidOk ||
    !conversationOk ||
    !retrieved.paymentId ||
    !amountsMatch(retrieved.paidPrice, order.total)
  ) {
    console.error("[iyzico] callback reddedildi", {
      orderNumber: order.orderNumber,
      status: retrieved.status,
      paymentStatus: retrieved.paymentStatus,
      conversationId: retrieved.conversationId,
      basketId: retrieved.basketId,
      paymentId: retrieved.paymentId,
      paidPrice: retrieved.paidPrice,
      expected: order.total,
    });
    return NextResponse.redirect(
      resultUrl(locale, "failure", order.orderNumber),
      303
    );
  }

  const fraud = retrieved.fraudStatus;
  if (fraud === -1) {
    return NextResponse.redirect(
      resultUrl(locale, "failure", order.orderNumber),
      303
    );
  }

  const nextStatus = fraud === 0 ? "pending" : "confirmed";
  const firstPayment = order.status === "pending_payment";
  const updated = await markOrderPaid({
    orderId: order.id,
    paymentId: String(retrieved.paymentId),
    lastFour: retrieved.lastFourDigits,
    cardFamily: retrieved.cardFamily,
    nextStatus,
  });

  if (updated && firstPayment) {
    await notifyCustomerPaid(updated);
    if (nextStatus === "confirmed") {
      await notifyPaid(updated);
    }
  }

  return NextResponse.redirect(
    resultUrl(
      locale,
      nextStatus === "confirmed" ? "success" : "pending",
      order.orderNumber
    ),
    303
  );
}
