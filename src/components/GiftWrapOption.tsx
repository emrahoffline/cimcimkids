"use client";

import { Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/products";
import { GIFT_WRAP_NOTE_MAX, GIFT_WRAP_PRICE } from "@/lib/gift-wrap";

export function GiftWrapOption() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const giftWrap = useCartStore((s) => s.giftWrap);
  const giftNote = useCartStore((s) => s.giftNote);
  const setGiftWrap = useCartStore((s) => s.setGiftWrap);
  const setGiftNote = useCartStore((s) => s.setGiftNote);

  return (
    <div
      className={`rounded-3xl border p-4 transition ${
        giftWrap
          ? "border-bamboo bg-bamboo/10"
          : "border-bamboo/15 bg-white"
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="checkbox-field mt-1"
          checked={giftWrap}
          onChange={(e) => setGiftWrap(e.target.checked)}
        />
        <Gift className="mt-0.5 h-5 w-5 shrink-0 text-bamboo" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-olive">{t("giftWrap")}</span>
            <span className="font-semibold text-bamboo">
              {formatPrice(GIFT_WRAP_PRICE, locale)}
            </span>
          </span>
          <span className="mt-1 block text-sm text-olive/70">
            {t("giftWrapHelp")}
          </span>
        </span>
      </label>

      {giftWrap ? (
        <div className="mt-3 pl-8">
          <label className="mb-1 block text-sm font-medium text-olive">
            {t("giftNote")}
            <span className="ml-1 font-normal text-olive/50">
              {t("giftNoteOptional")}
            </span>
          </label>
          <textarea
            rows={3}
            maxLength={GIFT_WRAP_NOTE_MAX}
            value={giftNote}
            onChange={(e) => setGiftNote(e.target.value)}
            placeholder={t("giftNotePlaceholder")}
            className="textarea-field"
          />
        </div>
      ) : null}
    </div>
  );
}
