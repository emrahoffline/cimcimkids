"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StoryMediaUpload } from "@/components/admin/StoryMediaUpload";
import { StoryThumb } from "@/components/StoryThumb";
import type { Story } from "@/lib/types";
import { storyGroupKey } from "@/lib/story-groups";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from "lucide-react";

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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [durationSec, setDurationSec] = useState(5);

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

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mediaUrls.length === 0) {
      setError("Lütfen en az bir görsel veya video yükleyin");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stories: mediaUrls.map((mediaUrl) => ({
          title,
          mediaUrl,
          durationSec,
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
    setTitle("");
    setMediaUrls([]);
    setDurationSec(5);
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
    load();
  };

  return (
    <>
      <AdminHeader title="Hikayeler" />
      <main className="admin-main space-y-6">
        <form onSubmit={handleCreate} className="admin-card space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Yeni hikaye ekle</h2>
            <p className="mt-1 text-sm text-gray-500">
              Birden fazla fotoğraf veya videoyu aynı anda seçin; sitede tek
              yuvarlakta arka arkaya izlenir.
            </p>
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
              placeholder="Örn. Yeni sezon (hepsine uygulanır)"
              maxLength={60}
            />
          </div>
          <StoryMediaUpload values={mediaUrls} onChange={setMediaUrls} />
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
            disabled={saving || mediaUrls.length === 0}
            className="admin-btn-primary"
          >
            <Plus className="h-4 w-4" />
            {saving
              ? "Ekleniyor..."
              : mediaUrls.length > 1
                ? `${mediaUrls.length} kareyi aynı halkaya ekle`
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
                    <tr key={story.id}>
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
                        <button
                          type="button"
                          onClick={() => handleDelete(story)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          aria-label="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
