import { isGiftCardProductId } from "./gift-cards";
import { isShippingProductId } from "./shipping";
import { getDefaultKdvRate, getGiftCardKdvRate } from "./invoice-config";

export function moneyRound(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function kdvRateForProductId(productId: string): number {
  if (isGiftCardProductId(productId) || isShippingProductId(productId)) {
    return getGiftCardKdvRate();
  }
  return getDefaultKdvRate();
}

export type InvoiceLineCalc = {
  name: string;
  productId: string;
  quantity: number;
  unitNet: number;
  lineNet: number;
  kdvRate: number;
  kdvAmount: number;
  lineGross: number;
};

export type InvoiceTotals = {
  lines: InvoiceLineCalc[];
  net: number;
  vat: number;
  gross: number;
  vatByRate: Record<number, number>;
};

export function splitInclusive(
  gross: number,
  kdvRate: number
): { net: number; vat: number } {
  const g = moneyRound(gross);
  const net = moneyRound(g / (1 + kdvRate / 100));
  return { net, vat: moneyRound(g - net) };
}

export function applyDiscountToInvoiceItems<
  T extends { productId: string; price: number; quantity: number },
>(items: T[], discountAmount: number): T[] {
  const cut = moneyRound(Math.max(0, discountAmount));
  if (cut <= 0) return items;
  const eligibleIdx: number[] = [];
  const grosses = items.map((item, i) => {
    const gross = moneyRound(item.price * item.quantity);
    if (
      !isGiftCardProductId(item.productId) &&
      !isShippingProductId(item.productId) &&
      gross > 0
    ) {
      eligibleIdx.push(i);
    }
    return gross;
  });
  const eligibleSum = moneyRound(eligibleIdx.reduce((s, i) => s + grosses[i], 0));
  if (eligibleSum <= 0) return items;
  const apply = Math.min(cut, eligibleSum);
  const next = items.map((item) => ({ ...item }));
  let remaining = apply;
  eligibleIdx.forEach((i, idx) => {
    const isLast = idx === eligibleIdx.length - 1;
    const share = isLast
      ? remaining
      : moneyRound((grosses[i] / eligibleSum) * apply);
    remaining = moneyRound(remaining - share);
    const qty = next[i].quantity;
    const newGross = moneyRound(Math.max(0, grosses[i] - share));
    next[i] = {
      ...next[i],
      price: qty > 0 ? moneyRound(newGross / qty) : 0,
    };
  });
  return next;
}

export function invoiceItemsForOrder(order: {
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  discountAmount?: number;
}) {
  return applyDiscountToInvoiceItems(order.items, order.discountAmount ?? 0);
}

export function buildInvoiceTotals(
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>
): InvoiceTotals {
  const lines: InvoiceLineCalc[] = items.map((item) => {
    const kdvRate = kdvRateForProductId(item.productId);
    const lineGross = moneyRound(item.price * item.quantity);
    const { net, vat } = splitInclusive(lineGross, kdvRate);
    const unitNet = item.quantity > 0 ? moneyRound(net / item.quantity, 4) : 0;
    return {
      name: item.name,
      productId: item.productId,
      quantity: item.quantity,
      unitNet,
      lineNet: net,
      kdvRate,
      kdvAmount: vat,
      lineGross,
    };
  });

  const vatByRate: Record<number, number> = {};
  for (const line of lines) {
    vatByRate[line.kdvRate] = moneyRound(
      (vatByRate[line.kdvRate] ?? 0) + line.kdvAmount
    );
  }

  const net = moneyRound(lines.reduce((s, l) => s + l.lineNet, 0));
  const vat = moneyRound(lines.reduce((s, l) => s + l.kdvAmount, 0));
  const gross = moneyRound(lines.reduce((s, l) => s + l.lineGross, 0));

  return { lines, net, vat, gross, vatByRate };
}
