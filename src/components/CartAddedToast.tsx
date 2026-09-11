"use client";

import Link from "next/link";
import { Check, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartToastStore } from "@/store/cart-toast";

export function CartAddedToast() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const open = useCartToastStore((s) => s.open);
  const productName = useCartToastStore((s) => s.productName);
  const hide = useCartToastStore((s) => s.hide);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--mobile-nav-height)+0.75rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-3 sm:bottom-6 sm:justify-end sm:px-6"
    >
      <div className="cart-toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-bamboo/20 bg-white px-4 py-3 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)]">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-olive/15 text-olive">
          <Check className="h-4 w-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium text-slate-800">
            {productName
              ? t("addedToCartNamed", { name: productName })
              : t("addedToCart")}
          </p>
          <Link
            href={`/${locale}/cart`}
            onClick={hide}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-bamboo underline-offset-2 hover:underline"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {t("viewCart")}
          </Link>
        </div>
        <button
          type="button"
          onClick={hide}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={t("dismissToast")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
