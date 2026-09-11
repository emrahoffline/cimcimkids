import "server-only";
import { createHmac, randomBytes } from "crypto";
import { isGiftCardProductId } from "@/lib/gift-cards";
import { isGiftWrapProductId } from "@/lib/gift-wrap";
import { isShippingProductId } from "@/lib/shipping";
import { SITE_ORIGIN } from "@/lib/seo";
import { buyerTaxNumberForProviders } from "@/lib/tax-id";
import type { Order } from "@/lib/db";

export class IyzicoError extends Error {
  status: number;
  body: string;

  constructor(message: string, status = 502, body = "") {
    super(message);
    this.name = "IyzicoError";
    this.status = status;
    this.body = body;
  }
}

export function isIyzicoConfigured(): boolean {
  return Boolean(
    process.env.IYZICO_API_KEY?.trim() && process.env.IYZICO_SECRET_KEY?.trim()
  );
}

function getIyzicoConfig() {
  const apiKey = process.env.IYZICO_API_KEY?.trim() ?? "";
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim() ?? "";
  const baseUrl = (
    process.env.IYZICO_URI?.trim() || "https://api.iyzipay.com"
  ).replace(/\/$/, "");
  const callbackOrigin = (
    process.env.IYZICO_CALLBACK_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    SITE_ORIGIN
  ).replace(/\/$/, "");
  if (!apiKey || !secretKey) {
    throw new IyzicoError("IYZICO_API_KEY / IYZICO_SECRET_KEY tanımlı değil.", 500);
  }
  return { apiKey, secretKey, baseUrl, callbackOrigin };
}

function money(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function splitName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Musteri", surname: "Musteri" };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

export function toIyzicoGsm(phone?: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `+90${digits}`;
  if (digits.length === 11 && digits.startsWith("05")) return `+90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("90")) return `+${digits.slice(0, 12)}`;
  return "+905000000000";
}

function identityNumber(order: Order): string {
  return buyerTaxNumberForProviders(order.taxId);
}

function authorizationHeader(
  apiKey: string,
  secretKey: string,
  uriPath: string,
  bodyJson: string,
  randomKey: string
): string {
  const signature = createHmac("sha256", secretKey)
    .update(randomKey + uriPath + bodyJson)
    .digest("hex");
  const raw = `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(raw).toString("base64")}`;
}

async function iyzicoPost<T>(path: string, payload: unknown): Promise<T> {
  const { apiKey, secretKey, baseUrl } = getIyzicoConfig();
  const bodyJson = JSON.stringify(payload);
  const randomKey = `${Date.now()}${randomBytes(8).toString("hex")}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(apiKey, secretKey, path, bodyJson, randomKey),
      "x-iyzi-rnd": randomKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyJson,
    cache: "no-store",
  });
  const text = await res.text();
  let json: T & { status?: string; errorMessage?: string; errorCode?: string };
  try {
    json = JSON.parse(text) as T & {
      status?: string;
      errorMessage?: string;
      errorCode?: string;
    };
  } catch {
    throw new IyzicoError(`iyzico yanıtı okunamadı (${res.status}).`, res.status, text.slice(0, 2000));
  }
  if (!res.ok || json.status === "failure") {
    throw new IyzicoError(
      json.errorMessage || `iyzico HTTP ${res.status}`,
      res.status || 502,
      text.slice(0, 2000)
    );
  }
  return json;
}

export type CheckoutFormInit = {
  token: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
};

export type CheckoutFormResult = {
  paymentStatus?: string;
  paymentId?: string;
  lastFourDigits?: string;
  cardType?: string;
  cardFamily?: string;
  conversationId?: string;
  basketId?: string;
  fraudStatus?: number;
};

export async function initializeCheckoutForm(
  order: Order,
  opts: { locale: "tr" | "en"; ip: string }
): Promise<CheckoutFormInit> {
  const { callbackOrigin } = getIyzicoConfig();
  const { name, surname } = splitName(order.customerName);
  const address =
    order.shippingAddress ||
    [order.invoiceDistrict, order.invoiceCity].filter(Boolean).join(", ") ||
    "Türkiye";
  const city = order.invoiceCity || "Türkiye";
  const basketItems = order.items.map((item, idx) => ({
    id: (item.productId || `item-${idx}`).slice(0, 64),
    name: item.name.slice(0, 120),
    category1: isGiftWrapProductId(item.productId)
      ? "Hediye"
      : isShippingProductId(item.productId)
        ? "Kargo"
        : isGiftCardProductId(item.productId)
          ? "Hediye kartı"
          : "Giyim",
    itemType: isGiftCardProductId(item.productId) ? "VIRTUAL" : "PHYSICAL",
    price: money(item.price * item.quantity),
  }));
  const price = money(
    order.subtotal ??
      order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const paidPrice = money(order.total);
  const basketSum = basketItems.reduce((sum, item) => sum + Number(item.price), 0);
  const drift = Math.round((Number(price) - basketSum) * 100) / 100;
  if (drift !== 0 && basketItems.length > 0) {
    const last = basketItems[basketItems.length - 1];
    last.price = money(Number(last.price) + drift);
  }
  const payload = {
    locale: opts.locale === "en" ? "en" : "tr",
    conversationId: order.orderNumber,
    price,
    paidPrice,
    currency: "TRY",
    basketId: order.id,
    paymentGroup: "PRODUCT",
    callbackUrl: `${callbackOrigin}/api/payments/iyzico/callback?locale=${opts.locale}`,
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer: {
      id: order.id.slice(0, 32),
      name,
      surname,
      gsmNumber: toIyzicoGsm(order.customerPhone),
      email: order.customerEmail,
      identityNumber: identityNumber(order),
      lastLoginDate: "2015-10-05 12:43:35",
      registrationDate: "2013-04-21 15:12:09",
      registrationAddress: address,
      ip: opts.ip === "unknown" ? "172.16.0.1" : opts.ip,
      city,
      country: "Turkey",
      zipCode: "07000",
    },
    shippingAddress: {
      contactName: order.customerName,
      city,
      country: "Turkey",
      address,
      zipCode: "07000",
    },
    billingAddress: {
      contactName: order.companyTitle || order.customerName,
      city,
      country: "Turkey",
      address,
      zipCode: "07000",
    },
    basketItems,
  };

  const result = await iyzicoPost<CheckoutFormInit>(
    "/payment/iyzipos/checkoutform/initialize/auth/ecom",
    payload
  );
  if (!result.token) {
    throw new IyzicoError("iyzico ödeme formu token dönmedi.", 502, JSON.stringify(result));
  }
  return result;
}

export async function retrieveCheckoutForm(token: string): Promise<CheckoutFormResult> {
  return iyzicoPost<CheckoutFormResult>(
    "/payment/iyzipos/checkoutform/auth/ecom/detail",
    { locale: "tr", token }
  );
}
