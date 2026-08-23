import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts, ensureOutfitsCategory } from "@/lib/db";
import type { Product } from "@/lib/types";
import { slugify } from "@/lib/products";
import {
  filledOutfitSlots,
  hydrateOutfitSlots,
  outfitCoverImage,
  resolveOutfitPricing,
} from "@/lib/outfit";

function isSafeImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/products\/(?:uploads\/)?[a-zA-Z0-9._-]+$/.test(value)
  );
}

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();
  const products = await getProducts();
  const isOutfit = body.kind === "outfit";

  const slug = body.slug || slugify(body.nameTr || body.nameEn);
  if (!slug) {
    return NextResponse.json({ error: "Geçerli bir ad girin" }, { status: 400 });
  }
  if (products.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
  }

  const outfitSlots = isOutfit
    ? hydrateOutfitSlots(body.outfitSlots, products)
    : undefined;
  if (isOutfit && filledOutfitSlots(outfitSlots ?? {}).length === 0) {
    return NextResponse.json(
      { error: "Kombine en az bir parça ekleyin" },
      { status: 400 }
    );
  }

  const pricing = isOutfit
    ? resolveOutfitPricing(
        outfitSlots ?? {},
        body.useCustomPrice ? Number(body.price) : null
      )
    : null;

  const image = isSafeImage(body.image)
    ? body.image
    : isOutfit
      ? outfitCoverImage(outfitSlots ?? {})
      : "/products/product-1.png";

  if (isOutfit && !image) {
    return NextResponse.json(
      { error: "Kombin için bir görsel yükleyin veya görseli olan parça seçin" },
      { status: 400 }
    );
  }

  const product: Product = {
    id: `prod_${Date.now()}`,
    slug,
    image: image || "/products/product-1.png",
    price: pricing ? pricing.price : Number(body.price) || 0,
    category: body.category || (isOutfit ? "outfits" : ""),
    nameTr: String(body.nameTr || "").trim(),
    nameEn: String(body.nameEn || body.nameTr || "").trim(),
    descTr: body.descTr || "",
    descEn: body.descEn || "",
    inStock: body.inStock !== false,
    ...(isOutfit
      ? {
          kind: "outfit" as const,
          outfitSlots,
          compareAtPrice: pricing?.compareAtPrice ?? null,
        }
      : { kind: "product" as const }),
  };

  if (!product.nameTr) {
    return NextResponse.json({ error: "Ürün adı (TR) gerekli" }, { status: 400 });
  }

  if (isOutfit) {
    await ensureOutfitsCategory();
  }

  products.push(product);
  await saveProducts(products);
  return NextResponse.json(product, { status: 201 });
}
