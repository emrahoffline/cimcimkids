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
                            <p className="truncate font-medium">{p.nameTr}</p>
                            <p className="truncate text-xs text-gray-400">{p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">{formatPrice(p.price, "tr")}</td>
                      <td>{categoryName(p.category)}</td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            p.inStock
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {p.inStock ? "Stokta" : "Tükendi"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <Link
                            href={`/admin/products/${p.id}`}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.nameTr)}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
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
