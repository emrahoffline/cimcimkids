"use client";

import { useEffect, useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { GiftCardRecord } from "@/lib/gift-cards";

export default function AdminGiftCardsPage() {
  const [cards, setCards] = useState<GiftCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("500");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdCode, setCreatedCode] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/gift-cards")
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setCreatedCode("");
    const res = await fetch("/api/admin/gift-cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        recipientEmail: recipientEmail || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Oluşturulamadı");
      return;
    }
    setCreatedCode(data.code);
    setMessage("Hediye kartı oluşturuldu");
    setRecipientEmail("");
    load();
  };

  const voidCard = async (id: string, code: string) => {
    if (!confirm(`${code} iptal edilsin mi?`)) return;
    const res = await fetch("/api/admin/gift-cards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "void" }),
    });
    if (res.ok) load();
  };

  const statusLabel: Record<string, string> = {
    pending_payment: "Ödeme bekliyor",
    active: "Aktif",
    exhausted: "Tükendi",
    void: "İptal",
  };

  return (
    <>
      <AdminHeader title="Hediye Kartları" />
      <main className="admin-main space-y-6">
        <div className="admin-card space-y-4 p-4 sm:p-6">
          <p className="text-sm text-gray-600">
            Buradan aktif hediye kartı oluşturabilirsiniz. Müşteri satın
            aldığında kart ödeme onayından sonra aktifleşir ve e-posta ile
            kod gönderilir. Müşteri kodu sepette kullanabilir.
          </p>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Tutar (TL)</label>
              <input
                type="number"
                min={100}
                max={10000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Alıcı e-posta (isteğe bağlı)
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? "..." : "Kart Oluştur"}
              </button>
            </div>
          </form>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && (
            <p className="text-sm text-green-700">
              {message}
              {createdCode ? (
                <>
                  {" — Kod: "}
                  <strong className="font-mono">{createdCode}</strong>
                </>
              ) : null}
            </p>
          )}
        </div>

        <div className="admin-card overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
            {loading ? "Yükleniyor..." : `${cards.length} hediye kartı`}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table w-full">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Bakiye</th>
                  <th>Durum</th>
                  <th>Kaynak</th>
                  <th>Tarih</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {!loading && cards.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Henüz hediye kartı yok
                    </td>
                  </tr>
                )}
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-medium">{c.code}</td>
                    <td>
                      {c.remainingBalance} / {c.initialBalance} TL
                    </td>
                    <td>{statusLabel[c.status] ?? c.status}</td>
                    <td className="text-gray-500">
                      {c.createdByAdmin
                        ? "Admin"
                        : c.purchasedOrderId
                          ? "Satın alma"
                          : "—"}
                    </td>
                    <td className="whitespace-nowrap text-gray-400">
                      {new Date(c.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td>
                      {c.status === "active" || c.status === "pending_payment" ? (
                        <button
                          type="button"
                          onClick={() => voidCard(c.id, c.code)}
                          className="text-sm text-red-500 hover:underline"
                        >
                          İptal
                        </button>
                      ) : (
                        "—"
                      )}
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
