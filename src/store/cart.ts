import { create } from "zustand";
import { persist } from "zustand/middleware";
import { giftWrapAmount } from "@/lib/gift-wrap";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  giftWrap: boolean;
  giftNote: string;
  addItem: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setGiftWrap: (enabled: boolean) => void;
  setGiftNote: (note: string) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      giftWrap: false,
      giftNote: "",
      addItem: (item, qty = 1) => {
        const existing = get().items.find((i) => i.id === item.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === item.id
                ? { ...i, quantity: i.quantity + qty }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: qty }] });
        }
      },
      removeItem: (id) => {
        const items = get().items.filter((i) => i.id !== id);
        set(
          items.length
            ? { items }
            : { items, giftWrap: false, giftNote: "" }
        );
      },
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
      clearCart: () => set({ items: [], giftWrap: false, giftNote: "" }),
      setGiftWrap: (enabled) =>
        set({
          giftWrap: enabled,
          giftNote: enabled ? get().giftNote : "",
        }),
      setGiftNote: (note) => set({ giftNote: note }),
    }),
    { name: "cimcimkids-cart" }
  )
);

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartTotalWithWrap(items: CartItem[], giftWrap: boolean) {
  return cartTotal(items) + giftWrapAmount(giftWrap);
}
