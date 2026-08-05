import { NextResponse } from "next/server";
import {
  addNewsletterSubscriber,
  createOrder,
  getProducts,
} from "@/lib/db";
import {
  sendNewsletterWelcomeEmail,
  sendOrderNotificationEmail,
} from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function clampInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < min || i > max) return null;
  return i;
}

function makeOrderNumber(): string {
  return `CK-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(ip, { windowMs: 60_000, max: 10, keyPrefix: "orders" });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (!(body as { kvkkConsent?: unknown }).kvkkConsent) {
    return NextResponse.json(
      { error: "KVKK onayı gereklidir." },
      { status: 400 }
    );
  }

  const emailRaw = isNonEmptyString((body as { email?: unknown }).email)
    ? String((body as { email: string }).email).trim().toLowerCase().slice(0, 200)
    : "";
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return NextResponse.json(
      { error: "Geçerli bir e-posta adresi gereklidir." },
      { status: 400 }
    );
  }

  const name = isNonEmptyString((body as { name?: unknown }).name)
    ? String((body as { name: string }).name).trim().slice(0, 200)
    : "";
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Ad soyad gereklidir." }, { status: 400 });
  }

  const address = isNonEmptyString((body as { address?: unknown }).address)
    ? String((body as { address: string }).address).trim().slice(0, 500)
    : "";
  if (!address || address.length < 5) {
    return NextResponse.json({ error: "Adres gereklidir." }, { status: 400 });
  }

  const itemsRaw = Array.isArray((body as { items?: unknown }).items)
    ? (body as { items: unknown[] }).items
    : [];
  if (itemsRaw.length === 0) {
    return NextResponse.json({ error: "Sepet boş." }, { status: 400 });
  }
  if (itemsRaw.length > 50) {
    return NextResponse.json({ error: "Sepet çok büyük." }, { status: 400 });
  }

  const products = await getProducts();
  let serverTotal = 0;
  const validatedItems: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }> = [];

  for (const item of itemsRaw) {
    if (!item || typeof item !== "object") {
      return NextResponse.json({ error: "Geçersiz ürünler." }, { status: 400 });
    }
    const row = item as Record<string, unknown>;
    if (!isNonEmptyString(row.productId)) {
      return NextResponse.json({ error: "Geçersiz ürünler." }, { status: 400 });
    }
    const quantity = clampInt(row.quantity, 1, 25);
    if (quantity == null) {
      return NextResponse.json({ error: "Geçersiz adet." }, { status: 400 });
    }

    const product = products.find((p) => p.id === row.productId);
    if (!product) {
      return NextResponse.json(
        { error: "Sepetteki ürünlerden biri bulunamadı." },
        { status: 400 }
      );
    }
    if (!product.inStock) {
      return NextResponse.json(
        { error: `"${product.nameTr}" stokta yok.` },
        { status: 400 }
      );
    }
    if (!Number.isFinite(product.price) || product.price < 0) {
      return NextResponse.json({ error: "Geçersiz tutar." }, { status: 400 });
    }

    serverTotal += product.price * quantity;
    validatedItems.push({
      productId: product.id,
      name: product.nameTr || product.nameEn,
      price: product.price,
      quantity,
      image: product.image,
    });
  }

  if (serverTotal <= 0) {
    return NextResponse.json({ error: "Geçersiz tutar." }, { status: 400 });
  }
  if (serverTotal > 1_000_000) {
    return NextResponse.json({ error: "Tutar limiti aşıldı." }, { status: 400 });
  }

  const locale =
    (body as { locale?: unknown }).locale === "en" ? "en" : "tr";

  const order = await createOrder({
    orderNumber: makeOrderNumber(),
    customerEmail: emailRaw,
    customerName: name,
    customerPhone: isNonEmptyString((body as { phone?: unknown }).phone)
      ? String((body as { phone: string }).phone).slice(0, 50)
      : undefined,
    items: validatedItems,
    total: serverTotal,
    status: "pending_payment",
    shippingAddress: address,
  });

  // Marketing: kayıt et ama hoş geldin mailini hemen gönderme (spam / mail bomb riski).
  // Abone listesine eklenir; kampanya gönderimi admin onaylı süreçle yapılmalı.
  if ((body as { marketingConsent?: unknown }).marketingConsent === true) {
    try {
      await addNewsletterSubscriber({
        email: emailRaw,
        locale,
        source: "checkout",
      });
    } catch (err) {
      console.error("[newsletter] checkout abone kaydı başarısız:", err);
    }
  }

  try {
    await sendOrderNotificationEmail(order);
  } catch (err) {
    console.error("[email] Sipariş bildirimi gönderilemedi:", err);
  }

  return NextResponse.json(
    {
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
    },
    { status: 201 }
  );
}
