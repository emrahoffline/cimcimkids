"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { NewsletterSubscriber } from "@/lib/db";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch("/api/admin/subscribers")
      .then((r) => r.json())
      .then((data) => {
        setSubscribers(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`${email} listeden kaldırılsın mı?`)) return;
    const res = await fetch("/api/admin/subscribers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const sourceLabel = (source: string) =>
    source === "checkout" ? "Sipariş" : "Bülten";

  return (
    <>
      <AdminHeader title="E-posta Aboneleri" />
      <main className="admin-main">
        <div className="mb-4 text-sm text-gray-500">
          {loading ? "Yükleniyor..." : `${subscribers.length} abone`}
        </div>
        <div className="admin-card overflow-hidden">
          {loading && subscribers.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">Yükleniyor...</p>
          ) : !loading && subscribers.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">Henüz abone yok</p>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {subscribers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="break-all font-medium text-gray-900">
                        {s.email}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {sourceLabel(s.source)} · {s.locale.toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(s.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id, s.email)}
                      className="inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      aria-label="Sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="admin-table-wrap hidden md:block">
                <table className="admin-table w-full">
                  <thead>
                    <tr>
                      <th>E-posta</th>
                      <th>Kaynak</th>
                      <th>Dil</th>
                      <th>Kayıt Tarihi</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id}>
                        <td className="font-medium">{s.email}</td>
                        <td className="text-gray-500">{sourceLabel(s.source)}</td>
                        <td className="uppercase text-gray-500">{s.locale}</td>
                        <td className="whitespace-nowrap text-gray-400">
                          {new Date(s.createdAt).toLocaleString("tr-TR")}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.email)}
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
            </>
          )}
        </div>
      </main>
    </>
  );
}
