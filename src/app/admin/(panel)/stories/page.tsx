"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  StoryMediaUpload,
  type StoryMediaDraft,
} from "@/components/admin/StoryMediaUpload";
import { StoryThumb } from "@/components/StoryThumb";
import type { Story } from "@/lib/types";
import { storyGroupKey } from "@/lib/story-groups";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

function groupPosition(stories: Story[], story: Story) {
  const peers = stories.filter(
    (item) => storyGroupKey(item) === storyGroupKey(story)
  );
  return {
    index: peers.findIndex((item) => item.id === story.id) + 1,
    total: peers.length,
  };
}

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<StoryMediaDraft[]>([]);
  const [durationSec, setDurationSec] = useState(5);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/stories")
      .then((r) => r.json())
      .then((data) => {
        setStories(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setItems([]);
    setDurationSec(5);
    setError("");
  };

  const startEdit = (story: Story) => {
    setEditingId(story.id);
    setTitle(story.title);
    setDurationSec(story.durationSec);
    setItems([{ url: story.mediaUrl, linkUrl: story.linkUrl || "" }]);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0) {
      setError("Lütfen en az bir görsel veya video yükleyin");
      return;
    }
    setSaving(true);
    setError("");

    if (editingId) {
      const item = items[0];
      const res = await fetch(`/api/admin/stories/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          mediaUrl: item.url,
          durationSec,
          linkUrl: item.linkUrl,
        }),
      });
      const data = await res.json();
      setSaving(false);
      if (!res.ok) {
        setError(data.error || "Hikaye güncellenemedi");
        return;
      }
      resetForm();
      load();
      return;
    }

    const res = await fetch("/api/admin/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stories: items.map((item) => ({
          title,
          mediaUrl: item.url,
          durationSec,
          linkUrl: item.linkUrl,
          active: true,
        })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Hikaye eklenemedi");
      return;
    }
    resetForm();
    load();
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch(`/api/admin/stories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stories.length) return;
    const current = stories[index];
    const other = stories[target];
    await Promise.all([
      patch(current.id, { sortOrder: other.sortOrder }),
      patch(other.id, { sortOrder: current.sortOrder }),
    ]);
  };

  const handleDelete = async (story: Story) => {
    if (!confirm(`"${story.title || "Hikaye"}" silinsin mi?`)) return;
    await fetch(`/api/admin/stories/${story.id}`, { method: "DELETE" });
    if (editingId === story.id) resetForm();
    load();
  };

  return (
    <>
      <AdminHeader title="Hikayeler" />
      <main className="admin-main space-y-6">
        <form onSubmit={handleSave} className="admin-card space-y-4 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">
                {editingId ? "Hikayeyi düzenle" : "Yeni hikaye ekle"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {editingId
                  ? "Başlık, görsel, video ve linki güncelleyebilirsiniz."
                  : "Birden fazla fotoğraf veya videoyu aynı anda seçin; sitede tek yuvarlakta arka arkaya izlenir. Her kareye isteğe bağlı link ekleyin."}
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
                İptal
              </button>
            ) : null}
          </div>
          {error ? (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          ) : null}
          <div>
            <label className="mb-1 block text-sm font-medium">Başlık</label>
            <input
              className="admin-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Yeni sezon"
              maxLength={60}
            />
          </div>
          <StoryMediaUpload
            values={items}
            onChange={setItems}
            maxFiles={editingId ? 1 : 20}
          />
          <div>
            <label className="mb-1 block text-sm font-medium">
              Görsel süresi (saniye)
            </label>
            <input
              type="number"
              min={3}
              max={15}
              className="admin-input max-w-32"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-400">
              Videolarda bu süre kullanılmaz; video bitince sonraki hikayeye geçilir.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving || items.length === 0}
            className="admin-btn-primary"
          >
            {editingId ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {saving
              ? "Kaydediliyor..."
              : editingId
                ? "Hikayeyi güncelle"
                : items.length > 1
                  ? `${items.length} kareyi aynı halkaya ekle`
                  : "Hikaye Ekle"}
          </button>
        </form>

        <div className="admin-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Yükleniyor...</p>
          ) : stories.length === 0 ? (
            <p className="p-8 text-center text-gray-400">Henüz hikaye yok</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Hikaye</th>
                    <th>Tür</th>
                    <th>Link</th>
                    <th>Görüntülenme</th>
                    <th>Durum</th>
                    <th>Sıra</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                {stories.map((story, index) => {
                  const position = groupPosition(stories, story);
                  return (
                    <tr
                      key={story.id}
                      className={editingId === story.id ? "bg-olive/5" : undefined}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-gradient-to-br from-bamboo to-olive p-[2px]">
                            <span className="block rounded-full bg-white p-[1px]">
                              <StoryThumb story={story} className="h-11 w-11" />
                            </span>
                          </span>
                          <div>
                            <span className="font-medium">
                              {story.title || "Başlıksız hikaye"}
                            </span>
                            {position.total > 1 ? (
                              <span className="mt-0.5 block text-xs text-gray-400">
                                Aynı halka · {position.index}/{position.total}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>{story.mediaKind === "video" ? "Video" : "Görsel"}</td>
                      <td>
                        {story.linkUrl ? (
                          <a
                            href={story.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-[10rem] items-center gap-1 truncate text-xs text-olive hover:underline"
                            title={story.linkUrl}
                          >
                            <Link2 className="h-3.5 w-3.5 shrink-0" />
                            {story.linkUrl}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <Eye className="h-4 w-4 text-gray-400" />
                          {(story.viewCount ?? 0).toLocaleString("tr-TR")}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            patch(story.id, { active: !story.active })
                          }
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            story.active
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {story.active ? "Yayında" : "Gizli"}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => move(index, -1)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            aria-label="Yukarı"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, 1)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            aria-label="Aşağı"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(story)}
                            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            aria-label="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(story)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            aria-label="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
