"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Product, Category } from "@/lib/types";
import { formatPrice } from "@/lib/products";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetch("/api/admin/products").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
      setLoading(false);
    });
  };

  const categoryName = (slug: string) =>
    categories.find((c) => c.slug === slug)?.nameTr ?? slug;

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
        <div className="mb-4 flex justify-end">
          <Link href="/admin/products/new" className="admin-btn-primary">
            <Plus className="h-4 w-4" />
            Ürün Ekle
          </Link>
        </div>

        <div className="admin-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Yükleniyor...</p>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Ürün bulunamadı</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Kod</th>
                    <th>Yaş</th>
                    <th>Fiyat</th>
                    <th>Kategori</th>
                    <th>Stok</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                            <Image
                              src={p.image}
                              alt={p.nameTr}
                              fill
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
          )}
        </div>
      </main>
    </>
  );
}
