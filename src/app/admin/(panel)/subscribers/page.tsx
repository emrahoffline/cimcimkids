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

  return (
    <>
      <AdminHeader title="E-posta Aboneleri" />
      <main className="admin-main">
        <div className="mb-4 text-sm text-gray-500">
          {loading
            ? "Yükleniyor..."
            : `${subscribers.length} abone`}
        </div>
        <div className="admin-card overflow-hidden">
          <div className="admin-table-wrap">
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
                {!loading && subscribers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Henüz abone yok
                    </td>
                  </tr>
                )}
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="font-medium">{s.email}</td>
                    <td className="text-gray-500">
                      {s.source === "checkout" ? "Sipariş" : "Bülten"}
                    </td>
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
        </div>
      </main>
    </>
  );
}
