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
import {
  colorHasSizeStock,
  colorStockTotal,
  normalizeSizeStock,
  sizeStockTotal,
} from "@/lib/product-stock";

type Props = {
  product?: Product;
};

function applyIncomingColors(
  previous: ProductColor[],
  incoming: ProductColor[],
  ages: string[],
  sharedSizeStock: Record<string, number>
): ProductColor[] {
  if (ages.length === 0) {
    return incoming.map((color) => ({
      ...color,
      sizeStock: undefined,
      stock: typeof color.stock === "number" ? color.stock : 1,
    }));
  }
  const previousIds = new Set(previous.map((color) => color.id));
  const seedingFirst = previous.length === 0 && incoming.length > 0;
  return incoming.map((color) => {
    const source = !previousIds.has(color.id)
      ? seedingFirst
        ? sharedSizeStock
        : {}
      : (color.sizeStock ?? {});
    const sizeStock = normalizeSizeStock(source, ages);
    return { ...color, sizeStock, stock: sizeStockTotal(sizeStock) };
  });
}

function initialColorState(product?: Product) {
  const ages = product
    ? normalizeProductAges(getProductAges(product), product.ageRange)
    : [];
  const rawColors = (product?.colors ?? []) as ProductColor[];
  const pooled = rawColors.filter(
    (color) =>
      ages.length > 0 &&
      typeof color.stock === "number" &&
      color.stock > 0 &&
      !colorHasSizeStock(color)
  );
  const colors =
    ages.length === 0
      ? rawColors.map((color) => ({
          ...color,
          stock: typeof color.stock === "number" ? color.stock : 1,
        }))
      : rawColors.map((color) => {
          const sizeStock = normalizeSizeStock(
            colorHasSizeStock(color) ? color.sizeStock : {},
            ages
          );
          return { ...color, sizeStock, stock: sizeStockTotal(sizeStock) };
        });
  const sizeStock =
    colors.length === 1 && colors[0].sizeStock
      ? colors[0].sizeStock
      : normalizeSizeStock(product?.sizeStock ?? {}, ages);
  const pooledNotice =
    pooled.length === 0
      ? ""
      : `${pooled
          .map((color) => `${color.labelTr || "Renk"} stoğu ${color.stock} adet`)
          .join(", ")}. Bu sayı bütün bedenlere ortak yazılmış, bu yüzden aynı bedenden o kadar alınabiliyor. Her bedenin kendi adedini girip kaydedin.`;
  return { ages, colors, sizeStock, pooledNotice };
}

