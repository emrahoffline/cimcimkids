"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product, ProductColor } from "@/lib/types";
import { getColorLabel, getProductAges } from "@/lib/types";
import { stockForAge } from "@/lib/product-stock";

type Props = {
  product: Product;
  open: boolean;
  onClose: () => void;
  onPick: (ageLabel: string, color: ProductColor | null) => void;
};

export function AddToCartSizeSheet({ product, open, onClose, onPick }: Props) {
  const t = useTranslations("products");
  const locale = useLocale();
  const ages = getProductAges(product);
  const colors = product.colors ?? [];
  const [color, setColor] = useState<ProductColor | null>(colors[0] ?? null);

  useEffect(() => {
    if (!open) return;
    setColor(product.colors?.[0] ?? null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, product.id]);

  if (!open || ages.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Kapat"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-cart-size-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="add-to-cart-size-title"
              className="text-lg font-semibold text-slate-800"
            >
              {t("selectSize")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t("selectSizeHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {colors.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">
              {t("color")}
              {color ? (
                <span className="ml-2 font-normal text-slate-500">
                  {getColorLabel(color, locale)}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap gap-2">
              {colors.map((item) => {
                const active = color?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setColor(item)}
                    title={getColorLabel(item, locale)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                      active
                        ? "border-bamboo ring-2 ring-bamboo/30"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                    aria-label={getColorLabel(item, locale)}
                    aria-pressed={active}
                  >
                    <span
                      className="h-7 w-7 rounded-full border border-black/10"
                      style={{ backgroundColor: item.hex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {ages.map((age) => {
              const stock = stockForAge(product, age);
              const soldOut = stock <= 0;
              return (
                <button
                  key={age}
                  type="button"
                  disabled={soldOut}
                  onClick={() => onPick(age, color)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-bamboo hover:bg-bamboo hover:text-white disabled:cursor-not-allowed disabled:border-red-100 disabled:bg-red-50 disabled:text-slate-400"
                >
                  <span className={soldOut ? "line-through decoration-red-400" : ""}>
                    {age}
                  </span>
                  {soldOut ? (
                    <span className="ml-1.5 text-xs font-semibold text-red-500 no-underline">
                      {t("outOfStock")}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
