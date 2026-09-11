import "server-only";
import { prisma, requireDatabaseUrl } from "./prisma";

export async function recordShippingExpense(input: {
  orderId: string;
  orderNumber: string;
  postNumber: string;
  carrier?: string;
  amount: number;
  desi?: number;
}): Promise<void> {
  requireDatabaseUrl();
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const description = [
    input.carrier,
    input.desi ? `${input.desi} desi` : null,
    input.orderNumber,
  ]
    .filter(Boolean)
    .join(" · ");
  await prisma.expense.upsert({
    where: { postNumber: input.postNumber },
    create: {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      kind: "shipping",
      amount,
      currency: "TRY",
      description,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      postNumber: input.postNumber,
      carrier: input.carrier ?? null,
    },
    update: {
      amount,
      cancelledAt: null,
      carrier: input.carrier ?? null,
      description,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
    },
  });
}

export async function cancelShippingExpense(postNumber: string): Promise<void> {
  requireDatabaseUrl();
  await prisma.expense.updateMany({
    where: { postNumber, cancelledAt: null },
    data: { cancelledAt: new Date() },
  });
}
