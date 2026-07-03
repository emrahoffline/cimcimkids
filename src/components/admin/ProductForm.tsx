"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/products";
import { ImageUpload } from "./ImageUpload";
import { CategorySelect } from "./CategorySelect";

type Props = {
  product?: Product;
};

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nameTr: product?.nameTr ?? "",
    nameEn: product?.nameEn ?? "",
    descTr: product?.descTr ?? "",
    descEn: product?.descEn ?? "",
    price: product?.price ?? 0,
    category: product?.category ?? "",
    image: product?.image ?? "",
    inStock: product?.inStock ?? true,
    slug: product?.slug ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.image) {
      setError("Lütfen bir ürün görseli yükleyin");
      return;
    }
    if (!form.category) {
      setError("Lütfen bir kategori seçin");
      return;
    }

    setLoading(true);
    setError("");

    const url = product
      ? `/api/admin/products/${product.id}`
      : "/api/admin/products";
    const method = product ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Bir hata oluştu");
      setLoading(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="admin-card max-w-2xl space-y-5 p-6">
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Ad (TR)</label>
          <input
            required
            className="admin-input"
            value={form.nameTr}
            onChange={(e) => setForm({ ...form, nameTr: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ad (EN)</label>
          <input
            required
            className="admin-input"
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Açıklama (TR)</label>
        <textarea
          required
          rows={3}
          className="admin-input resize-none"
          value={form.descTr}
          onChange={(e) => setForm({ ...form, descTr: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Açıklama (EN)</label>
        <textarea
          required
          rows={3}
          className="admin-input resize-none"
          value={form.descEn}
          onChange={(e) => setForm({ ...form, descEn: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Fiyat (₺)</label>
          <input
            type="number"
            required
            min={0}
            className="admin-input"
            value={form.price}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Stok</label>
          <select
            className="admin-input"
            value={form.inStock ? "yes" : "no"}
            onChange={(e) =>
              setForm({ ...form, inStock: e.target.value === "yes" })
            }
          >
            <option value="yes">Stokta</option>
            <option value="no">Tükendi</option>
          </select>
        </div>
      </div>

      <CategorySelect
        value={form.category}
        onChange={(category) => setForm({ ...form, category })}
      />

      <ImageUpload
        value={form.image}
        onChange={(image) => setForm({ ...form, image })}
      />

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="admin-btn-primary">
          {loading ? "Kaydediliyor..." : product ? "Güncelle" : "Ürün Ekle"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="admin-btn-secondary"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
