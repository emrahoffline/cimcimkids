import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getProducts, saveProducts, ensureOutfitsCategory } from "@/lib/db";
import { slugify } from "@/lib/product-utils";
import {
  filledOutfitSlots,
  hydrateOutfitSlots,
  outfitCoverImage,
  resolveOutfitPricing,
} from "@/lib/outfit";
import { isSafeProductImage, resolveProductVideo } from "@/lib/media";

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

  const current = products[index];
  const isOutfit = body.kind === "outfit" || current.kind === "outfit";

  const slug =
    body.slug ||
    slugify(body.nameTr || current.nameTr) ||
    current.slug;

  if (products.some((p) => p.slug === slug && p.id !== id)) {
    return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
  }

  const outfitSlots = isOutfit
    ? hydrateOutfitSlots(body.outfitSlots ?? current.outfitSlots, products)
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

  const nextImage = isSafeProductImage(body.image)
    ? body.image
    : isOutfit
      ? outfitCoverImage(outfitSlots ?? {}, current.image)
      : current.image;

  products[index] = {
    ...current,
    slug,
    image: nextImage,
    video: resolveProductVideo(body.video, current.video),
    price: pricing ? pricing.price : Number(body.price) ?? current.price,
    category: body.category ?? current.category,
    nameTr: body.nameTr ?? current.nameTr,
    nameEn: body.nameEn ?? current.nameEn,
    descTr: body.descTr ?? current.descTr,
    descEn: body.descEn ?? current.descEn,
    inStock: body.inStock ?? current.inStock,
    kind: isOutfit ? "outfit" : "product",
    outfitSlots: isOutfit ? outfitSlots : undefined,
    compareAtPrice: isOutfit ? pricing?.compareAtPrice ?? null : null,
  };

  if (isOutfit) {
    await ensureOutfitsCategory();
  }

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
