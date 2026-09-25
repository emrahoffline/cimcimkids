"use client";

import type { Product, Category } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { CategoryFilterBar } from "./CategoryFilterBar";

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
  return (
    <>
      <CategoryFilterBar
        categories={categories}
        activeCategory={activeCategory}
      />
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
