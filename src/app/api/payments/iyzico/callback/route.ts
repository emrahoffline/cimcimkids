import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { retrieveCheckoutForm } from "@/lib/iyzico";
import { finalizePaidOrder } from "@/lib/order-fulfillment";
import { SITE_ORIGIN } from "@/lib/seo";

export const runtime = "nodejs";

function checkoutRedirect(
  locale: string,
  query: Record<string, string>
): NextResponse {
  const origin = (
    process.env.IYZICO_CALLBACK_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    SITE_ORIGIN
  ).replace(/\/$/, "");
  const loc = locale === "en" ? "en" : "tr";
  const params = new URLSearchParams(query);
  return NextResponse.redirect(`${origin}/${loc}/checkout?${params.toString()}`, 303);
}

async function handleCallback(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  let locale = url.searchParams.get("locale") === "en" ? "en" : "tr";
  let token = url.searchParams.get("token") ?? "";

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      token = String(form.get("token") ?? token);
      if (form.get("locale")) locale = String(form.get("locale")) === "en" ? "en" : locale;
    } else {
      const body = await request.json().catch(() => null);
      if (body && typeof body === "object") {
        const row = body as { token?: unknown; locale?: unknown };
        if (typeof row.token === "string") token = row.token;
        if (row.locale === "en") locale = "en";
      }
    }
  }

  if (!token) {
    return checkoutRedirect(locale, { payment: "fail" });
  }

  try {
    const result = await retrieveCheckoutForm(token);
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ paymentToken: token }, { orderNumber: result.conversationId ?? "" }],
      },
    });

    if (!order) {
      return checkoutRedirect(locale, { payment: "fail" });
    }

    if (result.paymentStatus === "SUCCESS" && result.fraudStatus !== -1) {
      await finalizePaidOrder(order.id, {
        iyzicoPaymentId: result.paymentId ?? null,
        lastFourDigits: result.lastFourDigits ?? null,
        cardType: result.cardFamily || result.cardType || null,
        notifyAdmin: true,
      });
      return checkoutRedirect(locale, {
        payment: "success",
        order: order.orderNumber,
      });
    }

    return checkoutRedirect(locale, {
      payment: "fail",
      order: order.orderNumber,
    });
  } catch (err) {
    console.error("[iyzico] callback failed:", err);
    return checkoutRedirect(locale, { payment: "fail" });
  }
}

export async function POST(request: Request) {
  return handleCallback(request);
}

export async function GET(request: Request) {
  return handleCallback(request);
}
