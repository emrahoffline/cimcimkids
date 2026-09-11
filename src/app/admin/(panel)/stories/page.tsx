"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowUp, ArrowDown, Pencil } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { StoryItem } from "@/lib/types";
import { groupStories, isStoryVideo, type StoryGroup } from "@/lib/stories";

type EditState =
  | { type: "slide"; item: StoryItem }
  | { type: "group"; group: StoryGroup }
  | null;

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
  const [editing, setEditing] = useState<EditState>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  const groups = groupStories(items);
  const editingSlide = editing?.type === "slide" ? editing.item : null;
  const editingGroup = editing?.type === "group" ? editing.group : null;

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

  const scrollToForm = () => {
    formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetForm = () => {
    setTitle("");
    setLinkUrl("");
    setDurationSec(5);
    setGroupId("");
    setMediaUrls([]);
    setEditing(null);
    setError("");
  };

  const startEditSlide = (item: StoryItem) => {
    setEditing({ type: "slide", item });
    setTitle(item.title);
    setLinkUrl(item.linkUrl);
    setDurationSec(item.durationSec);
    setGroupId(item.groupId || item.id);
    setMediaUrls(item.mediaUrl ? [item.mediaUrl] : []);
    setError("");
    setMessage("");
    scrollToForm();
  };

  const startEditGroup = (group: StoryGroup) => {
    const first = group.items[0];
    setEditing({ type: "group", group });
    setTitle(group.title);
    setLinkUrl(first?.linkUrl ?? "");
    setDurationSec(first?.durationSec ?? 5);
    setGroupId(group.id);
    setMediaUrls([]);
    setError("");
    setMessage("");
    scrollToForm();
  };

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
    setMediaUrls((prev) =>
      editingSlide ? uploaded.slice(0, 1) : [...prev, ...uploaded]
    );
    setUploading(false);
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch("/api/admin/stories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) return null;
    const updated = (await res.json()) as StoryItem;
    setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    return updated;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Başlık gerekli");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    if (editingGroup) {
      const first = editingGroup.items[0];
      if (!first) {
        setSaving(false);
        setError("Hikaye bulunamadı");
        return;
      }
      const updated = await patch(first.id, {
        title,
        linkUrl,
        applyTitleToGroup: true,
        applyLinkToGroup: true,
      });
      setSaving(false);
      if (!updated) {
        setError("Güncellenemedi");
        return;
      }
      resetForm();
      setMessage("Hikaye güncellendi");
      load();
      return;
    }

    if (editingSlide) {
      if (mediaUrls.length === 0) {
        setSaving(false);
        setError("Fotoğraf veya video yükleyin");
        return;
      }
      const nextGroupId =
        groupId.trim() || editingSlide.groupId || editingSlide.id;
      const updated = await patch(editingSlide.id, {
        title,
        mediaUrl: mediaUrls[0],
        durationSec,
        linkUrl,
        groupId: nextGroupId,
        applyTitleToGroup: nextGroupId === editingSlide.groupId,
      });
      setSaving(false);
      if (!updated) {
        setError("Güncellenemedi");
        return;
      }
      resetForm();
      setMessage("Slayt güncellendi");
      load();
      return;
    }

    if (mediaUrls.length === 0) {
      setSaving(false);
      setError("Fotoğraf veya video yükleyin");
      return;
    }
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
    resetForm();
    setMessage("Hikaye eklendi");
    load();
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
    if (res.ok) {
      setItems((prev) => prev.filter((s) => s.id !== id));
      if (editingSlide?.id === id) resetForm();
    }
  };

  const handleDeleteGroup = async (gid: string, name: string) => {
    if (!confirm(`"${name}" hikayesinin tüm slaytları silinsin mi?`)) return;
    const res = await fetch("/api/admin/stories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: gid }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((s) => s.groupId !== gid));
      if (editingGroup?.id === gid || editingSlide?.groupId === gid) resetForm();
    }
  };

  return (
    <>
      <AdminHeader title="Hikayeler" />
      <main className="admin-main space-y-6">
        <div ref={formCardRef} className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            {editingGroup
              ? "Başlık ve ürün linki bu hikayedeki tüm slaytlara uygulanır. Tek bir slaytı değiştirmek için listedeki Düzenle’yi kullanın."
              : editingSlide
                ? "Bu slaytın görseli, süresi ve ürün linkini güncelleyin."
                : "Anasayfada Instagram tarzı hikayeler. Aynı başlıkla birden fazla fotoğraf/video ekleyebilir veya mevcut bir gruba slayt ekleyebilirsiniz. Görseller 3–15 sn; videolar kendi süresinde oynar."}
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`grid gap-3 ${editingGroup ? "" : "sm:grid-cols-2"}`}>
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
              {!editingGroup ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    {editingSlide ? "Grup" : "Mevcut gruba ekle"}
                  </label>
                  <select
                    className="admin-input"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  >
                    {editingSlide ? null : (
                      <option value="">Yeni hikaye grubu</option>
                    )}
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title || g.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
            <div className={`grid gap-3 ${editingGroup ? "" : "sm:grid-cols-2"}`}>
              {!editingGroup ? (
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
              ) : null}
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

            {!editingGroup ? (
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
                  multiple={!editingSlide}
                  className="mt-2 text-sm"
                  onChange={(e) => {
                    uploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {uploading
                    ? "Yükleniyor..."
                    : editingSlide
                      ? "Yeni dosya seçerseniz mevcut medyanın yerini alır."
                      : "JPG, PNG, MP4 · görsel max 8 MB, video max 40 MB"}
                </p>
              </div>
            ) : null}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {message && <p className="text-sm text-green-700">{message}</p>}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-white hover:bg-olive/90 disabled:opacity-60"
              >
                {saving
                  ? editing
                    ? "Kaydediliyor..."
                    : "Ekleniyor..."
                  : editing
                    ? "Kaydet"
                    : "Hikaye Ekle"}
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
                    onClick={() => startEditGroup(group)}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-olive hover:bg-olive/10"
                  >
                    <Pencil className="h-4 w-4" />
                    Düzenle
                  </button>
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
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditSlide(item)}
                              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-olive hover:bg-olive/10"
                            >
                              <Pencil className="h-4 w-4" />
                              Düzenle
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
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
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
