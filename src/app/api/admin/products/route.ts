import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts } from "@/lib/db";
import type { Product } from "@/lib/types";
import { slugify } from "@/lib/products";

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

  const image =
    typeof body.image === "string" &&
    /^\/products\/(?:uploads\/)?[a-zA-Z0-9._-]+$/.test(body.image)
      ? body.image
      : "/products/product-1.png";

  const product: Product = {
    id: `prod_${Date.now()}`,
    slug,
    image,
    price: Number(body.price) || 0,
    category: body.category || "",
    nameTr: body.nameTr || "",
    nameEn: body.nameEn || "",
    descTr: body.descTr || "",
    descEn: body.descEn || "",
    inStock: body.inStock !== false,
  };

  products.push(product);
  await saveProducts(products);
  return NextResponse.json(product, { status: 201 });
}
