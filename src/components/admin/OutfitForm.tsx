"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/products";
import { CategorySelect } from "./CategorySelect";
import { ImageUpload } from "./ImageUpload";
import {
  OUTFIT_SLOT_IDS,
  OUTFIT_SLOT_META,
  filledOutfitSlots,
  type OutfitSlotId,
  type OutfitSlots,
  outfitPartsTotal,
} from "@/lib/outfit";

type SlotDraft = {
  mode: "empty" | "product" | "custom";
  productId: string;
  nameTr: string;
  nameEn: string;
  image: string;
  price: string;
};

type Props = {
  product?: Product;
};

function emptySlot(): SlotDraft {
  return {
    mode: "empty",
    productId: "",
    nameTr: "",
    nameEn: "",
    image: "",
    price: "",
  };
}

function slotsFromProduct(product?: Product): Record<OutfitSlotId, SlotDraft> {
  const next = Object.fromEntries(
    OUTFIT_SLOT_IDS.map((id) => [id, emptySlot()])
  ) as Record<OutfitSlotId, SlotDraft>;
  if (!product?.outfitSlots) return next;
  for (const id of OUTFIT_SLOT_IDS) {
    const item = product.outfitSlots[id];
    if (!item) continue;
    next[id] = {
      mode: item.source === "product" && item.productId ? "product" : "custom",
      productId: item.productId ?? "",
      nameTr: item.nameTr,
      nameEn: item.nameEn,
      image: item.image,
      price: String(item.price),
    };
  }
  return next;
}

