import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { agesMatch } from "@/lib/product-ages";
import {
  colorHasSizeStock,
  findProductColor,
  usesColorStock,
} from "@/lib/product-stock";
import { parseProductColors } from "@/lib/product-variants";
import { prisma, requireDatabaseUrl } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(ip, {
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyPrefix: "stock-notifications",
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen daha sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const row = body as Record<string, unknown>;
  const productId =
    typeof row.productId === "string" ? row.productId.trim().slice(0, 100) : "";
  const requestedAge =
    typeof row.ageLabel === "string" ? row.ageLabel.trim().slice(0, 40) : "";
  const email =
    typeof row.email === "string"
      ? row.email.trim().toLowerCase().slice(0, 200)
      : "";
  const locale = row.locale === "en" ? "en" : "tr";
  if (!productId || !requestedAge || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Geçerli bir beden ve e-posta adresi gereklidir." },
      { status: 400 }
    );
  }

  requireDatabaseUrl();
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { sizeStocks: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }
  const ageLabel = product.ages.find((age) => agesMatch(age, requestedAge));
  if (!ageLabel) {
    return NextResponse.json({ error: "Beden bulunamadı." }, { status: 400 });
  }
  const colors = parseProductColors(product.colors);
  if (usesColorStock({ colors })) {
    const requestedColorId =
      typeof row.colorId === "string" ? row.colorId.trim().slice(0, 40) : "";
    const color = findProductColor({ colors }, requestedColorId);
    if (!color) {
      return NextResponse.json(
        { error: "Renk bulunamadı." },
        { status: 400 }
      );
    }
    const sizeLeft = colorHasSizeStock(color)
      ? (color.sizeStock?.[ageLabel] ?? 0)
      : null;
    if (sizeLeft !== null ? sizeLeft > 0 : (color.stock ?? 0) > 0) {
      return NextResponse.json(
        {
          error: sizeLeft !== null
            ? "Bu beden şu anda stokta."
            : "Bu renk şu anda stokta.",
        },
        { status: 409 }
      );
    }
  } else {
    const sizeStock = product.sizeStocks.find(
      (stock) => stock.ageLabel === ageLabel
    );
    if (!sizeStock || sizeStock.stockQuantity > 0) {
      return NextResponse.json(
        { error: "Bu beden şu anda stokta." },
        { status: 409 }
      );
    }
  }

  await prisma.stockNotification.upsert({
    where: {
      productId_ageLabel_email: { productId, ageLabel, email },
    },
    create: {
      id: randomUUID(),
      productId,
      ageLabel,
      email,
      locale,
    },
    update: {
      locale,
      sentAt: null,
      claimedAt: null,
      createdAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
