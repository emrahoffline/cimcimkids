import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts } from "@/lib/db";
import { slugify } from "@/lib/product-utils";
import {
  normalizeProductImages,
  parseProductColors,
} from "@/lib/product-variants";
import { normalizeProductAges } from "@/lib/product-ages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;
  const { id } = await params;
  const products = await getProducts();
  const product = products.find((p) => p.id === id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slug =
    body.slug ||
    slugify(body.nameTr || products[index].nameTr) ||
    products[index].slug;

  if (products.some((p) => p.slug === slug && p.id !== id)) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
  }

  const images = normalizeProductImages(
    body.images ?? products[index].images,
    body.image ?? products[index].image
  );
  if (images.length === 0) {
    return NextResponse.json(
      { error: "En az bir ürün görseli gerekli" },
      { status: 400 }
    );
  }

  const ages = normalizeProductAges(
    body.ages ?? products[index].ages,
    body.ageRange ?? products[index].ageRange
  );
  if (ages.length === 0) {
    return NextResponse.json(
      { error: "En az bir yaş varyantı seçin" },
      { status: 400 }
    );
  }

  const colors =
    body.colors !== undefined
      ? parseProductColors(body.colors)
      : products[index].colors;

  const nameTr = String(body.nameTr ?? products[index].nameTr).trim();
  if (!nameTr) {
    return NextResponse.json({ error: "Ürün adı (TR) gerekli" }, { status: 400 });
  }
  const nameEn =
    body.nameEn !== undefined
      ? String(body.nameEn).trim() || nameTr
      : products[index].nameEn || nameTr;

  const stockQuantity =
    body.stockQuantity !== undefined || body.stock !== undefined
      ? Math.max(
          0,
          Math.floor(Number(body.stockQuantity ?? body.stock ?? 0))
        )
      : products[index].stockQuantity ?? 0;

  products[index] = {
    ...products[index],
    slug,
    image: images[0],
    images,
    colors,
    price: Number.isFinite(Number(body.price))
      ? Number(body.price)
      : products[index].price,
    category: body.category ?? products[index].category,
    ageRange: ages[0],
    ages,
    nameTr,
    nameEn,
    descTr: body.descTr ?? products[index].descTr,
    descEn: body.descEn ?? products[index].descEn,
    stockQuantity,
    inStock: stockQuantity > 0,
  };

  await saveProducts(products);
  return NextResponse.json(products[index]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { id } = await params;
  const products = await getProducts();
  const filtered = products.filter((p) => p.id !== id);

  if (filtered.length === products.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await saveProducts(filtered);
  return NextResponse.json({ success: true });
}
