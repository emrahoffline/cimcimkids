"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DiscountCodesPanel } from "@/components/admin/DiscountCodesPanel";
import type { Product } from "@/lib/types";
import { isOnSale } from "@/lib/types";
import { formatPrice } from "@/lib/products";
import {
  applyAmountDiscount,
  applyPercentDiscount,
  getDiscountBasePrice,
} from "@/lib/product-discount";

type Mode = "percent" | "amount";
type Tab = "codes" | "products";

export default function AdminDiscountsPage() {
  const [tab, setTab] = useState<Tab>("codes");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("percent");
  const [value, setValue] = useState<string>("10");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Ürünler yüklenemedi");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const numericValue = Number(value);
  const valueOk =
    Number.isFinite(numericValue) && numericValue >= 0 &&
    (mode !== "percent" || numericValue <= 100);

  const selectedProducts = useMemo(
    () => products.filter((p) => selected.has(p.id)),
    [products, selected]
  );

  const preview = useMemo(() => {
    if (!valueOk || selectedProducts.length === 0) return [];
    return selectedProducts.slice(0, 5).map((p) => {
      const patch =
        mode === "percent"
          ? applyPercentDiscount(p, numericValue)
          : applyAmountDiscount(p, numericValue);
      return {
        id: p.id,
        name: p.nameTr,
        base: getDiscountBasePrice(p),
        next: patch.price,
      };
    });
  }, [selectedProducts, mode, numericValue, valueOk]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const apply = async (action: "apply" | "clear") => {
    if (selected.size === 0) {
      setError("En az bir ürün seçin");
      return;
    }
    if (action === "apply" && !valueOk) {
      setError("Geçerli bir indirim değeri girin");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/admin/discounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "clear"
          ? { productIds: [...selected], mode: "clear" }
          : {
              productIds: [...selected],
              mode,
              value: numericValue,
            }
      ),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "İşlem başarısız");
      return;
    }

    setMessage(
      action === "clear"
        ? `${data.updated} ürünün indirimi kaldırıldı`
        : `${data.updated} ürüne indirim uygulandı`
    );
    setSelected(new Set());
    load();
  };

  return (
    <>
      <AdminHeader title="İndirimler" />
      <main className="admin-main space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("codes")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "codes"
                ? "bg-olive text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            İndirim kodları
          </button>
          <button
            type="button"
            onClick={() => setTab("products")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "products"
                ? "bg-olive text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Ürün fiyatları
          </button>
        </div>

        {tab === "codes" ? <DiscountCodesPanel /> : null}

        {tab === "products" ? (
        <>
        <div className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Seçili ürünlere yüzde veya tutar indirimi uygulayın. Yüzde
            seçildiğinde yeni fiyat otomatik hesaplanır; isterseniz indirim
            tutarını TL olarak da girebilirsiniz.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("percent")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "percent"
                  ? "bg-olive text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Yüzde (%)
            </button>
            <button
              type="button"
              onClick={() => setMode("amount")}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                mode === "amount"
                  ? "bg-olive text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Tutar (₺)
            </button>
          </div>

          <div className="max-w-xs">
            <label className="mb-1 block text-sm font-medium">
              {mode === "percent" ? "İndirim yüzdesi" : "İndirim tutarı (₺)"}
            </label>
            <input
              type="number"
              min={0}
              max={mode === "percent" ? 100 : undefined}
              step={mode === "percent" ? 1 : 0.01}
              className="admin-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          {preview.length > 0 && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p className="mb-2 font-medium">Önizleme (ilk {preview.length})</p>
              <ul className="space-y-1">
                {preview.map((row) => (
                  <li key={row.id} className="flex flex-wrap justify-between gap-2">
                    <span className="truncate">{row.name}</span>
                    <span>
                      <span className="text-gray-400 line-through">
                        {formatPrice(row.base, "tr")}
                      </span>{" "}
                      →{" "}
                      <span className="font-semibold text-olive">
                        {formatPrice(row.next, "tr")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || selected.size === 0}
              onClick={() => apply("apply")}
              className="admin-btn-primary"
            >
              {saving ? "Kaydediliyor..." : `İndirim uygula (${selected.size})`}
            </button>
            <button
              type="button"
              disabled={saving || selected.size === 0}
              onClick={() => apply("clear")}
              className="admin-btn-secondary"
            >
              İndirimi kaldır
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}
          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {message}
            </p>
          )}
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
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          products.length > 0 && selected.size === products.length
                        }
                        onChange={toggleAll}
                        aria-label="Tümünü seç"
                      />
                    </th>
                    <th>Ürün</th>
                    <th>Liste</th>
                    <th>Satış</th>
                    <th>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const base = getDiscountBasePrice(p);
                    const onSale = isOnSale(p);
                    return (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(p.id)}
                            onChange={() => toggle(p.id)}
                            aria-label={p.nameTr}
                          />
                        </td>
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
                              <p className="truncate text-xs text-gray-400">
                                {p.code}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(base, "tr")}
                        </td>
                        <td className="whitespace-nowrap font-medium">
                          {formatPrice(p.price, "tr")}
                        </td>
                        <td>
                          {onSale ? (
                            <span className="rounded-full bg-bamboo/15 px-2 py-0.5 text-xs text-bamboo">
                              İndirimde
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        ) : null}
      </main>
    </>
  );
}
