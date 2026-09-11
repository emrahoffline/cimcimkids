"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AddToCartButton } from "./AddToCartButton";
import { FavoriteButton } from "./FavoriteButton";
import type { Product, ProductColor } from "@/lib/types";
import { getColorLabel, getProductAges } from "@/lib/types";
import { formatPrice } from "@/lib/products";

export function ProductDetailActions({
  product,
  name,
}: {
  product: Product;
  name: string;
}) {
  const locale = useLocale();
  const t = useTranslations("products");
  const price = formatPrice(product.price, locale);
  const colors = product.colors ?? [];
  const ages = getProductAges(product);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(
    colors[0] ?? null
  );
  const [selectedAge, setSelectedAge] = useState<string | null>(
    ages[0] ?? null
  );

  const needsColor = colors.length > 0;
  const needsAge = ages.length > 0;
  const variantsReady =
    (!needsColor || !!selectedColor) && (!needsAge || !!selectedAge);

  return (
    <>
      {needsAge && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700">
            {t("age")}
            {selectedAge && (
              <span className="ml-2 font-normal text-slate-500">
                {selectedAge}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {ages.map((age) => {
              const active = selectedAge === age;
              return (
                <button
                  key={age}
                  type="button"
                  onClick={() => setSelectedAge(age)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "border-bamboo bg-bamboo text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-bamboo"
                  }`}
                  aria-pressed={active}
                >
                  {age}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {needsColor && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-700">
            {t("color")}
            {selectedColor && (
              <span className="ml-2 font-normal text-slate-500">
                {getColorLabel(selectedColor, locale)}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => {
              const active = selectedColor?.id === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  title={getColorLabel(color, locale)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition ${
                    active
                      ? "border-bamboo ring-2 ring-bamboo/30"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                  aria-label={getColorLabel(color, locale)}
                  aria-pressed={active}
                >
                  <span
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <AddToCartButton
          product={product}
          name={name}
          color={selectedColor}
          ageLabel={selectedAge}
          disabled={!product.inStock || !variantsReady}
        />
        <FavoriteButton
          product={product}
          className="border border-bamboo/20 bg-white"
        />
      </div>

      <div className="mobile-sticky-bar border-bamboo/15 bg-gradient-to-t from-[#fff3eb] to-white/95 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-400">{name}</p>
            <p className="text-lg font-semibold text-bamboo">{price}</p>
          </div>
          <AddToCartButton
            product={product}
            name={name}
            color={selectedColor}
            ageLabel={selectedAge}
            disabled={!product.inStock || !variantsReady}
            className="shrink-0 px-5"
          />
        </div>
      </div>
    </>
  );
}
