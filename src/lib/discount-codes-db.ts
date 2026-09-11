import "server-only";
import { randomBytes } from "crypto";
import type {
  DiscountCode as DbDiscountCode,
  DiscountCodeKind,
  Prisma,
} from "@prisma/client";
import { prisma, requireDatabaseUrl, hasDatabaseUrl, isNextBuild } from "./prisma";
import {
  computeDiscountAmount,
  isDiscountCodeCurrentlyValid,
  isValidDiscountCodeFormat,
  normalizeDiscountCode,
  type DiscountCodeRecord,
  type DiscountKind,
} from "./discount-codes";

export type { DiscountCodeRecord };

function mapDiscountCode(row: DbDiscountCode): DiscountCodeRecord {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    minSubtotal: row.minSubtotal,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    active: row.active,
    startsAt: row.startsAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function generateDiscountCode(): string {
  return `CKD-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function getDiscountCodes(): Promise<DiscountCodeRecord[]> {
  if (!hasDatabaseUrl()) {
    if (isNextBuild()) return [];
    requireDatabaseUrl();
  }
  const rows = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapDiscountCode);
}

export async function getDiscountCodeByCode(
  code: string
): Promise<DiscountCodeRecord | null> {
  requireDatabaseUrl();
  const row = await prisma.discountCode.findUnique({
    where: { code: normalizeDiscountCode(code) },
  });
  return row ? mapDiscountCode(row) : null;
}

export async function createDiscountCode(data: {
  code?: string;
  kind: DiscountKind;
  value: number;
  minSubtotal?: number;
  maxUses?: number | null;
  expiresAt?: string | null;
}): Promise<DiscountCodeRecord> {
  requireDatabaseUrl();
  if (data.kind !== "percent" && data.kind !== "amount") {
    throw new Error("Geçersiz indirim tipi.");
  }
  const value = Number(data.value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("İndirim değeri 0’dan büyük olmalı.");
  }
  if (data.kind === "percent" && value > 100) {
    throw new Error("Yüzde en fazla 100 olabilir.");
  }
  if (data.kind === "amount" && value > 100_000) {
    throw new Error("İndirim tutarı çok yüksek.");
  }
  const minSubtotal = Math.max(0, Number(data.minSubtotal) || 0);
  const maxUses =
    data.maxUses == null || data.maxUses === 0
      ? null
      : Math.floor(Number(data.maxUses));
  if (maxUses != null && (!Number.isFinite(maxUses) || maxUses < 1)) {
    throw new Error("Kullanım limiti en az 1 olmalı.");
  }

  let code = data.code?.trim()
    ? normalizeDiscountCode(data.code)
    : generateDiscountCode();
  if (!isValidDiscountCodeFormat(code)) {
    throw new Error("Kod 3–24 karakter olmalı (harf, rakam, tire).");
  }

  if (!data.code?.trim()) {
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.discountCode.findUnique({ where: { code } });
      if (!exists) break;
      code = generateDiscountCode();
    }
  } else {
    const exists = await prisma.discountCode.findUnique({ where: { code } });
    if (exists) throw new Error("Bu kod zaten var.");
  }

  let expiresAt: Date | null = null;
  if (data.expiresAt) {
    const parsed = new Date(data.expiresAt);
    if (!Number.isFinite(parsed.getTime())) {
      throw new Error("Geçersiz son kullanma tarihi.");
    }
    expiresAt = parsed;
  }

  const created = await prisma.discountCode.create({
    data: {
      id: `dc_${Date.now()}_${randomBytes(3).toString("hex")}`,
      code,
      kind: data.kind as DiscountCodeKind,
      value,
      minSubtotal,
      maxUses,
      expiresAt,
      active: true,
    },
  });
  return mapDiscountCode(created);
}

export async function updateDiscountCodeActive(
  id: string,
  active: boolean
): Promise<DiscountCodeRecord | null> {
  requireDatabaseUrl();
  try {
    const updated = await prisma.discountCode.update({
      where: { id },
      data: { active },
    });
    return mapDiscountCode(updated);
  } catch {
    return null;
  }
}

export async function redeemDiscountCodeInTx(
  tx: Prisma.TransactionClient,
  rawCode: string,
  eligibleSubtotal: number,
  orderId: string
): Promise<{ code: string; amount: number }> {
  const code = normalizeDiscountCode(rawCode);
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      code: string;
      kind: DiscountKind;
      value: number;
      minSubtotal: number;
      maxUses: number | null;
      usedCount: number;
      active: boolean;
      startsAt: Date | null;
      expiresAt: Date | null;
    }>
  >`
    SELECT id, code, kind::text AS kind, value, "minSubtotal", "maxUses",
           "usedCount", active, "startsAt", "expiresAt"
    FROM "DiscountCode"
    WHERE code = ${code}
    FOR UPDATE
  `;
  const row = rows[0];
  if (
    !row ||
    !isDiscountCodeCurrentlyValid({
      active: row.active,
      startsAt: row.startsAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      maxUses: row.maxUses,
      usedCount: row.usedCount,
    })
  ) {
    throw new Error("INVALID_DISCOUNT_CODE");
  }
  const amount = computeDiscountAmount(
    eligibleSubtotal,
    row.kind,
    row.value,
    row.minSubtotal
  );
  if (amount <= 0) {
    throw new Error("INVALID_DISCOUNT_CODE");
  }
  await tx.discountCode.update({
    where: { id: row.id },
    data: { usedCount: { increment: 1 } },
  });
  await tx.discountCodeRedemption.create({
    data: {
      discountCodeId: row.id,
      orderId,
      amount,
    },
  });
  return { code: row.code, amount };
}

export async function refundDiscountForOrder(orderId: string): Promise<void> {
  requireDatabaseUrl();
  await prisma.$transaction(async (tx) => {
    const redemptions = await tx.discountCodeRedemption.findMany({
      where: { orderId },
    });
    for (const r of redemptions) {
      const code = await tx.discountCode.findUnique({
        where: { id: r.discountCodeId },
      });
      if (code) {
        await tx.discountCode.update({
          where: { id: code.id },
          data: { usedCount: Math.max(0, code.usedCount - 1) },
        });
      }
      await tx.discountCodeRedemption.delete({ where: { id: r.id } });
    }
  });
}
