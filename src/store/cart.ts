import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  giftCardAppliedAmount,
  isGiftCardProductId,
  payableTotal,
} from "@/lib/gift-cards";
import { getShippingFee } from "@/lib/store-config";
import {
  computeDiscountAmount,
  type DiscountKind,
} from "@/lib/discount-codes";

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  colorId?: string;
  colorLabel?: string;
  ageLabel?: string;
};

type CartState = {
  items: CartItem[];
  giftCardCode: string | null;
  giftCardBalance: number;
  discountCode: string | null;
  discountKind: DiscountKind | null;
  discountValue: number;
  discountMinSubtotal: number;
  addItem: (
    item: Omit<CartItem, "quantity" | "id"> & { id?: string },
    qty?: number
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setGiftCard: (code: string, remainingBalance: number) => void;
  clearGiftCard: () => void;
  setDiscountCode: (data: {
    code: string;
    kind: DiscountKind;
    value: number;
    minSubtotal: number;
  }) => void;
  clearDiscountCode: () => void;
};

function lineId(productId: string, colorId?: string, ageLabel?: string) {
  return [productId, colorId || "-", ageLabel || "-"].join("::");
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      giftCardCode: null,
      giftCardBalance: 0,
      discountCode: null,
      discountKind: null,
      discountValue: 0,
      discountMinSubtotal: 0,
      addItem: (item, qty = 1) => {
        const productId = item.productId || item.id || "";
        const id = lineId(productId, item.colorId, item.ageLabel);
        const existing = get().items.find((i) => i.id === id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === id ? { ...i, quantity: i.quantity + qty } : i
            ),
          });
        } else {
          set({
            items: [
              ...get().items,
              {
                ...item,
                id,
                productId,
                quantity: qty,
              },
            ],
          });
        }
      },
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        });
      },
      clearCart: () =>
        set({
          items: [],
          giftCardCode: null,
          giftCardBalance: 0,
          discountCode: null,
          discountKind: null,
          discountValue: 0,
          discountMinSubtotal: 0,
        }),
      setGiftCard: (code, remainingBalance) =>
        set({
          giftCardCode: code,
          giftCardBalance: remainingBalance,
        }),
      clearGiftCard: () =>
        set({ giftCardCode: null, giftCardBalance: 0 }),
      setDiscountCode: (data) =>
        set({
          discountCode: data.code,
          discountKind: data.kind,
          discountValue: data.value,
          discountMinSubtotal: data.minSubtotal,
        }),
      clearDiscountCode: () =>
        set({
          discountCode: null,
          discountKind: null,
          discountValue: 0,
          discountMinSubtotal: 0,
        }),
    }),
    { name: "cimcimkids-cart" }
  )
);

export function cartMerchandiseTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartPhysicalTotal(items: CartItem[]) {
  return items
    .filter((i) => !isGiftCardProductId(i.productId))
    .reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartShippingFee(items: CartItem[]) {
  return getShippingFee(cartPhysicalTotal(items));
}

export function cartTotal(items: CartItem[]) {
  return cartMerchandiseTotal(items) + cartShippingFee(items);
}

export function cartDiscountEligible(items: CartItem[]) {
  return cartPhysicalTotal(items);
}

export function cartDiscountApplied(
  items: CartItem[],
  kind: DiscountKind | null = null,
  value = 0,
  minSubtotal = 0
) {
  if (!kind) return 0;
  return computeDiscountAmount(
    cartDiscountEligible(items),
    kind,
    value,
    minSubtotal
  );
}

export function cartGiftApplied(
  items: CartItem[],
  giftCardBalance: number,
  discountAmount = 0
) {
  const afterDiscount = Math.max(0, cartTotal(items) - discountAmount);
  return giftCardAppliedAmount(afterDiscount, giftCardBalance);
}

export function cartPayable(
  items: CartItem[],
  giftCardBalance: number,
  discountAmount = 0
) {
  const afterDiscount = Math.max(0, cartTotal(items) - discountAmount);
  return payableTotal(
    afterDiscount,
    giftCardAppliedAmount(afterDiscount, giftCardBalance)
  );
}
