"use client";

import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product, ProductColor } from "@/lib/types";
import { getColorLabel } from "@/lib/types";
import { useCartStore } from "@/store/cart";
import { useCartToastStore } from "@/store/cart-toast";

type Props = {
  product: Product;
  name: string;
  color?: ProductColor | null;
  ageLabel?: string | null;
  className?: string;
  disabled?: boolean;
};

export function AddToCartButton({
  product,
  name,
  color,
  ageLabel,
  className,
  disabled,
}: Props) {
  const t = useTranslations("products");
  const locale = useLocale();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useCartToastStore((s) => s.show);

  return (
    <button
      onClick={() => {
        addItem({
          productId: product.id,
          slug: product.slug,
          name,
          price: product.price,
          image: product.image,
          colorId: color?.id,
          colorLabel: color ? getColorLabel(color, locale) : undefined,
          ageLabel: ageLabel || undefined,
        });
        showToast(name);
      }}
      className={`btn-primary ${className ?? ""}`}
      disabled={disabled ?? !product.inStock}
    >
      <ShoppingBag className="h-4 w-4" />
      {t("addToCart")}
    </button>
  );
}
