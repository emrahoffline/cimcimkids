import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import { getCategories, createCategory } from "@/lib/db";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const categories = await getCategories();
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json();

  if (!body.nameTr?.trim()) {
    return NextResponse.json(
      { error: "Kategori adı (TR) gerekli" },
      { status: 400 }
    );
  }

  const category = await createCategory({
    nameTr: body.nameTr,
    nameEn: body.nameEn || body.nameTr,
    slug: body.slug,
  });

  return NextResponse.json(category, { status: 201 });
}
