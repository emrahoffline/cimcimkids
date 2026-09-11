"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductColor } from "@/lib/types";
import { getProductImages, getProductAges } from "@/lib/types";
import { MultiImageUpload } from "./MultiImageUpload";
import { ColorOptionsEditor } from "./ColorOptionsEditor";
import { AgeOptionsEditor } from "./AgeOptionsEditor";
import { CategorySelect } from "./CategorySelect";
import { parseProductColors } from "@/lib/product-variants";
import { normalizeProductAges } from "@/lib/product-ages";

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
    ages: product
      ? normalizeProductAges(getProductAges(product), product.ageRange)
      : ([] as string[]),
    images: product ? getProductImages(product) : ([] as string[]),
    colors: (product?.colors ?? []) as ProductColor[],
    stockQuantity: product?.stockQuantity ?? 0,
    slug: product?.slug ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.images.length === 0) {
      setError("Lütfen en az bir ürün görseli yükleyin");
      return;
    }
    if (!form.category) {
      setError("Lütfen bir kategori seçin");
      return;
    }
    if (form.ages.length === 0) {
      setError("Lütfen en az bir yaş varyantı seçin");
      return;
    }
    const colors = parseProductColors(form.colors);
    if (form.colors.length > 0 && colors.length === 0) {
      setError("Renk adlarını (TR) doldurun veya boş renkleri silin");
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
      body: JSON.stringify({
        ...form,
        image: form.images[0],
        images: form.images,
        ages: form.ages,
        ageRange: form.ages[0],
        colors,
      }),
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
    <form
      onSubmit={handleSubmit}
      className="admin-card mx-auto max-w-2xl space-y-5 p-4 sm:p-6"
    >
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      {product ? (
        <div>
          <label className="mb-1 block text-sm font-medium">Ürün kodu</label>
          <input
            readOnly
            className="admin-input bg-gray-50 font-mono text-sm"
            value={product.code}
          />
        </div>
      ) : (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
          Ürün kodu kaydettiğinizde otomatik oluşturulur.
        </p>
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
          <label className="mb-1 block text-sm font-medium">
            Ad (EN){" "}
            <span className="font-normal text-gray-400">(opsiyonel)</span>
          </label>
          <input
            className="admin-input"
            value={form.nameEn}
            onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
            placeholder="Boş bırakılırsa Türkçe ad kullanılır"
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
          <label className="mb-1 block text-sm font-medium">Stok adedi</label>
          <input
            type="number"
            required
            min={0}
            step={1}
            className="admin-input"
            value={form.stockQuantity}
            onChange={(e) =>
              setForm({
                ...form,
                stockQuantity: Math.max(0, Math.floor(Number(e.target.value) || 0)),
              })
            }
          />
          <p className="mt-1 text-xs text-gray-400">
            {form.stockQuantity > 0
              ? `Stokta ${form.stockQuantity} adet`
              : "Stok 0 — ürün tükendi olarak görünür"}
          </p>
        </div>
      </div>

      <CategorySelect
        value={form.category}
        onChange={(category) => setForm({ ...form, category })}
      />

      <AgeOptionsEditor
        value={form.ages}
        onChange={(ages) => setForm({ ...form, ages })}
      />

      <ColorOptionsEditor
        value={form.colors}
        onChange={(colors) => setForm({ ...form, colors })}
      />

      <MultiImageUpload
        value={form.images}
        onChange={(images) => setForm({ ...form, images })}
      />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
        <button
          type="button"
          onClick={() => router.back()}
          className="admin-btn-secondary w-full sm:w-auto"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="admin-btn-primary w-full sm:w-auto"
        >
          {loading ? "Kaydediliyor..." : product ? "Güncelle" : "Ürün Ekle"}
        </button>
      </div>
    </form>
  );
}
