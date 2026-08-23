"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { filterProducts, uniqueProductAges } from "@/lib/product-filter";

type Props = {
  products: Product[];
  categories: Category[];
};

export function FeaturedProducts({ products, categories }: Props) {
  const t = useTranslations("home");
  const tProducts = useTranslations("products");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [age, setAge] = useState("all");

  const ages = useMemo(() => uniqueProductAges(products), [products]);
  const filtered = useMemo(
    () => filterProducts(products, { query, category, age, categories }),
    [products, query, category, age, categories]
  );

  const hasFilters = query.trim() !== "" || category !== "all" || age !== "all";

  const categoryButtons = [
    { key: "all", label: tProducts("all") },
    ...categories.map((c) => ({
      key: c.slug,
      label: locale === "tr" ? c.nameTr : c.nameEn?.trim() || c.nameTr,
    })),
  ];

  const ageButtons = [
    { key: "all", label: tProducts("all") },
    ...ages.map((value) => ({ key: value, label: value })),
  ];

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition ${
      active
        ? "bg-bamboo text-white"
        : "bg-white text-slate-600 hover:bg-[#fff3eb]"
    }`;

  return (
    <div>
      <div className="mb-6 space-y-4 sm:mb-8">
        <label className="relative mx-auto block max-w-xl">
          <span className="sr-only">{t("searchAria")}</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full rounded-full border border-olive/15 bg-white py-3 pl-10 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:border-bamboo focus:ring-2 focus:ring-bamboo/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={t("clearSearch")}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        {categories.length > 0 ? (
          <div>
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("filterCategory")}
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
              {categoryButtons.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  aria-pressed={category === c.key}
                  className={chipClass(category === c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {ages.length > 0 ? (
          <div>
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("filterAge")}
            </p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
              {ageButtons.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setAge(c.key)}
                  aria-pressed={age === c.key}
                  className={chipClass(age === c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-6 py-12 text-center">
          <p className="text-sm text-slate-500 sm:text-base">{t("noResults")}</p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setAge("all");
              }}
              className="btn-secondary mt-5"
            >
              {t("clearFilters")}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          {hasFilters ? (
            <p className="mb-4 text-center text-sm text-slate-500">
              {t("resultCount", { count: filtered.length })}
            </p>
          ) : null}
          <div className="mobile-product-grid">
            {filtered.map((p, index) => (
              <ProductCard key={p.id} product={p} priority={index < 4} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
