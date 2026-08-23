"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import {
  GENDER_CATEGORY_SLUGS,
  filterProducts,
  sortProducts,
  uniqueProductAges,
  type PriceBand,
  type ProductSort,
} from "@/lib/product-filter";

type Props = {
  products: Product[];
  categories: Category[];
};

type AccordionKey =
  | "search"
  | "sort"
  | "size"
  | "gender"
  | "subcategory"
  | "price";

function FilterRow({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-slate-900">
            {title}
          </span>
          {summary && !open ? (
            <span className="mt-0.5 block truncate text-sm text-slate-400">
              {summary}
            </span>
          ) : null}
        </span>
        <Plus
          className={`h-5 w-5 shrink-0 text-slate-700 transition ${open ? "rotate-45" : ""}`}
        />
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
        active
          ? "bg-slate-100 font-semibold text-slate-900"
          : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export function FeaturedProducts({ products, categories }: Props) {
  const t = useTranslations("home");
  const tProducts = useTranslations("products");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<AccordionKey | null>("search");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [age, setAge] = useState("all");
  const [price, setPrice] = useState<PriceBand>("all");
  const [sort, setSort] = useState<ProductSort>("newest");

  const ages = useMemo(() => uniqueProductAges(products), [products]);
  const genderCategories = useMemo(
    () => categories.filter((c) => GENDER_CATEGORY_SLUGS.has(c.slug)),
    [categories]
  );
  const subcategories = useMemo(
    () => categories.filter((c) => !GENDER_CATEGORY_SLUGS.has(c.slug)),
    [categories]
  );

  const filtered = useMemo(
    () =>
      sortProducts(
        filterProducts(products, { query, category, age, price, categories }),
        sort
      ),
    [products, query, category, age, price, sort, categories]
  );

  const hasFilters =
    query.trim() !== "" ||
    category !== "all" ||
    age !== "all" ||
    price !== "all" ||
    sort !== "newest";

  const categoryLabel = (slug: string) => {
    const match = categories.find((c) => c.slug === slug);
    if (!match) return slug;
    return locale === "tr" ? match.nameTr : match.nameEn?.trim() || match.nameTr;
  };

  const sortLabel =
    sort === "price-asc"
      ? t("filterSortPriceAsc")
      : sort === "price-desc"
        ? t("filterSortPriceDesc")
        : t("filterSortNewest");

  const priceLabel =
    price === "0-500"
      ? t("filterPriceLow")
      : price === "500-1000"
        ? t("filterPriceMid")
        : price === "1000+"
          ? t("filterPriceHigh")
          : t("filterPriceAll");

  const toggle = (key: AccordionKey) =>
    setExpanded((current) => (current === key ? null : key));

  const clearAll = () => {
    setQuery("");
    setCategory("all");
    setAge("all");
    setPrice("all");
    setSort("newest");
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div>
      <div className="mb-6 flex justify-center sm:mb-8">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-secondary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("filterOpen")}
          {hasFilters ? (
            <span className="rounded-full bg-bamboo px-2 py-0.5 text-[11px] font-semibold text-white">
              {filtered.length}
            </span>
          ) : null}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex justify-center bg-black/40 p-0 sm:items-start sm:p-6 sm:pt-16">
          <div className="flex h-full w-full max-w-lg flex-col bg-[#f3f3f3] sm:h-auto sm:max-h-[85vh] sm:rounded-2xl sm:shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="font-serif text-xl font-semibold text-slate-800">
                {t("filterOpen")}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-sm font-semibold text-bamboo"
                >
                  {t("filterClear")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 text-slate-500 hover:bg-white"
                  aria-label={t("filterClose")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-4">
              <FilterRow
                title={t("filterSearch")}
                summary={query || undefined}
                open={expanded === "search"}
                onToggle={() => toggle("search")}
              >
                <label className="relative block">
                  <span className="sr-only">{t("searchAria")}</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    autoComplete="off"
                    enterKeyHint="search"
                    className="min-h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400"
                      aria-label={t("clearSearch")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </label>
              </FilterRow>

              <FilterRow
                title={t("filterSort")}
                summary={sortLabel}
                open={expanded === "sort"}
                onToggle={() => toggle("sort")}
              >
                <OptionButton
                  active={sort === "newest"}
                  onClick={() => setSort("newest")}
                >
                  {t("filterSortNewest")}
                </OptionButton>
                <OptionButton
                  active={sort === "price-asc"}
                  onClick={() => setSort("price-asc")}
                >
                  {t("filterSortPriceAsc")}
                </OptionButton>
                <OptionButton
                  active={sort === "price-desc"}
                  onClick={() => setSort("price-desc")}
                >
                  {t("filterSortPriceDesc")}
                </OptionButton>
              </FilterRow>

              {ages.length > 0 ? (
                <FilterRow
                  title={t("filterSize")}
                  summary={age === "all" ? undefined : age}
                  open={expanded === "size"}
                  onToggle={() => toggle("size")}
                >
                  <OptionButton
                    active={age === "all"}
                    onClick={() => setAge("all")}
                  >
                    {tProducts("all")}
                  </OptionButton>
                  {ages.map((value) => (
                    <OptionButton
                      key={value}
                      active={age === value}
                      onClick={() => setAge(value)}
                    >
                      {value}
                    </OptionButton>
                  ))}
                </FilterRow>
              ) : null}

              {genderCategories.length > 0 ? (
                <FilterRow
                  title={t("filterGender")}
                  summary={
                    genderCategories.some((c) => c.slug === category)
                      ? categoryLabel(category)
                      : undefined
                  }
                  open={expanded === "gender"}
                  onToggle={() => toggle("gender")}
                >
                  <OptionButton
                    active={category === "all"}
                    onClick={() => setCategory("all")}
                  >
                    {tProducts("all")}
                  </OptionButton>
                  {genderCategories.map((c) => (
                    <OptionButton
                      key={c.slug}
                      active={category === c.slug}
                      onClick={() => setCategory(c.slug)}
                    >
                      {locale === "tr" ? c.nameTr : c.nameEn?.trim() || c.nameTr}
                    </OptionButton>
                  ))}
                </FilterRow>
              ) : null}

              {categories.length > 0 ? (
                <FilterRow
                  title={
                    genderCategories.length > 0
                      ? t("filterSubcategory")
                      : t("filterCategory")
                  }
                  summary={
                    category !== "all" &&
                    !genderCategories.some((c) => c.slug === category)
                      ? categoryLabel(category)
                      : undefined
                  }
                  open={expanded === "subcategory"}
                  onToggle={() => toggle("subcategory")}
                >
                  <OptionButton
                    active={category === "all"}
                    onClick={() => setCategory("all")}
                  >
                    {tProducts("all")}
                  </OptionButton>
                  {(genderCategories.length > 0
                    ? subcategories
                    : categories
                  ).map((c) => (
                    <OptionButton
                      key={c.slug}
                      active={category === c.slug}
                      onClick={() => setCategory(c.slug)}
                    >
                      {locale === "tr" ? c.nameTr : c.nameEn?.trim() || c.nameTr}
                    </OptionButton>
                  ))}
                </FilterRow>
              ) : null}

              <FilterRow
                title={t("filterPrice")}
                summary={price === "all" ? undefined : priceLabel}
                open={expanded === "price"}
                onToggle={() => toggle("price")}
              >
                <OptionButton
                  active={price === "all"}
                  onClick={() => setPrice("all")}
                >
                  {t("filterPriceAll")}
                </OptionButton>
                <OptionButton
                  active={price === "0-500"}
                  onClick={() => setPrice("0-500")}
                >
                  {t("filterPriceLow")}
                </OptionButton>
                <OptionButton
                  active={price === "500-1000"}
                  onClick={() => setPrice("500-1000")}
                >
                  {t("filterPriceMid")}
                </OptionButton>
                <OptionButton
                  active={price === "1000+"}
                  onClick={() => setPrice("1000+")}
                >
                  {t("filterPriceHigh")}
                </OptionButton>
              </FilterRow>
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-3 sm:rounded-b-2xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-primary w-full"
              >
                {t("filterApply")} · {filtered.length}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white/80 px-6 py-12 text-center">
          <p className="text-sm text-slate-500 sm:text-base">{t("noResults")}</p>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
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
