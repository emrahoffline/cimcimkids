import "server-only";
import { createHmac, randomBytes } from "crypto";
import { SITE_ORIGIN } from "./seo";
import type { Order } from "./db";

const INIT_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const RETRIEVE_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

/** iyzico requires an 11-digit value; we do not collect national ID. */
const PLACEHOLDER_IDENTITY = "11111111111";

export class IyzicoError extends Error {
  constructor(
    message: string,
    readonly errorCode?: string
  ) {
    super(message);
    this.name = "IyzicoError";
  }
}

export function isCardPaymentEnabled(): boolean {
  return Boolean(
    process.env.IYZICO_API_KEY?.trim() && process.env.IYZICO_SECRET_KEY?.trim()
  );
}

export function getPublicOrigin(): string {
  const raw =
    process.env.IYZICO_CALLBACK_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    SITE_ORIGIN;
  return raw.replace(/\/$/, "");
}

export function toIyzicoMoney(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function normalizeGsm(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }
  if (digits.startsWith("0") && digits.length >= 11) {
    return `+90${digits.slice(1, 11)}`;
  }
  if (digits.length === 10) {
    return `+90${digits}`;
  }
  return null;
}

function splitName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "Musteri", surname: "Musteri" };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts[0], surname: parts.slice(1).join(" ") };
}

function getCredentials(): {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
} | null {
  const apiKey = process.env.IYZICO_API_KEY?.trim();
  const secretKey = process.env.IYZICO_SECRET_KEY?.trim();
  if (!apiKey || !secretKey) return null;
  const baseUrl = (
    process.env.IYZICO_URI?.trim() || "https://api.iyzipay.com"
  ).replace(/\/$/, "");
  return { apiKey, secretKey, baseUrl };
}

function authorizationHeader(
  apiKey: string,
  secretKey: string,
  randomKey: string,
  uriPath: string,
  body: string
): string {
  const signature = createHmac("sha256", secretKey)
    .update(randomKey + uriPath + body)
    .digest("hex");
  const encoded = Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`
  ).toString("base64");
  return `IYZWSv2 ${encoded}`;
}

async function iyzicoPost<T>(path: string, payload: unknown): Promise<T> {
  const creds = getCredentials();
  if (!creds) {
    throw new IyzicoError("Kart ödemesi yapılandırılmamış.");
  }

  const body = JSON.stringify(payload);
  const randomKey = `${Date.now()}${randomBytes(8).toString("hex")}`;
  const res = await fetch(`${creds.baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(
        creds.apiKey,
        creds.secretKey,
        randomKey,
        path,
        body
      ),
      "Content-Type": "application/json",
      "x-iyzi-rnd": randomKey,
    },
    body,
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as T & {
    status?: string;
    errorMessage?: string;
    errorCode?: string;
  };

  if (!res.ok || json?.status === "failure") {
    throw new IyzicoError(
      json?.errorMessage || "iyzico isteği başarısız.",
      json?.errorCode
    );
  }

  return json;
}

function basketItemsFor(order: Order) {
  const items = order.items.map((item, index) => ({
    id: item.productId.slice(0, 64) || `item-${index}`,
    name: item.name.slice(0, 200) || "Ürün",
    category1: "Giyim",
    itemType: "PHYSICAL" as const,
    price: toIyzicoMoney(item.price * item.quantity),
  }));

  const target = Math.round(order.total * 100);
  const sum = items.reduce(
    (acc, item) => acc + Math.round(Number(item.price) * 100),
    0
  );
  const drift = target - sum;
  if (drift !== 0 && items.length > 0) {
    const last = items[items.length - 1];
    last.price = ((Math.round(Number(last.price) * 100) + drift) / 100).toFixed(
      2
    );
  }

  return items;
}

export type CheckoutFormInit = {
  token: string;
  paymentPageUrl: string;
};

export async function initializeCheckoutForm(input: {
  order: Order;
  locale: "tr" | "en";
  ip: string;
  city: string;
  callbackUrl: string;
}): Promise<CheckoutFormInit> {
  const { order, locale, ip, city, callbackUrl } = input;
  const gsmNumber = normalizeGsm(order.customerPhone ?? "");
  if (!gsmNumber) {
    throw new IyzicoError("Geçerli bir telefon numarası gereklidir.");
  }

  const { name, surname } = splitName(order.customerName);
  const address = (order.shippingAddress ?? "").slice(0, 500);
  const paidPrice = toIyzicoMoney(order.total);
  const items = basketItemsFor(order);

  const result = await iyzicoPost<{
    token?: string;
    paymentPageUrl?: string;
  }>(INIT_PATH, {
    locale,
    conversationId: order.orderNumber,
    price: paidPrice,
    paidPrice,
    currency: "TRY",
    basketId: order.orderNumber,
    paymentGroup: "PRODUCT",
    callbackUrl,
    enabledInstallments: [1, 2, 3, 6, 9, 12],
    buyer: {
      id: order.id.slice(0, 64),
      name,
      surname,
      gsmNumber,
      email: order.customerEmail,
      identityNumber: PLACEHOLDER_IDENTITY,
      registrationAddress: address,
      city: city.slice(0, 100) || "Turkiye",
      country: "Turkey",
      ip: ip.slice(0, 45) || "127.0.0.1",
    },
    shippingAddress: {
      contactName: order.customerName.slice(0, 200),
      city: city.slice(0, 100) || "Turkiye",
      country: "Turkey",
      address,
    },
    billingAddress: {
      contactName: order.customerName.slice(0, 200),
      city: city.slice(0, 100) || "Turkiye",
      country: "Turkey",
      address,
    },
    basketItems: items,
  });

  if (!result.token || !result.paymentPageUrl) {
    throw new IyzicoError("Ödeme sayfası oluşturulamadı.");
  }

  return {
    token: result.token,
    paymentPageUrl: result.paymentPageUrl,
  };
}

export type CheckoutFormResult = {
  status: string;
  paymentStatus?: string;
  conversationId?: string;
  basketId?: string;
  paymentId?: string;
  paidPrice?: string | number;
  fraudStatus?: number;
  lastFourDigits?: string;
  cardFamily?: string;
  token?: string;
  errorMessage?: string;
};

export async function retrieveCheckoutForm(
  token: string,
  locale: "tr" | "en" = "tr"
): Promise<CheckoutFormResult> {
  const result = await iyzicoPost<CheckoutFormResult & { basketId?: string }>(
    RETRIEVE_PATH,
    { locale, token }
  );
  return {
    ...result,
    conversationId: result.conversationId || result.basketId,
  };
}

export function amountsMatch(
  paidPrice: string | number | undefined,
  expected: number
): boolean {
  const paid = Number(paidPrice);
  if (!Number.isFinite(paid)) return false;
  return Math.abs(paid - expected) < 0.05;
}
