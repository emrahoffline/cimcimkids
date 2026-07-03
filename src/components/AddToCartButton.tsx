"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart";

type Props = {
  product: Product;
  name: string;
  className?: string;
};

export function AddToCartButton({ product, name, className }: Props) {
  const t = useTranslations("products");
  const addItem = useCartStore((s) => s.addItem);

  return (
    <button
      onClick={() =>
        addItem({
          id: product.id,
          slug: product.slug,
          name,
          price: product.price,
          image: product.image,
        })
      }
      className={`btn-primary ${className ?? ""}`}
      disabled={!product.inStock}
    >
      <ShoppingBag className="h-4 w-4" />
      {t("addToCart")}
    </button>
  );
}