export function OutfitForm({ product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [nameTr, setNameTr] = useState(product?.nameTr ?? "");
  const [nameEn, setNameEn] = useState(product?.nameEn ?? "");
  const [descTr, setDescTr] = useState(product?.descTr ?? "");
  const [descEn, setDescEn] = useState(product?.descEn ?? "");
  const [category, setCategory] = useState(product?.category || "outfits");
  const [cover, setCover] = useState(product?.image ?? "");
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [useCustomPrice, setUseCustomPrice] = useState(
    product?.kind === "outfit" && product.compareAtPrice != null
  );
  const [customPrice, setCustomPrice] = useState(
    product?.kind === "outfit" && product.compareAtPrice != null
      ? String(product.price)
      : ""
  );
  const [slots, setSlots] = useState<Record<OutfitSlotId, SlotDraft>>(() =>
    slotsFromProduct(product)
  );

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((rows: Product[]) => {
        setCatalog(
          (Array.isArray(rows) ? rows : []).filter(
            (p) => p.kind !== "outfit" && p.id !== product?.id
          )
        );
      })
      .catch(() => setCatalog([]));
  }, [product?.id]);

  const builtSlots: OutfitSlots = useMemo(() => {
    const next: OutfitSlots = {};
    for (const id of OUTFIT_SLOT_IDS) {
      const draft = slots[id];
      if (draft.mode === "empty") continue;
      const price = Number(draft.price);
      const name = draft.nameTr.trim();
      if (!name || !Number.isFinite(price) || price < 0) continue;
      next[id] = {
        source: draft.mode === "product" ? "product" : "custom",
        ...(draft.mode === "product" && draft.productId
          ? { productId: draft.productId }
          : {}),
        nameTr: name,
        nameEn: draft.nameEn.trim() || name,
        image: draft.image,
        price,
      };
    }
    return next;
  }, [slots]);

  const partsTotal = outfitPartsTotal(builtSlots);
  const customAmount = Number(customPrice);
  const sellPrice =
    useCustomPrice && customPrice.trim() !== "" && Number.isFinite(customAmount)
      ? customAmount
      : partsTotal;
  const galleryImages = Array.from(
    new Set(
      [cover, ...filledOutfitSlots(builtSlots).map((item) => item.image)].filter(
        Boolean
      )
    )
  );

  const applyProduct = (id: OutfitSlotId, productId: string) => {
    const source = catalog.find((p) => p.id === productId);
    setSlots((prev) => ({
      ...prev,
      [id]: source
        ? {
            mode: "product",
            productId: source.id,
            nameTr: source.nameTr,
            nameEn: source.nameEn,
            image: source.image,
            price: String(source.price),
          }
        : { ...emptySlot(), mode: "product" },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(builtSlots).length === 0) {
      setError("Kombine en az bir parça ekleyin. Tüm slotlar opsiyoneldir.");
      return;
    }
    if (!nameTr.trim()) {
      setError("Kombin adı (TR) gerekli");
      return;
    }
    if (!category) {
      setError("Kategori seçin");
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
        kind: "outfit",
        nameTr: nameTr.trim(),
        nameEn: (nameEn.trim() || nameTr).trim(),
        descTr,
        descEn,
        category,
        image: galleryImages[0] || cover,
        images: galleryImages,
        ages: ["2-10"],
        ageRange: "2-10",
        stockQuantity: inStock ? 20 : 0,
        inStock,
        outfitSlots: builtSlots,
        useCustomPrice: useCustomPrice && customPrice.trim() !== "",
        price: sellPrice,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Kombin kaydedilemedi");
      setLoading(false);
      return;
    }

    router.push("/admin/products");
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-card mx-auto max-w-3xl space-y-6 p-4 sm:p-6"
    >
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <p className="text-sm text-gray-500">
        Şapka, gözlük, üst, alt, çorap, ayakkabı, kemer ve kravat opsiyoneldir.
        Mevcut ürünlerden seçin veya sıfırdan ekleyin. Fiyat parça toplamıdır;
        isterseniz kombine özel fiyat verebilirsiniz.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Kombin adı (TR)</label>
          <input
            required
            className="admin-input"
            value={nameTr}
            onChange={(e) => setNameTr(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Kombin adı (EN)</label>
          <input
            className="admin-input"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Açıklama (TR)</label>
        <textarea
          rows={3}
          className="admin-input resize-none"
          value={descTr}
          onChange={(e) => setDescTr(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Açıklama (EN)</label>
        <textarea
          rows={3}
          className="admin-input resize-none"
          value={descEn}
          onChange={(e) => setDescEn(e.target.value)}
        />
      </div>

      <CategorySelect value={category} onChange={setCategory} />

      <ImageUpload
        label="Kombin kapak görseli (opsiyonel)"
        value={cover}
        onChange={setCover}
      />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Parçalar</h3>
        {OUTFIT_SLOT_IDS.map((id) => {
          const draft = slots[id];
          const meta = OUTFIT_SLOT_META[id];
          return (
            <div
              key={id}
              className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 sm:p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-gray-800">{meta.labelTr}</p>
                <select
                  className="admin-input w-auto min-w-[180px] py-1.5 text-sm"
                  value={draft.mode}
                  onChange={(e) => {
                    const mode = e.target.value as SlotDraft["mode"];
                    setSlots((prev) => ({
                      ...prev,
                      [id]:
                        mode === "empty"
                          ? emptySlot()
                          : { ...prev[id], mode, productId: "" },
                    }));
                  }}
                >
                  <option value="empty">Kullanma</option>
                  <option value="product">Mevcut üründen</option>
                  <option value="custom">Sıfırdan ekle</option>
                </select>
              </div>

              {draft.mode === "product" && (
                <select
                  className="admin-input"
                  value={draft.productId}
                  onChange={(e) => applyProduct(id, e.target.value)}
                >
                  <option value="">Ürün seçin</option>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameTr} — {formatPrice(p.price, "tr")}
                    </option>
                  ))}
                </select>
              )}

              {draft.mode === "custom" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="admin-input"
                    placeholder="Parça adı (TR)"
                    value={draft.nameTr}
                    onChange={(e) =>
                      setSlots((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], nameTr: e.target.value },
                      }))
                    }
                  />
                  <input
                    className="admin-input"
                    placeholder="Parça adı (EN)"
                    value={draft.nameEn}
                    onChange={(e) =>
                      setSlots((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], nameEn: e.target.value },
                      }))
                    }
                  />
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Fiyat (₺)"
                    value={draft.price}
                    onChange={(e) =>
                      setSlots((prev) => ({
                        ...prev,
                        [id]: { ...prev[id], price: e.target.value },
                      }))
                    }
                  />
                  <div className="sm:col-span-2">
                    <ImageUpload
                      label={`${meta.labelTr} görseli`}
                      value={draft.image}
                      onChange={(image) =>
                        setSlots((prev) => ({
                          ...prev,
                          [id]: { ...prev[id], image },
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {draft.mode === "product" && draft.productId ? (
                <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
                  {draft.image ? (
                    <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white">
                      <Image
                        src={draft.image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : null}
                  <span>
                    {draft.nameTr} ·{" "}
                    {formatPrice(Number(draft.price) || 0, "tr")}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-olive/20 bg-olive/5 p-4">
        <p className="text-sm text-gray-600">Parça toplamı</p>
        <p className="text-2xl font-semibold text-olive">
          {formatPrice(partsTotal, "tr")}
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useCustomPrice}
            onChange={(e) => setUseCustomPrice(e.target.checked)}
          />
          Kombine özel fiyat ver
        </label>
        {useCustomPrice ? (
          <input
            className="admin-input mt-2 max-w-xs"
            type="number"
            min={0}
            step="0.01"
            placeholder="Satış fiyatı (₺)"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
          />
        ) : null}
        <p className="mt-2 text-sm font-medium text-gray-800">
          Sitede görünecek fiyat: {formatPrice(sellPrice, "tr")}
          {useCustomPrice && partsTotal > sellPrice ? (
            <span className="ml-2 text-gray-400 line-through">
              {formatPrice(partsTotal, "tr")}
            </span>
          ) : null}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Stok</label>
        <select
          className="admin-input max-w-xs"
          value={inStock ? "yes" : "no"}
          onChange={(e) => setInStock(e.target.value === "yes")}
        >
          <option value="yes">Stokta</option>
          <option value="no">Tükendi</option>
        </select>
      </div>

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
          {loading
            ? "Kaydediliyor..."
            : product
              ? "Kombini güncelle"
              : "Kombin ekle"}
        </button>
      </div>
    </form>
  );
}
