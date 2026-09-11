"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { Announcement } from "@/lib/types";

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [textTr, setTextTr] = useState("");
  const [textEn, setTextEn] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/announcements")
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
    setTextTr("");
    setTextEn("");
    setEditing(null);
    setError("");
  };

  const startEdit = (item: Announcement) => {
    setEditing(item);
    setTextTr(item.textTr);
    setTextEn(item.textEn ?? "");
    setError("");
    setMessage("");
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTr.trim()) {
      setError("Duyuru metni gerekli");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");

    if (editing) {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          textTr,
          textEn,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setSaving(false);
      if (!res.ok) {
        setError(data.error || "Güncellenemedi");
        return;
      }
      const updated = data as Announcement;
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      resetForm();
      setMessage("Duyuru güncellendi");
      return;
    }

    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textTr, textEn }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Eklenemedi");
      return;
    }
    resetForm();
    setMessage("Duyuru eklendi");
    load();
  };

  const toggleActive = async (item: Announcement) => {
    const res = await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Announcement;
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
        fetch("/api/admin/announcements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, sortOrder: i }),
        })
      )
    );
    load();
  };

  const handleDelete = async (id: string, text: string) => {
    if (!confirm(`"${text}" silinsin mi?`)) return;
    const res = await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((a) => a.id !== id));
      if (editing?.id === id) resetForm();
    }
  };

  const itemActions = (item: Announcement, index: number) => (
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
        onClick={() => handleDelete(item.id, item.textTr)}
        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
        aria-label="Sil"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <>
      <AdminHeader title="Duyurular" />
      <main className="admin-main space-y-6">
        <div ref={formCardRef} className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            {editing
              ? "Duyuru metnini güncelleyin. Kaydettikten sonra mağaza üst bandında yeni metin görünür."
              : "Aktif duyurular mağaza üst bandında sağdan sola, ekleme sırasına göre akar. Duyuru yoksa varsayılan ücretsiz kargo metni gösterilir."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Duyuru (Türkçe)
              </label>
              <input
                type="text"
                value={textTr}
                onChange={(e) => setTextTr(e.target.value)}
                maxLength={200}
                placeholder="Örn: 1500 TL ve üzeri alışverişlerde kargo ücretsiz"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-olive"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Duyuru (English) — isteğe bağlı
              </label>
              <input
                type="text"
                value={textEn}
                onChange={(e) => setTextEn(e.target.value)}
                maxLength={200}
                placeholder="Optional English text"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-olive"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-white hover:bg-olive/90 disabled:opacity-60"
              >
                {saving
                  ? editing
                    ? "Kaydediliyor..."
                    : "Ekleniyor..."
                  : editing
                    ? "Kaydet"
                    : "Duyuru Ekle"}
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
            {loading ? "Yükleniyor..." : `${items.length} duyuru`}
          </div>
          {!loading && items.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">Henüz duyuru yok</p>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {items.map((item, index) => (
                  <div key={item.id} className="space-y-2 px-4 py-3">
                    <p className="break-words font-medium text-gray-800">
                      {item.textTr}
                    </p>
                    {item.textEn ? (
                      <p className="break-words text-xs text-gray-400">
                        {item.textEn}
                      </p>
                    ) : null}
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
                    {itemActions(item, index)}
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap hidden md:block">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>Sıra</th>
                      <th>Metin</th>
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
                          <p className="font-medium text-gray-800">{item.textTr}</p>
                          {item.textEn ? (
                            <p className="mt-0.5 text-xs text-gray-400">
                              {item.textEn}
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
                              onClick={() => handleDelete(item.id, item.textTr)}
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
