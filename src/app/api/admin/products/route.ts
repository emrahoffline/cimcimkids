import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts } from "@/lib/db";
import type { Product } from "@/lib/types";
import { generateProductCode } from "@/lib/product-code";
import { slugify } from "@/lib/product-utils";
import {
  normalizeProductImages,
  parseProductColors,
} from "@/lib/product-variants";
import { normalizeProductAges } from "@/lib/product-ages";

function uniqueProductCode(existing: Product[]): string {
  let code = generateProductCode();
  while (existing.some((p) => p.code === code)) {
    code = generateProductCode();
  }
  return code;
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

  const slug = body.slug || slugify(body.nameTr || body.nameEn);
  if (products.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
  }

  const images = normalizeProductImages(body.images, body.image);
  if (images.length === 0) {
    return NextResponse.json(
      { error: "En az bir ürün görseli gerekli" },
      { status: 400 }
    );
  }

  const ages = normalizeProductAges(body.ages, body.ageRange);
  if (ages.length === 0) {
    return NextResponse.json(
      { error: "En az bir yaş varyantı seçin" },
      { status: 400 }
    );
  }

  const nameTr = String(body.nameTr || "").trim();
  if (!nameTr) {
    return NextResponse.json({ error: "Ürün adı (TR) gerekli" }, { status: 400 });
  }
  const nameEn = String(body.nameEn || "").trim() || nameTr;

  const stockQuantity = Math.max(
    0,
    Math.floor(Number(body.stockQuantity ?? body.stock ?? 0))
  );

  const product: Product = {
    id: `prod_${Date.now()}`,
    code: uniqueProductCode(products),
    slug,
    image: images[0],
    images,
    colors: parseProductColors(body.colors),
    price: Number(body.price) || 0,
    category: body.category || "",
    ageRange: ages[0],
    ages,
    nameTr,
    nameEn,
    descTr: body.descTr || "",
    descEn: body.descEn || body.descTr || "",
    stockQuantity,
    inStock: stockQuantity > 0,
    compareAtPrice: null,
  };

  products.push(product);
  await saveProducts(products);
  return NextResponse.json(product, { status: 201 });
}
