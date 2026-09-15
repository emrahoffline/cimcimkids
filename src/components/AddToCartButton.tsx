"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product, ProductColor } from "@/lib/types";
import { getColorLabel, getProductAges, getProductImages } from "@/lib/types";
import { useCartStore } from "@/store/cart";
import { useCartToastStore } from "@/store/cart-toast";
import { AddToCartSizeSheet } from "./AddToCartSizeSheet";

type Props = {
  product: Product;
  name: string;
  className?: string;
  disabled?: boolean;
  shortLabel?: string;
};

export function commitProductToCart(
  product: Product,
  name: string,
  locale: string,
  ageLabel?: string | null,
  color?: ProductColor | null
) {
  useCartStore.getState().addItem({
    productId: product.id,
    slug: product.slug,
    name,
    price: product.price,
    image: getProductImages(product)[0] || product.image,
    colorId: color?.id,
    colorLabel: color ? getColorLabel(color, locale) : undefined,
    ageLabel: ageLabel || undefined,
  });
  useCartToastStore.getState().show(name);
}

export function AddToCartButton({
  product,
  name,
  className,
  disabled,
  shortLabel,
}: Props) {
  const t = useTranslations("products");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const ages = getProductAges(product);
  const isDisabled = disabled ?? !product.inStock;

  const commit = (ageLabel?: string | null, color?: ProductColor | null) => {
    commitProductToCart(product, name, locale, ageLabel, color);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isDisabled) return;
          if (ages.length > 0) {
            setOpen(true);
            return;
          }
          commit(null, product.colors?.[0] ?? null);
        }}
        className={`btn-primary ${className ?? ""}`}
        disabled={isDisabled}
      >
        <ShoppingBag className="h-4 w-4" />
        {shortLabel ? (
          <>
            <span className="hidden sm:inline">{t("addToCart")}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </>
        ) : (
          t("addToCart")
        )}
      </button>
      <AddToCartSizeSheet
        product={product}
        open={open}
        onClose={() => setOpen(false)}
        onPick={(age, color) => commit(age, color)}
      />
    </>
  );
}
