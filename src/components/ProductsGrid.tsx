"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Product, Category } from "@/lib/types";
import { ProductCard } from "./ProductCard";

export function ProductsGrid({ products }: { products: Product[] }) {
  const t = useTranslations("products");
  const locale = useLocale();
  const [category, setCategory] = useState<string>("all");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  const filtered =
    category === "all"
      ? products
      : products.filter((p) => p.category === category);

  const filterButtons = [
    { key: "all", label: t("all") },
    ...categories.map((c) => ({
      key: c.slug,
      label: locale === "tr" ? c.nameTr : c.nameEn,
    })),
  ];

  return (
    <>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mb-8 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
        {filterButtons.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
              category === c.key
                ? "bg-bamboo text-white"
                : "bg-white text-slate-600 hover:bg-[#fff3eb]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="mobile-product-grid">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
