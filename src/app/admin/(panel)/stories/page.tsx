"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { StoryItem } from "@/lib/types";
import { groupStories, isStoryVideo } from "@/lib/stories";

export default function AdminStoriesPage() {
  const [items, setItems] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [durationSec, setDurationSec] = useState(5);
  const [groupId, setGroupId] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const groups = groupStories(items);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/stories")
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Yükleme başarısız");
        setUploading(false);
        return;
      }
      if (typeof data.url === "string") uploaded.push(data.url);
    }
    setMediaUrls((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Başlık gerekli");
      return;
    }
    if (mediaUrls.length === 0) {
      setError("Fotoğraf veya video yükleyin");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        mediaUrls,
        durationSec,
        linkUrl,
        groupId: groupId || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Eklenemedi");
      return;
    }
    setTitle("");
    setLinkUrl("");
    setDurationSec(5);
    setGroupId("");
    setMediaUrls([]);
    setMessage("Hikaye eklendi");
    load();
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (res.ok) {
      const updated = (await res.json()) as StoryItem;
      setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    }
  };

  const moveGroup = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= groups.length) return;
    const reordered = [...groups];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    let order = 0;
    const updates: Promise<unknown>[] = [];
    for (const group of reordered) {
      for (const item of group.items) {
        updates.push(
          fetch("/api/admin/stories", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, sortOrder: order }),
          })
        );
        order += 1;
      }
    }
    await Promise.all(updates);
    load();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Bu slayt silinsin mi?")) return;
    const res = await fetch("/api/admin/stories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setItems((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeleteGroup = async (gid: string, name: string) => {
    if (!confirm(`"${name}" hikayesinin tüm slaytları silinsin mi?`)) return;
    const res = await fetch("/api/admin/stories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: gid }),
    });
    if (res.ok) setItems((prev) => prev.filter((s) => s.groupId !== gid));
  };

  return (
    <>
      <AdminHeader title="Hikayeler" />
      <main className="admin-main space-y-6">
        <div className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Anasayfada Instagram tarzı hikayeler. Aynı başlıkla birden fazla
            fotoğraf/video ekleyebilir veya mevcut bir gruba slayt ekleyebilirsiniz.
            Görseller 3–15 sn; videolar kendi süresinde oynar.
          </p>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Başlık</label>
                <input
                  className="admin-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Yeni sezon"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Mevcut gruba ekle
                </label>
                <select
                  className="admin-input"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  <option value="">Yeni hikaye grubu</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title || g.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Görsel süresi (sn)
                </label>
                <input
                  type="number"
                  min={3}
                  max={15}
                  className="admin-input"
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Ürün linki (isteğe bağlı)
                </label>
                <input
                  className="admin-input"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://www.cimcimkids.com/tr/products/..."
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Medya</label>
              <div className="flex flex-wrap gap-2">
                {mediaUrls.map((url) => (
                  <div
                    key={url}
                    className="relative h-20 w-20 overflow-hidden rounded-lg border bg-gray-50"
                  >
                    {isStoryVideo(url) ? (
                      <video src={url} className="h-full w-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-red-500 px-1 text-[10px] text-white"
                      onClick={() =>
                        setMediaUrls((prev) => prev.filter((u) => u !== url))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                multiple
                className="mt-2 text-sm"
                onChange={(e) => {
                  uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="mt-1 text-xs text-gray-400">
                {uploading
                  ? "Yükleniyor..."
                  : "JPG, PNG, MP4 · görsel max 8 MB, video max 40 MB"}
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-white hover:bg-olive/90 disabled:opacity-60"
            >
              {saving ? "Ekleniyor..." : "Hikaye Ekle"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-gray-400">Yükleniyor...</p>}
          {!loading && groups.length === 0 && (
            <p className="admin-card p-8 text-center text-gray-400">
              Henüz hikaye yok
            </p>
          )}
          {groups.map((group, index) => (
            <div key={group.id} className="admin-card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                <div>
                  <p className="font-medium">{group.title || "İsimsiz"}</p>
                  <p className="text-xs text-gray-400">
                    {group.items.length} slayt
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveGroup(index, -1)}
                    disabled={index === 0}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    aria-label="Yukarı"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveGroup(index, 1)}
                    disabled={index === groups.length - 1}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    aria-label="Aşağı"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(group.id, group.title)}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50"
                    aria-label="Grubu sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>Medya</th>
                      <th>Link</th>
                      <th>Görüntülenme</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="h-12 w-12 overflow-hidden rounded-lg bg-gray-100">
                            {isStoryVideo(item.mediaUrl) ? (
                              <video
                                src={item.mediaUrl}
                                className="h-full w-full object-cover"
                                muted
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.mediaUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                        </td>
                        <td className="max-w-[220px] truncate text-xs text-gray-500">
                          {item.linkUrl || "—"}
                        </td>
                        <td>{item.viewCount}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => patch(item.id, { active: !item.active })}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              item.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {item.active ? "Aktif" : "Pasif"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded p-1.5 text-red-500 hover:bg-red-50"
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
          ))}
        </div>
      </main>
    </>
  );
}
