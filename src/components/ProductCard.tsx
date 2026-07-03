"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import { getProductName, getProductDesc, formatPrice } from "@/lib/products";
import { useCartStore } from "@/store/cart";
import { FavoriteButton } from "./FavoriteButton";

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("products");
  const locale = useLocale();
  const addItem = useCartStore((s) => s.addItem);

  const name = getProductName(product, locale);
  const desc = getProductDesc(product, locale);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      slug: product.slug,
      name,
      price: product.price,
      image: product.image,
    });
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-olive/10 bg-white transition hover:shadow-lg">
      <Link href={`/${locale}/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-cream-dark">
          <FavoriteButton product={product} variant="overlay" />
          <Image
            src={product.image}
            alt={name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
        <div className="p-3 sm:p-4">
          <h3 className="font-serif text-sm text-olive sm:text-lg">{name}</h3>
          <p className="mt-1 hidden line-clamp-2 text-sm text-olive/60 sm:block">
            {desc}
          </p>
          <p className="mt-2 text-base font-semibold text-bamboo sm:mt-3 sm:text-lg">
            {formatPrice(product.price, locale)}
          </p>
        </div>
      </Link>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <button
          onClick={handleAdd}
          className="btn-primary w-full text-xs sm:text-sm"
          disabled={!product.inStock}
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">{t("addToCart")}</span>
          <span className="sm:hidden">+</span>
        </button>
      </div>
    </article>
  );
}
