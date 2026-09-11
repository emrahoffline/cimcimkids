"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { isUploadedProductImage } from "@/lib/image-utils";
import type { HeroSlide } from "@/lib/types";

export default function AdminHeroPage() {
  const [items, setItems] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [altTr, setAltTr] = useState("");
  const [altEn, setAltEn] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/hero")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setImageUrl("");
    setAltTr("");
    setAltEn("");
    setEditing(null);
    setError("");
  };

  const startEdit = (item: HeroSlide) => {
    setEditing(item);
    setImageUrl(item.imageUrl);
    setAltTr(item.altTr ?? "");
    setAltEn(item.altEn ?? "");
    setError("");
    setMessage("");
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setError("Önce bir görsel yükleyin");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");

    if (editing) {
      const res = await fetch("/api/admin/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          imageUrl,
          altTr,
          altEn,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setError(data.error || "Güncellenemedi");
        return;
      }
      const updated = data as HeroSlide;
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      resetForm();
      setMessage("Fotoğraf güncellendi");
      return;
    }

    const res = await fetch("/api/admin/hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, altTr, altEn }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Eklenemedi");
      return;
    }
    resetForm();
    setMessage("Fotoğraf eklendi");
    load();
  };

  const toggleActive = async (item: HeroSlide) => {
    const res = await fetch("/api/admin/hero", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    if (res.ok) {
      const updated = (await res.json()) as HeroSlide;
      setItems((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setItems(reordered);
    await Promise.all(
      reordered.map((item, i) =>
        fetch("/api/admin/hero", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, sortOrder: i }),
        })
      )
    );
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu hero fotoğrafı silinsin mi?")) return;
    const res = await fetch("/api/admin/hero", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((a) => a.id !== id));
      if (editing?.id === id) resetForm();
    }
  };

  const itemActions = (item: HeroSlide, index: number) => (
    <div className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => move(index, -1)}
        disabled={index === 0}
        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        aria-label="Yukarı"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => move(index, 1)}
        disabled={index === items.length - 1}
        className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        aria-label="Aşağı"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => startEdit(item)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-olive hover:bg-olive/10"
      >
        <Pencil className="h-4 w-4" />
        Düzenle
      </button>
      <button
        type="button"
        onClick={() => handleDelete(item.id)}
        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
        aria-label="Sil"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <>
      <AdminHeader title="Hero Fotoğrafları" />
      <main className="admin-main space-y-6">
        <div ref={formCardRef} className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            {editing
              ? "Hero görselini ve alt metinleri güncelleyin. Kaydettikten sonra ana sayfada yeni fotoğraf görünür."
              : "Ana sayfa hero bölümünde gösterilecek fotoğrafları ekleyin. Sıra yukarı/aşağı ile belirlenir; aktif fotoğraflar otomatik kayar, ziyaretçi elle de kaydırabilir."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Hero görseli"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Alt metin (Türkçe) — isteğe bağlı
              </label>
              <input
                type="text"
                value={altTr}
                onChange={(e) => setAltTr(e.target.value)}
                maxLength={120}
                placeholder="Örn: CimcimKids yaz koleksiyonu"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-olive"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Alt metin (English) — isteğe bağlı
              </label>
              <input
                type="text"
                value={altEn}
                onChange={(e) => setAltEn(e.target.value)}
                maxLength={120}
                placeholder="Optional English alt text"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-olive"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || !imageUrl}
                className="rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-white hover:bg-olive/90 disabled:opacity-60"
              >
                {saving
                  ? editing
                    ? "Kaydediliyor..."
                    : "Ekleniyor..."
                  : editing
                    ? "Kaydet"
                    : "Fotoğraf Ekle"}
              </button>
              {editing ? (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setMessage("");
                  }}
                  className="admin-btn-secondary"
                >
                  İptal
                </button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
            {loading ? "Yükleniyor..." : `${items.length} fotoğraf`}
          </div>
          {!loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">
              Henüz hero fotoğrafı yok
            </p>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {items.map((item, index) => (
                  <div key={item.id} className="space-y-3 px-4 py-3">
                    <div className="flex gap-3">
                      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        <Image
                          src={item.imageUrl}
                          alt={item.altTr || "Hero"}
                          fill
                          unoptimized={isUploadedProductImage(item.imageUrl)}
                          className="object-cover"
                          sizes="112px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Sıra {index + 1}</p>
                        <p className="mt-0.5 break-words font-medium text-gray-800">
                          {item.altTr || "—"}
                        </p>
                        {item.altEn ? (
                          <p className="mt-0.5 break-words text-xs text-gray-400">
                            {item.altEn}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleActive(item)}
                          className={`mt-2 rounded-full px-3 py-1 text-xs font-medium ${
                            item.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {item.active ? "Aktif" : "Pasif"}
                        </button>
                      </div>
                    </div>
                    {itemActions(item, index)}
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap hidden md:block">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>Sıra</th>
                      <th>Görsel</th>
                      <th>Alt metin</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => move(index, -1)}
                              disabled={index === 0}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                              aria-label="Yukarı"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm text-gray-500">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => move(index, 1)}
                              disabled={index === items.length - 1}
                              className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                              aria-label="Aşağı"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td>
                          <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            <Image
                              src={item.imageUrl}
                              alt={item.altTr || "Hero"}
                              fill
                              unoptimized={isUploadedProductImage(item.imageUrl)}
                              className="object-cover"
                              sizes="96px"
                            />
                          </div>
                        </td>
                        <td>
                          <p className="font-medium text-gray-800">
                            {item.altTr || "—"}
                          </p>
                          {item.altEn ? (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {item.altEn}
                            </p>
                          ) : null}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => toggleActive(item)}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              item.active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.active ? "Aktif" : "Pasif"}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-olive hover:bg-olive/10"
                            >
                              <Pencil className="h-4 w-4" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
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
