import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts } from "@/lib/db";
import { slugify } from "@/lib/product-utils";

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

  const nextImage =
    typeof body.image === "string" &&
    /^\/products\/(?:uploads\/)?[a-zA-Z0-9._-]+$/.test(body.image)
      ? body.image
      : products[index].image;

  products[index] = {
    ...products[index],
    slug,
    image: nextImage,
    price: Number(body.price) ?? products[index].price,
    category: body.category ?? products[index].category,
    nameTr: body.nameTr ?? products[index].nameTr,
    nameEn: body.nameEn ?? products[index].nameEn,
    descTr: body.descTr ?? products[index].descTr,
    descEn: body.descEn ?? products[index].descEn,
    inStock: body.inStock ?? products[index].inStock,
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
