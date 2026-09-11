import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts } from "@/lib/db";
import {
  applyAmountDiscount,
  applyPercentDiscount,
  clearDiscount,
} from "@/lib/product-discount";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const productIds = Array.isArray((body as { productIds?: unknown }).productIds)
    ? ((body as { productIds: unknown[] }).productIds.filter(
        (id) => typeof id === "string"
      ) as string[])
    : [];

  if (productIds.length === 0) {
    return NextResponse.json(
      { error: "En az bir ürün seçin" },
      { status: 400 }
    );
  }

  const mode = (body as { mode?: unknown }).mode;
  if (mode !== "percent" && mode !== "amount" && mode !== "clear") {
    return NextResponse.json({ error: "Geçersiz indirim tipi" }, { status: 400 });
  }

  const value = Number((body as { value?: unknown }).value ?? 0);
  if (mode !== "clear") {
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: "Geçersiz indirim değeri" }, { status: 400 });
    }
    if (mode === "percent" && value > 100) {
      return NextResponse.json(
        { error: "Yüzde en fazla 100 olabilir" },
        { status: 400 }
      );
    }
  }

  const products = await getProducts();
  let updated = 0;

  for (const id of productIds) {
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) continue;

    const patch =
      mode === "clear"
        ? clearDiscount(products[index])
        : mode === "percent"
          ? applyPercentDiscount(products[index], value)
          : applyAmountDiscount(products[index], value);

    products[index] = { ...products[index], ...patch };
    updated += 1;
  }

  if (updated === 0) {
    return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
  }

  await saveProducts(products);
  return NextResponse.json({
    updated,
    products: products.filter((p) => productIds.includes(p.id)),
  });
}
