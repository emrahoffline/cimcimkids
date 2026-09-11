"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StarRating } from "@/components/StarRating";
import type { AdminReview } from "@/lib/reviews";

export default function AdminReviewsPage() {
  const [items, setItems] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleHidden = async (item: AdminReview) => {
    const res = await fetch("/api/admin/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, hidden: !item.hidden }),
    });
    if (!res.ok) {
      setError("Güncellenemedi");
      return;
    }
    const updated = (await res.json()) as AdminReview;
    setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  };

  const remove = async (item: AdminReview) => {
    if (!confirm("Bu yorum silinsin mi?")) return;
    const res = await fetch("/api/admin/reviews", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    });
    if (!res.ok) {
      setError("Silinemedi");
      return;
    }
    setItems((prev) => prev.filter((row) => row.id !== item.id));
  };

  return (
    <>
      <AdminHeader title="Ürün yorumları" />
      <div className="p-4 sm:p-6">
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-gray-500">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz yorum yok.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`admin-card p-4 ${item.hidden ? "opacity-70" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/tr/products/${item.productSlug}`}
                      className="font-medium text-gray-900 hover:underline"
                      target="_blank"
                    >
                      {item.productName}
                    </Link>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.customerName} · {item.customerEmail} · {item.orderNumber}
                    </p>
                    <div className="mt-1">
                      <StarRating value={item.rating} size="sm" />
                    </div>
                    {item.comment ? (
                      <p className="mt-2 text-sm text-gray-700">{item.comment}</p>
                    ) : (
                      <p className="mt-2 text-xs italic text-gray-400">Yalnızca puan</p>
                    )}
                    {item.images?.length ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {item.images.map((src) => (
                          <li key={src}>
                            <a href={src} target="_blank" rel="noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 text-[11px] text-gray-400">
                      {new Date(item.createdAt).toLocaleString("tr-TR")}
                      {item.hidden ? " · Gizli" : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHidden(item)}
                      className="admin-btn-secondary px-3 text-xs"
                    >
                      {item.hidden ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      {item.hidden ? "Göster" : "Gizle"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="admin-btn-secondary px-3 text-xs text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Sil
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
