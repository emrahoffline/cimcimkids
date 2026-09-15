"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Plus, Pencil, Search, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { Product, Category } from "@/lib/types";
import { formatPrice } from "@/lib/products";
import {
  PRODUCT_SORTS,
  isProductSort,
  productAddedAt,
  sortProducts,
  type ProductSort,
} from "@/lib/product-sort";
import { isUploadedProductImage } from "@/lib/image-utils";

function fold(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function formatAddedAt(product: Product) {
  const ms = productAddedAt(product);
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("tr-TR");
}

function SortGlyph({
  active,
  desc,
}: {
  active: boolean;
  desc?: boolean;
}) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
  return desc ? (
    <ArrowDown className="h-3.5 w-3.5 text-olive" />
  ) : (
    <ArrowUp className="h-3.5 w-3.5 text-olive" />
  );
}

function productMatches(
  product: Product,
  query: string,
  categoryLabel: string
) {
  if (!query) return true;
  const haystack = fold(
    [
      product.nameTr,
      product.nameEn,
      product.code,
      product.slug,
      product.category,
      categoryLabel,
      ...(product.ages?.length ? product.ages : product.ageRange ? [product.ageRange] : []),
    ].join(" ")
  );
  return haystack.includes(query);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ProductSort>("newest");

  const load = () => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([prods, cats]) => {
      setProducts(Array.isArray(prods) ? prods : []);
      setCategories(Array.isArray(cats) ? cats : []);
      setLoading(false);
    });
  };

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.nameTr ?? slug;

  const filtered = useMemo(() => {
    const q = fold(query);
    if (!q) return products;
    return products.filter((p) => productMatches(p, q, categoryName(p.category)));
  }, [products, query, categories]);

  const sorted = useMemo(() => sortProducts(filtered, sort), [filtered, sort]);

  const toggleSort = (primary: ProductSort, secondary: ProductSort) => {
    setSort((current) => (current === primary ? secondary : primary));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" ürününü silmek istediğinize emin misiniz?`)) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <>
      <AdminHeader title="Ürünler" />
      <main className="admin-main">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün adı, kod veya kategori ara"
              className="admin-input admin-input-with-icon"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-w-0 items-center gap-2 sm:w-56">
              <span className="shrink-0 text-sm text-gray-500">Sırala</span>
              <select
                className="admin-input"
                value={sort}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isProductSort(value)) setSort(value);
                }}
              >
                {PRODUCT_SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Link href="/admin/products/new" className="admin-btn-primary shrink-0">
              <Plus className="h-4 w-4" />
              Ürün Ekle
            </Link>
          </div>
        </div>

        <div className="admin-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Yükleniyor...</p>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Ürün bulunamadı</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-gray-400">
              Aramanıza uygun ürün yok
            </p>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {sorted.map((p) => (
                  <div key={p.id} className="flex gap-3 px-4 py-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <Image
                        src={p.image}
                        alt={p.nameTr}
                        fill
                        unoptimized={isUploadedProductImage(p.image)}
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="break-words font-medium text-gray-900 hover:text-olive"
                      >
                        {p.nameTr}
                      </Link>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {p.code}
                        {p.category ? ` · ${categoryName(p.category)}` : ""}
                        {` · ${formatAddedAt(p)}`}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {formatPrice(p.price, "tr")}
                        {typeof p.compareAtPrice === "number" &&
                        p.compareAtPrice > p.price ? (
                          <span className="ml-1 text-xs font-normal text-gray-400 line-through">
                            {formatPrice(p.compareAtPrice, "tr")}
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs ${
                          (p.stockQuantity ?? 0) > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {(p.stockQuantity ?? 0) > 0
                          ? `${p.stockQuantity} adet`
                          : "Tükendi"}
                      </span>
                      <div className="mt-2 flex items-center gap-1">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-olive hover:bg-olive/10"
                        >
                          <Pencil className="h-4 w-4" />
                          Düzenle
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id, p.nameTr)}
                          className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap hidden md:block">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 bg-transparent p-0 font-semibold uppercase tracking-wide text-gray-500"
                        onClick={() => toggleSort("name-asc", "name-desc")}
                      >
                        Ürün
                        <SortGlyph
                          active={sort === "name-asc" || sort === "name-desc"}
                          desc={sort === "name-desc"}
                        />
                      </button>
                    </th>
                    <th>Kod</th>
                    <th>Yaş</th>
                    <th>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 bg-transparent p-0 font-semibold uppercase tracking-wide text-gray-500"
                        onClick={() => toggleSort("price-asc", "price-desc")}
                      >
                        Fiyat
                        <SortGlyph
                          active={sort === "price-asc" || sort === "price-desc"}
                          desc={sort === "price-desc"}
                        />
                      </button>
                    </th>
                    <th>Kategori</th>
                    <th>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 bg-transparent p-0 font-semibold uppercase tracking-wide text-gray-500"
                        onClick={() => toggleSort("stock-desc", "stock-asc")}
                      >
                        Stok
                        <SortGlyph
                          active={sort === "stock-asc" || sort === "stock-desc"}
                          desc={sort === "stock-desc"}
                        />
                      </button>
                    </th>
                    <th>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 bg-transparent p-0 font-semibold uppercase tracking-wide text-gray-500"
                        onClick={() => toggleSort("newest", "oldest")}
                      >
                        Eklenme
                        <SortGlyph
                          active={sort === "newest" || sort === "oldest"}
                          desc={sort === "newest"}
                        />
                      </button>
                    </th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={p.image}
                              alt={p.nameTr}
                              fill
                              unoptimized={isUploadedProductImage(p.image)}
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${p.id}`}
                              className="truncate font-medium text-gray-900 hover:text-olive"
                            >
                              {p.nameTr}
                            </Link>
                            <p className="truncate text-xs text-gray-400">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs whitespace-nowrap">
                        {p.code}
                      </td>
                      <td className="whitespace-nowrap text-sm">
                        {(p.ages?.length ? p.ages : p.ageRange ? [p.ageRange] : []).join(", ") ||
                          "—"}
                      </td>
                      <td className="whitespace-nowrap">
                        {formatPrice(p.price, "tr")}
                        {typeof p.compareAtPrice === "number" &&
                          p.compareAtPrice > p.price && (
                            <span className="ml-1 text-xs text-gray-400 line-through">
                              {formatPrice(p.compareAtPrice, "tr")}
                            </span>
                          )}
                      </td>
                      <td>{categoryName(p.category)}</td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            (p.stockQuantity ?? 0) > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {(p.stockQuantity ?? 0) > 0
                            ? `${p.stockQuantity} adet`
                            : "Tükendi"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-sm text-gray-500">
                        {formatAddedAt(p)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-olive hover:bg-olive/10"
                          >
                            <Pencil className="h-4 w-4" />
                            Düzenle
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.nameTr)}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
