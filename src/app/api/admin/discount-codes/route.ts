import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-api";
import {
  createDiscountCode,
  getDiscountCodes,
  updateDiscountCodeActive,
} from "@/lib/discount-codes-db";
import type { DiscountKind } from "@/lib/discount-codes";

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;
  const codes = await getDiscountCodes();
  return NextResponse.json(codes);
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const kind = (body as { kind?: unknown }).kind;
  if (kind !== "percent" && kind !== "amount") {
    return NextResponse.json({ error: "İndirim tipi seçin." }, { status: 400 });
  }

  try {
    const created = await createDiscountCode({
      code:
        typeof (body as { code?: unknown }).code === "string"
          ? (body as { code: string }).code
          : undefined,
      kind: kind as DiscountKind,
      value: Number((body as { value?: unknown }).value),
      minSubtotal:
        typeof (body as { minSubtotal?: unknown }).minSubtotal === "number"
          ? (body as { minSubtotal: number }).minSubtotal
          : Number((body as { minSubtotal?: unknown }).minSubtotal) || 0,
      maxUses:
        (body as { maxUses?: unknown }).maxUses === "" ||
        (body as { maxUses?: unknown }).maxUses == null
          ? null
          : Number((body as { maxUses?: unknown }).maxUses),
      expiresAt:
        typeof (body as { expiresAt?: unknown }).expiresAt === "string" &&
        (body as { expiresAt: string }).expiresAt.trim()
          ? (body as { expiresAt: string }).expiresAt
          : null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Oluşturulamadı." },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const body = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
      ? (body as { id: string }).id
      : "";
  const active =
    body && typeof body === "object" ? (body as { active?: unknown }).active : undefined;

  if (!id || typeof active !== "boolean") {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const updated = await updateDiscountCodeActive(id, active);
  if (!updated) {
    return NextResponse.json({ error: "Kod bulunamadı." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
