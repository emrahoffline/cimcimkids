"use client";

import type { Product } from "@/lib/types";
import { getProductSpecs } from "@/lib/product-specs";

export function ProductSpecs({
  product,
  locale,
  title,
}: {
  product: Product;
  locale: string;
  title: string;
}) {
  const specs = getProductSpecs(product, locale);
  if (specs.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      <dl className="mt-3 divide-y divide-bamboo/10 overflow-hidden rounded-2xl border border-bamboo/15">
        {specs.map((spec) => (
          <div
            key={spec.label}
            className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-2.5 text-sm sm:grid-cols-[10rem_1fr]"
          >
            <dt className="text-slate-500">{spec.label}</dt>
            <dd className="font-medium text-slate-800">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
