"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, cartTotal } from "@/store/cart";
import { formatPrice } from "@/lib/products";

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const { items, updateQuantity, removeItem } = useCartStore();
  const total = cartTotal(items);
  const base = `/${locale}`;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-4 text-olive/60">{t("empty")}</p>
        <Link href={`${base}/products`} className="btn-primary mt-8 inline-flex">
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 sm:py-12 sm:pb-12 md:pb-12">
      <h1 className="mb-6 text-2xl font-semibold sm:mb-8 sm:text-3xl">{t("title")}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-olive/10 bg-white p-3 sm:gap-4 sm:p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-20">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium text-olive">{item.name}</p>
                    <p className="text-bamboo">
                      {formatPrice(item.price, locale)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="touch-target text-olive/40 hover:text-red-600"
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-olive/50">{t("quantity")}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity - 1)
                    }
                    className="touch-target rounded border border-olive/20"
                    aria-label="-"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                    className="touch-target rounded border border-olive/20"
                    aria-label="+"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="card hidden h-fit space-y-3 md:block">
          <div className="flex justify-between text-sm">
            <span>{t("subtotal")}</span>
            <span>{formatPrice(total, locale)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t("shipping")}</span>
            <span className="text-leaf">{t("freeShipping")}</span>
          </div>
          <div className="flex justify-between border-t border-olive/10 pt-3 font-semibold">
            <span>{t("total")}</span>
            <span className="text-bamboo">{formatPrice(total, locale)}</span>
          </div>
          <Link href={`${base}/checkout`} className="btn-primary mt-4 w-full">
            {t("checkout")}
          </Link>
        </div>
      </div>

      <div className="mobile-sticky-bar md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-olive/60">{t("total")}</p>
            <p className="text-xl font-semibold text-bamboo">
              {formatPrice(total, locale)}
            </p>
          </div>
          <Link href={`${base}/checkout`} className="btn-primary shrink-0 px-8">
            {t("checkout")}
          </Link>
        </div>
      </div>
    </div>
  );
}
