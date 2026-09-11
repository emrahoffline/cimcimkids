"use client";

import { useEffect, useState } from "react";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textTr.trim()) {
      setError("Duyuru metni gerekli");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
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
    setTextTr("");
    setTextEn("");
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
    }
  };

  return (
    <>
      <AdminHeader title="Duyurular" />
      <main className="admin-main space-y-6">
        <div className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Aktif duyurular mağaza üst bandında sağdan sola, ekleme sırasına göre
            akar. Duyuru yoksa varsayılan ücretsiz kargo metni gösterilir.
          </p>
          <form onSubmit={handleAdd} className="space-y-3">
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
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-white hover:bg-olive/90 disabled:opacity-60"
            >
              {saving ? "Ekleniyor..." : "Duyuru Ekle"}
            </button>
          </form>
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
            {loading ? "Yükleniyor..." : `${items.length} duyuru`}
          </div>
          <div className="admin-table-wrap">
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
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400">
                      Henüz duyuru yok
                    </td>
                  </tr>
                )}
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
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id, item.textTr)}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
