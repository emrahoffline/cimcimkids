"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Product, Category } from "@/lib/types";
import { ProductCard } from "./ProductCard";

type Props = {
  products: Product[];
  categories: Category[];
  activeCategory?: string;
  ratings?: Record<string, { average: number; count: number }>;
};

export function ProductsGrid({
  products,
  categories,
  activeCategory = "all",
  ratings,
}: Props) {
  const t = useTranslations("products");
  const locale = useLocale();

  const filterButtons = [
    { key: "all", label: t("all"), href: `/${locale}/products` },
    ...categories.map((c) => ({
      key: c.slug,
      label: locale === "tr" ? c.nameTr : c.nameEn,
      href: `/${locale}/kategori/${c.slug}`,
    })),
  ];

  return (
    <>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mb-8 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
        {filterButtons.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              activeCategory === c.key
                ? "bg-bamboo text-white"
                : "bg-white text-slate-600 hover:bg-[#fff3eb]"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <div className="mobile-product-grid">
        {products.map((p, index) => (
          <ProductCard
            key={p.id}
            product={p}
            priority={index < 4}
            rating={ratings?.[p.id]}
          />
        ))}
      </div>
    </>
  );
}