export function ProductForm({ product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const initial = initialColorState(product);
  const [pooledNotice, setPooledNotice] = useState(initial.pooledNotice);
  const [sizeSplitConfirmed, setSizeSplitConfirmed] = useState(false);

  const [form, setForm] = useState<{
    nameTr: string;
    nameEn: string;
    descTr: string;
    descEn: string;
    price: number;
    category: string;
    ages: string[];
    images: string[];
    colors: ProductColor[];
    stockQuantity: number;
    sizeStock: Record<string, number>;
    slug: string;
  }>({
    nameTr: product?.nameTr ?? "",
    nameEn: product?.nameEn ?? "",
    descTr: product?.descTr ?? "",
    descEn: product?.descEn ?? "",
    price: product?.price ?? 0,
    category: product?.category ?? "",
    ages: initial.ages,
    images: product ? getProductImages(product) : ([] as string[]),
    colors: initial.colors,
    stockQuantity:
      initial.colors.length > 0
        ? colorStockTotal(initial.colors)
        : sizeStockTotal(initial.sizeStock),
    sizeStock: initial.sizeStock,
    slug: product?.slug ?? "",
  });

  const confirmSizeSplit = () => {
    if (!sizeSplitConfirmed) setSizeSplitConfirmed(true);
  };

  const setAges = (ages: string[]) => {
    if (form.colors.length === 0) {
      const sizeStock = normalizeSizeStock(form.sizeStock, ages);
      setForm({
        ...form,
        ages,
        sizeStock,
        stockQuantity: sizeStockTotal(sizeStock),
      });
      return;
    }
    const colors = form.colors.map((color) => {
      const source =
        form.colors.length === 1 ? form.sizeStock : color.sizeStock;
      const sizeStock = normalizeSizeStock(source, ages);
      return { ...color, sizeStock, stock: sizeStockTotal(sizeStock) };
    });
    setForm({
      ...form,
      ages,
      colors,
      sizeStock:
        colors.length === 1
          ? (colors[0].sizeStock ?? {})
          : normalizeSizeStock(form.sizeStock, ages),
      stockQuantity: colorStockTotal(colors),
    });
  };

  const setAgeStock = (age: string, value: number) => {
    confirmSizeSplit();
    const sizeStock = normalizeSizeStock(
      {
        ...form.sizeStock,
        [age]: Math.max(0, Math.floor(value || 0)),
      },
      form.ages
    );
    const colors =
      form.colors.length === 1
        ? [
            {
              ...form.colors[0],
              sizeStock,
              stock: sizeStockTotal(sizeStock),
            },
          ]
        : form.colors;
    setForm({
      ...form,
      sizeStock,
      colors,
      stockQuantity:
        colors.length > 0
          ? colorStockTotal(colors)
          : sizeStockTotal(sizeStock),
    });
  };

  const setColors = (incoming: ProductColor[]) => {
    const colors = applyIncomingColors(
      form.colors,
      incoming,
      form.ages,
      form.sizeStock
    );
    const sizeStock =
      colors.length === 1
        ? (colors[0].sizeStock ?? {})
        : colors.length === 0
          ? normalizeSizeStock(
              form.colors[0]?.sizeStock ?? form.sizeStock,
              form.ages
            )
          : form.sizeStock;
    if (colors.length === 0) setPooledNotice("");
    setForm({
      ...form,
      colors,
      sizeStock,
      stockQuantity:
        colors.length > 0 ? colorStockTotal(colors) : sizeStockTotal(sizeStock),
    });
  };

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
    if (form.colors.length > 0 && pooledNotice && !sizeSplitConfirmed) {
      setError(pooledNotice);
      return;
    }
    const colors = parseProductColors(
      form.colors.map((color) => {
        if (form.ages.length === 0) {
          return {
            ...color,
            sizeStock: undefined,
            stock: Math.max(0, Math.floor(Number(color.stock) || 0)),
          };
        }
        const sizeStock = normalizeSizeStock(
          form.colors.length === 1 ? form.sizeStock : color.sizeStock,
          form.ages
        );
        return { ...color, sizeStock, stock: sizeStockTotal(sizeStock) };
      })
    );
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
        sizeStock:
          colors.length > 0
            ? {}
            : normalizeSizeStock(form.sizeStock, form.ages),
        stockQuantity:
          colors.length > 0
            ? colorStockTotal(colors)
            : sizeStockTotal(normalizeSizeStock(form.sizeStock, form.ages)),
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

  const totalStock =
    form.colors.length > 1
      ? colorStockTotal(form.colors)
      : form.colors.length === 1
        ? sizeStockTotal(normalizeSizeStock(form.sizeStock, form.ages))
        : sizeStockTotal(normalizeSizeStock(form.sizeStock, form.ages));

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
        <label className="mb-1 block text-sm font-medium">
          Açıklama (EN){" "}
          <span className="font-normal text-gray-400">(opsiyonel)</span>
        </label>
        <textarea
          rows={3}
          className="admin-input resize-none"
          value={form.descEn}
          onChange={(e) => setForm({ ...form, descEn: e.target.value })}
          placeholder="Boş bırakılırsa Türkçe açıklama kullanılır"
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
          <label className="mb-1 block text-sm font-medium">Toplam stok</label>
          <input
            type="number"
            readOnly
            className="admin-input bg-gray-50"
            value={totalStock}
          />
          <p className="mt-1 text-xs text-gray-400">
            {totalStock > 0
              ? `Bedenlerin toplamı ${totalStock} adet`
              : "Tüm bedenlerin stoku 0"}
          </p>
        </div>
      </div>

      <CategorySelect
        value={form.category}
        onChange={(category) => setForm({ ...form, category })}
      />

      <AgeOptionsEditor
        value={form.ages}
        onChange={setAges}
      />

      {pooledNotice && !sizeSplitConfirmed && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {pooledNotice}
        </p>
      )}

      {form.ages.length > 0 && form.colors.length <= 1 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Beden bazlı stok
            {form.colors.length === 1 && form.colors[0].labelTr
              ? ` (${form.colors[0].labelTr})`
              : ""}
          </p>
          {form.colors.length === 1 && (
            <p className="mb-2 text-xs text-gray-500">
              Bu adetler sadece seçili renge aittir. Bir bedene yazdığınız
              sayı, o bedenden alınabilecek adettir.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {form.ages.map((age) => (
              <label
                key={age}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2"
              >
                <span className="text-sm font-medium text-gray-700">{age}</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  className="admin-input w-24"
                  value={form.sizeStock[age] ?? 0}
                  onChange={(event) =>
                    setAgeStock(age, Number(event.target.value))
                  }
                  aria-label={`${age} stok adedi`}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <ColorOptionsEditor
        value={form.colors}
        ages={form.ages}
        onSizeEdited={confirmSizeSplit}
        onChange={setColors}
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
