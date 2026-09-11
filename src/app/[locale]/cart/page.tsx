"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Minus, Plus, Trash2 } from "lucide-react";
import {
  useCartStore,
  cartTotal,
  cartGiftApplied,
  cartPayable,
  cartMerchandiseTotal,
  cartPhysicalTotal,
  cartShippingFee,
  cartDiscountApplied,
} from "@/store/cart";
import { formatPrice } from "@/lib/products";
import {
  amountUntilFreeShipping,
  isFreeShipping,
} from "@/lib/store-config";
import { DiscountCodeField } from "@/components/DiscountCodeField";

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const {
    items,
    updateQuantity,
    removeItem,
    giftCardCode,
    giftCardBalance,
    discountKind,
    discountValue,
    discountMinSubtotal,
    setGiftCard,
    clearGiftCard,
  } = useCartStore();
  const merchandise = cartMerchandiseTotal(items);
  const physical = cartPhysicalTotal(items);
  const shippingFee = cartShippingFee(items);
  const total = cartTotal(items);
  const discountApplied = cartDiscountApplied(
    items,
    discountKind,
    discountValue,
    discountMinSubtotal
  );
  const giftApplied = cartGiftApplied(items, giftCardBalance, discountApplied);
  const payable = cartPayable(items, giftCardBalance, discountApplied);
  const freeShip = isFreeShipping(physical);
  const remaining = amountUntilFreeShipping(physical);
  const base = `/${locale}`;
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const applyCode = async () => {
    setCodeError("");
    if (!codeInput.trim()) {
      setCodeError(t("giftCardRequired"));
      return;
    }
    setCodeLoading(true);
    const res = await fetch("/api/gift-cards/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeInput, subtotal: Math.max(0, total - discountApplied) }),
    });
    const data = await res.json().catch(() => ({}));
    setCodeLoading(false);
    if (!res.ok) {
      setCodeError(data.error || t("giftCardInvalid"));
      return;
    }
    setGiftCard(data.code, data.remainingBalance);
    setCodeInput("");
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-4 text-slate-500">{t("empty")}</p>
        <Link href={`${base}/products`} className="btn-primary mt-8 inline-flex">
          {t("continueShopping")}
        </Link>
      </div>
    );
  }

  const summary = (
    <>
      <div className="flex justify-between text-sm text-slate-600">
        <span>{t("subtotal")}</span>
        <span>{formatPrice(merchandise, locale)}</span>
      </div>
      <div className="flex justify-between text-sm text-slate-600">
        <span>{t("shipping")}</span>
        <span className={freeShip ? "font-medium text-olive" : "font-medium text-slate-800"}>
          {physical <= 0
            ? "—"
            : freeShip
              ? t("freeShipping")
              : formatPrice(shippingFee, locale)}
        </span>
      </div>
      {physical > 0 && (
        <p className="text-xs text-olive/70">
          {freeShip
            ? t("freeShippingNote")
            : t("freeShippingRemaining", {
                amount: formatPrice(remaining, locale),
              })}
        </p>
      )}

      <DiscountCodeField locale={locale} />

      <div className="space-y-2 border-t border-bamboo/10 pt-3">
        <p className="text-sm font-medium text-slate-700">{t("giftCardTitle")}</p>
        {giftCardCode ? (
          <div className="rounded-xl bg-olive/10 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-semibold text-olive">
                {giftCardCode}
              </span>
              <button
                type="button"
                onClick={clearGiftCard}
                className="text-xs text-slate-500 underline"
              >
                {t("giftCardRemove")}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-600">
              {t("giftCardApplied", {
                amount: formatPrice(giftApplied, locale),
              })}
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder={t("giftCardPlaceholder")}
              className="input-field flex-1 text-sm"
            />
            <button
              type="button"
              onClick={applyCode}
              disabled={codeLoading}
              className="btn-secondary shrink-0 px-3 text-sm"
            >
              {codeLoading ? "..." : t("giftCardApply")}
            </button>
          </div>
        )}
        {codeError && <p className="text-xs text-red-600">{codeError}</p>}
      </div>

      {discountApplied > 0 && (
        <div className="flex justify-between text-sm text-olive">
          <span>{t("discountLine")}</span>
          <span>−{formatPrice(discountApplied, locale)}</span>
        </div>
      )}

      {giftApplied > 0 && (
        <div className="flex justify-between text-sm text-olive">
          <span>{t("giftCardDiscount")}</span>
          <span>−{formatPrice(giftApplied, locale)}</span>
        </div>
      )}

      <div className="flex justify-between border-t border-bamboo/10 pt-3 font-semibold text-slate-800">
        <span>{t("total")}</span>
        <span className="text-bamboo">{formatPrice(payable, locale)}</span>
      </div>
    </>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-32 sm:py-12 sm:pb-12 md:pb-12">
      <h1 className="mb-6 text-2xl font-semibold sm:mb-8 sm:text-3xl">{t("title")}</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <ul className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-3xl border border-bamboo/10 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-cream-dark sm:h-20 sm:w-20">
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
                    <p className="font-medium text-slate-800">{item.name}</p>
                    {item.colorLabel && (
                      <p className="text-xs text-slate-400">{item.colorLabel}</p>
                    )}
                    {item.ageLabel && (
                      <p className="text-xs text-slate-400">{item.ageLabel}</p>
                    )}
                    <p className="font-semibold text-bamboo">
                      {formatPrice(item.price, locale)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="touch-target text-slate-300 hover:text-red-500"
                    aria-label={t("remove")}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{t("quantity")}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity - 1)
                    }
                    className="touch-target rounded-full border border-bamboo/20 text-slate-600"
                    aria-label="-"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                    className="touch-target rounded-full border border-bamboo/20 text-slate-600"
                    aria-label="+"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="card hidden h-fit space-y-3 border border-bamboo/10 shadow-sm md:block">
          {summary}
          <Link href={`${base}/checkout`} className="btn-primary mt-4 w-full">
            {t("checkout")}
          </Link>
          <Link
            href={`${base}/gift-cards`}
            className="mt-2 block text-center text-sm text-olive underline"
          >
            {t("buyGiftCard")}
          </Link>
        </div>
      </div>

      <div className="card mt-6 space-y-3 border border-bamboo/10 shadow-sm md:hidden">
        {summary}
        <Link href={`${base}/gift-cards`} className="block text-center text-sm text-olive underline">
          {t("buyGiftCard")}
        </Link>
      </div>

      <div className="mobile-sticky-bar border-bamboo/15 bg-gradient-to-t from-[#fff3eb] to-white/95 md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">{t("total")}</p>
            <p className="text-xl font-semibold text-bamboo">
              {formatPrice(payable, locale)}
            </p>
            {giftApplied > 0 && (
              <p className="text-[10px] text-olive">
                {t("giftCardDiscount")}: −{formatPrice(giftApplied, locale)}
              </p>
            )}
          </div>
          <Link href={`${base}/checkout`} className="btn-primary shrink-0 px-8">
            {t("checkout")}
          </Link>
        </div>
      </div>
    </div>
  );
}
