"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import type { Product } from "@/lib/types";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/admin/products/${id}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          throw new Error(data.error || "Ürün yüklenemedi");
        }
        return data as Product;
      })
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setProduct(null);
          setError(err.message || "Ürün yüklenemedi");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <AdminHeader title="Ürün Düzenle" />
      <main className="admin-main">
        <div className="mb-4">
          <Link
            href="/admin/products"
            className="text-sm text-gray-500 hover:text-olive"
          >
            ← Ürünlere dön
          </Link>
        </div>
        {loading && <p className="text-gray-400">Yükleniyor...</p>}
        {!loading && error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}
        {!loading && product && <ProductForm product={product} />}
      </main>
    </>
  );
}
