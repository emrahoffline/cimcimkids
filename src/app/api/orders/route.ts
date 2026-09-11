import { NextResponse } from "next/server";
import {
  addNewsletterSubscriber,
  createOrder,
  getProducts,
  type Order,
} from "@/lib/db";
import { sendOrderNotificationEmail, sendCustomerOrderReceivedEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { randomBytes } from "crypto";
import {
  GIFT_CARD_IMAGE,
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
  isGiftCardProductId,
  normalizeGiftCardCode,
  parseGiftCardAmount,
  payableTotal,
} from "@/lib/gift-cards";
import { normalizeTaxId, type InvoiceBuyerKind } from "@/lib/tax-id";
import {
  IyzicoError,
  initializeCheckoutForm,
  isIyzicoConfigured,
} from "@/lib/iyzico";
import { finalizePaidOrder } from "@/lib/order-fulfillment";
import { prisma } from "@/lib/prisma";
import { upsertShopperState } from "@/lib/shopper-db";
import { isGiftWrapProductId } from "@/lib/gift-wrap";
import { getShippingFee } from "@/lib/store-config";
import { isShippingProductId, shippingLine } from "@/lib/shipping";

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

  const invoiceKindRaw = String(
    (body as { invoiceKind?: unknown }).invoiceKind ?? "individual"
  );
  const invoiceKind: InvoiceBuyerKind =
    invoiceKindRaw === "corporate" ? "corporate" : "individual";
  const taxId = normalizeTaxId(
    invoiceKind,
    String((body as { taxId?: unknown }).taxId ?? "")
  );
  if (invoiceKind === "corporate" && !taxId) {
    return NextResponse.json(
      { error: "Geçerli bir VKN (10 hane) gereklidir." },
      { status: 400 }
    );
  }

  const companyTitle = isNonEmptyString(
    (body as { companyTitle?: unknown }).companyTitle
  )
    ? String((body as { companyTitle: string }).companyTitle).trim().slice(0, 200)
    : "";
  const taxOffice = isNonEmptyString((body as { taxOffice?: unknown }).taxOffice)
    ? String((body as { taxOffice: string }).taxOffice).trim().slice(0, 120)
    : "";
  if (invoiceKind === "corporate") {
    if (!companyTitle) {
      return NextResponse.json(
        { error: "Firma unvanı gereklidir." },
        { status: 400 }
      );
    }
    if (!taxOffice) {
      return NextResponse.json(
        { error: "Vergi dairesi gereklidir." },
        { status: 400 }
      );
    }
  }

  const invoiceDistrict = isNonEmptyString(
    (body as { district?: unknown }).district
  )
    ? String((body as { district: string }).district).trim().slice(0, 80)
    : "";
  const invoiceCity = isNonEmptyString((body as { city?: unknown }).city)
    ? String((body as { city: string }).city).trim().slice(0, 80)
    : "";
  if (!invoiceDistrict || !invoiceCity) {
    return NextResponse.json(
      { error: "İl ve ilçe gereklidir." },
      { status: 400 }
    );
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

    if (isGiftWrapProductId(row.productId) || isShippingProductId(row.productId)) {
      continue;
    }

    if (isGiftCardProductId(row.productId)) {
      const amount = parseGiftCardAmount(row.productId);
      if (
        amount == null ||
        amount < GIFT_CARD_MIN_AMOUNT ||
        amount > GIFT_CARD_MAX_AMOUNT
      ) {
        return NextResponse.json(
          { error: "Geçersiz hediye kartı tutarı." },
          { status: 400 }
        );
      }
      serverTotal += amount * quantity;
      validatedItems.push({
        productId: row.productId,
        name: `Hediye Kartı (${amount} TL)`,
        price: amount,
        quantity,
        image: GIFT_CARD_IMAGE,
      });
      continue;
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
    const colorLabel =
      typeof row.colorLabel === "string" && row.colorLabel.trim()
        ? row.colorLabel.trim().slice(0, 40)
        : "";
    const ageLabel =
      typeof row.ageLabel === "string" && row.ageLabel.trim()
        ? row.ageLabel.trim().slice(0, 40)
        : "";
    const baseName = product.nameTr || product.nameEn;
    const extras = [ageLabel, colorLabel].filter(Boolean).join(", ");
    validatedItems.push({
      productId: product.id,
      name: extras ? `${baseName} (${extras})` : baseName,
      price: product.price,
      quantity,
      image: product.image,
    });
  }

  const locale =
    (body as { locale?: unknown }).locale === "en" ? "en" : "tr";

  const physicalTotal = validatedItems
    .filter((i) => !isGiftCardProductId(i.productId) && !isGiftWrapProductId(i.productId))
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingFee = getShippingFee(physicalTotal);
  if (shippingFee > 0) {
    serverTotal += shippingFee;
    validatedItems.push(shippingLine(locale, shippingFee));
  }

  if (serverTotal <= 0) {
    return NextResponse.json({ error: "Geçersiz tutar." }, { status: 400 });
  }
  if (serverTotal > 1_000_000) {
    return NextResponse.json({ error: "Tutar limiti aşıldı." }, { status: 400 });
  }

  const paymentMethodRaw = String(
    (body as { paymentMethod?: unknown }).paymentMethod ?? "bank_transfer"
  );
  const paymentMethod =
    paymentMethodRaw === "card" ? ("card" as const) : ("bank_transfer" as const);

  if (paymentMethod === "card" && !isIyzicoConfigured()) {
    return NextResponse.json(
      { error: "Kart ile ödeme şu an kullanılamıyor. Havale/EFT seçin." },
      { status: 400 }
    );
  }

  const giftCardCodeRaw = isNonEmptyString(
    (body as { giftCardCode?: unknown }).giftCardCode
  )
    ? normalizeGiftCardCode(String((body as { giftCardCode: string }).giftCardCode))
    : "";

  const discountCodeRaw = isNonEmptyString(
    (body as { discountCode?: unknown }).discountCode
  )
    ? String((body as { discountCode: string }).discountCode)
    : "";

  let order: Order;
  try {
    order = await createOrder({
      orderNumber: makeOrderNumber(),
      customerEmail: emailRaw,
      customerName: name,
      customerPhone: isNonEmptyString((body as { phone?: unknown }).phone)
        ? String((body as { phone: string }).phone).slice(0, 50)
        : undefined,
      items: validatedItems,
      subtotal: serverTotal,
      total: payableTotal(serverTotal, 0),
      status: "pending_payment",
      shippingAddress: `${address}, ${invoiceDistrict}, ${invoiceCity}`,
      invoiceKind,
      taxId: taxId ?? undefined,
      taxOffice: taxOffice || undefined,
      companyTitle: companyTitle || undefined,
      invoiceDistrict,
      invoiceCity,
      paymentMethod,
      redeemGiftCardCode: giftCardCodeRaw || undefined,
      redeemDiscountCode: discountCodeRaw || undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_GIFT_CARD") {
      return NextResponse.json(
        { error: "Hediye kartı geçersiz veya bakiyesi yetersiz." },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "INVALID_DISCOUNT_CODE") {
      return NextResponse.json(
        { error: "İndirim kodu geçersiz veya bu sepete uygulanamıyor." },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "INVALID_GIFT_CARD_ITEM") {
      return NextResponse.json(
        { error: "Geçersiz hediye kartı ürünü." },
        { status: 400 }
      );
    }
    console.error("[orders] create failed:", err);
    return NextResponse.json(
      { error: "Sipariş oluşturulamadı." },
      { status: 500 }
    );
  }

  // Fully covered by gift card — no card/transfer; confirm and activate any purchased cards
  if (order.total <= 0) {
    try {
      const paid = await finalizePaidOrder(order.id);
      if (paid) order = paid;
    } catch (err) {
      console.error("[orders] gift-card auto-confirm failed:", err);
    }
  }

  const visitorIdRaw = (body as { visitorId?: unknown }).visitorId;
  const visitorId =
    typeof visitorIdRaw === "string" && visitorIdRaw.trim()
      ? visitorIdRaw.trim().slice(0, 80)
      : "";
  if (visitorId) {
    try {
      await upsertShopperState({ email: emailRaw, visitorId });
    } catch (err) {
      console.error("[shopper] visitor link failed:", err);
    }
  }

  let paymentPageUrl: string | undefined;
  let checkoutFormContent: string | undefined;
  if (order.total > 0 && paymentMethod === "card") {
    try {
      const init = await initializeCheckoutForm(order, {
        locale,
        ip,
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentToken: init.token },
      });
      paymentPageUrl = init.paymentPageUrl || undefined;
      checkoutFormContent = init.checkoutFormContent || undefined;
    } catch (err) {
      console.error("[iyzico] initialize failed:", err);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "cancelled" },
      });
      const message =
        err instanceof IyzicoError
          ? err.message
          : "Kart ödemesi başlatılamadı. Havale/EFT deneyin veya tekrar deneyin.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

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

  const notifyNow = order.total <= 0 || paymentMethod !== "card";
  if (notifyNow) {
    if (paymentMethod !== "card" && order.total > 0) {
      try {
        await sendCustomerOrderReceivedEmail(order);
      } catch (err) {
        console.error("[email] Müşteri sipariş e-postası gönderilemedi:", err);
      }
    }

    try {
      await sendOrderNotificationEmail(order);
    } catch (err) {
      console.error("[email] Sipariş bildirimi gönderilemedi:", err);
    }

    try {
      const { sendAdminOrderPush } = await import("@/lib/admin-push");
      await sendAdminOrderPush({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
      });
    } catch (err) {
      console.error("[push] Sipariş push bildirimi gönderilemedi:", err);
    }
  }

  return NextResponse.json(
    {
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      subtotal: order.subtotal,
      giftCardAmount: order.giftCardAmount,
      giftCardCode: order.giftCardCode,
      discountAmount: order.discountAmount,
      discountCode: order.discountCode,
      status: order.status,
      paymentMethod,
      paymentPageUrl,
      checkoutFormContent,
      createdAt: order.createdAt,
    },
    { status: 201 }
  );
}
