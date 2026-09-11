"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import type { InvoiceRecord } from "@/lib/invoices";
import { formatPrice } from "@/lib/products";
import { adminCustomerPath } from "@/lib/shopper";

const statusLabel: Record<string, string> = {
  pending: "Bekliyor",
  sending: "Gönderiliyor",
  sent: "Kesildi",
  failed: "Hata",
  cancelled: "İptal",
};

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/invoices")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const retry = async (orderId: string, invoiceId: string) => {
    setRetryingId(invoiceId);
    setError("");
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json().catch(() => ({}));
    setRetryingId(null);
    if (!res.ok) {
      setError(data.error || "Fatura kesilemedi");
      return;
    }
    load();
  };

  return (
    <>
      <AdminHeader title="Faturalar" />
      <main className="admin-main space-y-4">
        {!configured && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            e-Fatura henüz bağlı değil. Bien web servis kullanıcı adı ve
            şifresini (`BIEN_USERNAME`, `BIEN_PASSWORD`) ve firma bilgilerini
            (VKN/TCKN, vergi dairesi, adres) sunucu `.env` dosyasına ekleyin.
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="admin-card overflow-hidden">
          <div className="admin-table-wrap">
            <table className="admin-table w-full min-w-[800px]">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Müşteri</th>
                  <th>Belge</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Yükleniyor...
                    </td>
                  </tr>
                )}
                {!loading && invoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Henüz fatura yok. Ödeme onaylanan siparişlerden kesilir.
                    </td>
                  </tr>
                )}
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.orderNumber}</td>
                    <td>
                      <p>
                        {inv.customerEmail ? (
                          <Link
                            href={adminCustomerPath(inv.customerEmail)}
                            className="font-medium text-bamboo underline decoration-bamboo/40 underline-offset-2 hover:decoration-bamboo"
                          >
                            {inv.customerName}
                          </Link>
                        ) : (
                          inv.customerName
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{inv.customerEmail}</p>
                    </td>
                    <td className="text-xs">
                      <p>
                        {inv.documentType === "e_invoice"
                          ? "e-Fatura"
                          : "e-Arşiv"}
                      </p>
                      <p className="text-gray-500">
                        {inv.invoiceNumber || inv.uuid.slice(0, 8)}
                      </p>
                    </td>
                    <td>{formatPrice(inv.grossAmount, "tr")}</td>
                    <td>
                      <p
                        className={
                          inv.status === "sent"
                            ? "text-emerald-700"
                            : inv.status === "failed"
                              ? "text-red-600"
                              : "text-gray-500"
                        }
                      >
                        {statusLabel[inv.status] ?? inv.status}
                      </p>
                      {inv.errorMessage && (
                        <p className="max-w-[220px] text-[11px] text-red-500">
                          {inv.errorMessage}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-gray-400">
                      {new Date(inv.issuedAt || inv.createdAt).toLocaleString(
                        "tr-TR"
                      )}
                    </td>
                    <td className="text-xs">
                      {inv.status === "sent" ? (
                        <a
                          href={`/api/admin/invoices/${inv.id}/pdf`}
                          className="text-bamboo underline"
                        >
                          PDF
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled={retryingId === inv.id}
                          onClick={() => retry(inv.orderId, inv.id)}
                          className="rounded-lg border border-gray-200 px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                        >
                          {retryingId === inv.id ? "Kesiliyor..." : "Tekrar dene"}
                        </button>
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
