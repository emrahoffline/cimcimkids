"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Product } from "@/lib/types";
import {
  getDiscountAmount,
  getDiscountPercent,
  isOnSale,
} from "@/lib/types";
import { formatPrice } from "@/lib/products";

type Props = {
  product: Product;
  /** denser for product cards */
  compact?: boolean;
};

export function ProductPrice({ product, compact = false }: Props) {
  const locale = useLocale();
  const t = useTranslations("products");
  const onSale = isOnSale(product);
  const percent = getDiscountPercent(product);
  const saved = getDiscountAmount(product);

  if (!onSale || product.compareAtPrice == null) {
    return (
      <p
        className={
          compact
            ? "flex h-14 items-start text-base font-bold leading-7 text-bamboo sm:text-lg"
            : "mt-4 text-2xl font-semibold text-bamboo"
        }
      >
        {formatPrice(product.price, locale)}
      </p>
    );
  }

  if (compact) {
    return (
      <div className="flex h-14 flex-col justify-start gap-0.5 overflow-hidden">
        <div className="flex min-w-0 items-baseline gap-x-1.5 overflow-hidden whitespace-nowrap">
          <span className="shrink-0 text-base font-bold leading-7 text-bamboo sm:text-lg">
            {formatPrice(product.price, locale)}
          </span>
          <span className="min-w-0 truncate text-xs text-slate-400 line-through sm:text-sm">
            {formatPrice(product.compareAtPrice, locale)}
          </span>
          {percent != null && (
            <span className="shrink-0 rounded bg-bamboo/15 px-1.5 py-0.5 text-[10px] font-semibold text-bamboo sm:text-xs">
              %{percent}
            </span>
          )}
        </div>
        {saved != null && saved > 0 && (
          <p className="truncate text-[10px] font-medium leading-4 text-olive sm:text-xs">
            {t("discountSaved", { amount: formatPrice(saved, locale) })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-semibold text-bamboo">
          {formatPrice(product.price, locale)}
        </span>
        <span className="text-lg text-slate-400 line-through">
          {formatPrice(product.compareAtPrice, locale)}
        </span>
        {percent != null && (
          <span className="rounded-full bg-bamboo/15 px-2.5 py-1 text-sm font-semibold text-bamboo">
            {t("discountPercent", { percent })}
          </span>
        )}
      </div>
      {saved != null && saved > 0 && (
        <p className="text-sm font-medium text-olive">
          {t("discountSaved", { amount: formatPrice(saved, locale) })}
        </p>
      )}
    </div>
  );
}
