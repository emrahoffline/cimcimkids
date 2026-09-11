import { create } from "zustand";

type CartToastState = {
  open: boolean;
  productName: string | null;
  show: (productName?: string) => void;
  hide: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useCartToastStore = create<CartToastState>((set) => ({
  open: false,
  productName: null,
  show: (productName) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ open: true, productName: productName?.trim() || null });
    hideTimer = setTimeout(() => {
      set({ open: false });
      hideTimer = null;
    }, 3200);
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
    set({ open: false });
  },
}));
