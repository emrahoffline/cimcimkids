"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import { useCartToastStore } from "@/store/cart-toast";
import { formatPrice } from "@/lib/products";
import { GiftCardVisual } from "@/components/GiftCardVisual";
import {
  GIFT_CARD_DENOMINATIONS,
  GIFT_CARD_IMAGE,
  GIFT_CARD_MAX_AMOUNT,
  GIFT_CARD_MIN_AMOUNT,
  giftCardProductId,
} from "@/lib/gift-cards";

export default function GiftCardsPage() {
  const t = useTranslations("giftCards");
  const tCart = useTranslations("cart");
  const locale = useLocale();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useCartToastStore((s) => s.show);
  const base = `/${locale}`;
  const [amount, setAmount] = useState<number>(500);
  const [custom, setCustom] = useState("");
  const [added, setAdded] = useState(false);

  const selected =
    custom.trim() !== ""
      ? Math.round(Number(custom))
      : amount;

  const valid =
    Number.isFinite(selected) &&
    selected >= GIFT_CARD_MIN_AMOUNT &&
    selected <= GIFT_CARD_MAX_AMOUNT;

  const handleAdd = () => {
    if (!valid) return;
    const itemName = t("itemName", { amount: formatPrice(selected, locale) });
    addItem({
      productId: giftCardProductId(selected),
      slug: "gift-card",
      name: itemName,
      price: selected,
      image: GIFT_CARD_IMAGE,
    });
    setAdded(true);
    showToast(itemName);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h1 className="page-title mb-3">{t("title")}</h1>
      <p className="mb-8 max-w-xl text-slate-600">{t("subtitle")}</p>

      <div className="grid gap-8 sm:grid-cols-[1.1fr_1fr] sm:items-start">
        <GiftCardVisual title={t("title")} />

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("chooseAmount")}
            </p>
            <div className="flex flex-wrap gap-2">
              {GIFT_CARD_DENOMINATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setAmount(d);
                    setCustom("");
                    setAdded(false);
                  }}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    custom === "" && amount === d
                      ? "bg-olive text-white"
                      : "border border-bamboo/20 bg-white text-slate-700 hover:bg-bamboo/10"
                  }`}
                >
                  {formatPrice(d, locale)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("customAmount")}
            </label>
            <input
              type="number"
              min={GIFT_CARD_MIN_AMOUNT}
              max={GIFT_CARD_MAX_AMOUNT}
              step={50}
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                setAdded(false);
              }}
              placeholder={`${GIFT_CARD_MIN_AMOUNT}–${GIFT_CARD_MAX_AMOUNT}`}
              className="input-field"
            />
          </div>

          <p className="text-2xl font-semibold text-bamboo">
            {valid ? formatPrice(selected, locale) : "—"}
          </p>

          <button
            type="button"
            disabled={!valid}
            onClick={handleAdd}
            className="btn-primary w-full disabled:opacity-50"
          >
            {t("addToCart")}
          </button>

          {added && (
            <div className="rounded-xl bg-olive/10 px-4 py-3 text-sm text-olive">
              <p>{t("added")}</p>
              <Link href={`${base}/cart`} className="mt-2 inline-block font-medium underline">
                {tCart("checkout")}
              </Link>
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-500">{t("note")}</p>
        </div>
      </div>
    </div>
  );
}
