"use client";

import { FavoriteButton } from "./FavoriteButton";
import { AddToCartButton } from "./AddToCartButton";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products";
import { useLocale } from "next-intl";

export function ProductDetailActions({
  product,
  name,
}: {
  product: Product;
  name: string;
}) {
  const locale = useLocale();
  const price = formatPrice(product.price, locale);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <AddToCartButton product={product} name={name} />
        <FavoriteButton
          product={product}
          className="border border-bamboo/20 bg-white"
        />
      </div>

      <div className="mobile-sticky-bar lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-400">{name}</p>
            <p className="text-lg font-semibold text-bamboo">{price}</p>
          </div>
          <AddToCartButton
            product={product}
            name={name}
            className="shrink-0 px-5"
          />
        </div>
      </div>
    </>
  );
}
