"use client";

import { useEffect, useMemo, useState } from "react";
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

type Tab = "active" | "cancelled";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("active");

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

  const activeInvoices = useMemo(
    () => invoices.filter((inv) => inv.status !== "cancelled"),
    [invoices]
  );
  const cancelledInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "cancelled"),
    [invoices]
  );
  const visible = tab === "cancelled" ? cancelledInvoices : activeInvoices;

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

  const cancelInvoice = async (inv: InvoiceRecord) => {
    if (
      !confirm(
        `${inv.orderNumber || inv.invoiceNumber || "Bu fatura"} iptal edilsin mi? İptal edilen faturalar gelir listesinden çıkar.`
      )
    ) {
      return;
    }
    setCancellingId(inv.id);
    setError("");
    const res = await fetch("/api/admin/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inv.id, action: "cancel" }),
    });
    const data = await res.json().catch(() => ({}));
    setCancellingId(null);
    if (!res.ok) {
      setError(data.error || "Fatura iptal edilemedi");
      return;
    }
    const updated = data as InvoiceRecord;
    setInvoices((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const canShowPdf = (inv: InvoiceRecord) =>
    inv.status === "sent" || (inv.status === "cancelled" && Boolean(inv.issuedAt));

  const invoiceActions = (inv: InvoiceRecord) => (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {canShowPdf(inv) ? (
        <a
          href={`/api/admin/invoices/${inv.id}/pdf`}
          className="inline-flex min-h-[40px] items-center text-bamboo underline"
        >
          PDF
        </a>
      ) : inv.status !== "cancelled" ? (
        <button
          type="button"
          disabled={retryingId === inv.id}
          onClick={() => retry(inv.orderId, inv.id)}
          className="rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
        >
          {retryingId === inv.id ? "Kesiliyor..." : "Tekrar dene"}
        </button>
      ) : null}
      {inv.status !== "cancelled" ? (
        <button
          type="button"
          disabled={cancellingId === inv.id}
          onClick={() => cancelInvoice(inv)}
          className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          {cancellingId === inv.id ? "İptal ediliyor..." : "İptal"}
        </button>
      ) : (
        <button
          type="button"
          disabled={retryingId === inv.id}
          onClick={() => retry(inv.orderId, inv.id)}
          className="rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 disabled:opacity-40"
        >
          {retryingId === inv.id ? "Kesiliyor..." : "Tekrar kes"}
        </button>
      )}
    </div>
  );

  const invoiceCard = (inv: InvoiceRecord) => (
    <div key={inv.id} className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 break-all font-medium text-gray-900">
          {inv.orderNumber}
        </p>
        <p className="shrink-0 text-sm font-semibold text-gray-900">
          {formatPrice(inv.grossAmount, "tr")}
        </p>
      </div>
      <div>
        {inv.customerEmail ? (
          <Link
            href={adminCustomerPath(inv.customerEmail)}
            className="font-medium text-bamboo underline decoration-bamboo/40 underline-offset-2 hover:decoration-bamboo"
          >
            {inv.customerName}
          </Link>
        ) : (
          <p className="text-sm text-gray-800">{inv.customerName}</p>
        )}
        {inv.customerEmail ? (
          <p className="break-all text-xs text-gray-400">{inv.customerEmail}</p>
        ) : null}
      </div>
      <p className="text-xs text-gray-500">
        {inv.documentType === "e_invoice" ? "e-Fatura" : "e-Arşiv"}
        {inv.invoiceNumber || inv.uuid
          ? ` · ${inv.invoiceNumber || inv.uuid.slice(0, 8)}`
          : ""}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p
          className={
            inv.status === "sent"
              ? "text-sm text-emerald-700"
              : inv.status === "failed" || inv.status === "cancelled"
                ? "text-sm text-red-600"
                : "text-sm text-gray-500"
          }
        >
          {statusLabel[inv.status] ?? inv.status}
        </p>
        <p className="text-xs text-gray-400">
          {new Date(inv.issuedAt || inv.createdAt).toLocaleString("tr-TR")}
        </p>
      </div>
      {inv.errorMessage ? (
        <p className="text-[11px] leading-snug text-red-500">{inv.errorMessage}</p>
      ) : null}
      <div className="pt-1">{invoiceActions(inv)}</div>
    </div>
  );

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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "active"
                ? "bg-olive text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Faturalar ({activeInvoices.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("cancelled")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              tab === "cancelled"
                ? "bg-olive text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            İptal edilenler ({cancelledInvoices.length})
          </button>
        </div>
        <div className="admin-card overflow-hidden">
          {loading && invoices.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">Yükleniyor...</p>
          ) : !loading && visible.length === 0 ? (
            <p className="px-4 py-8 text-center text-gray-400">
              {tab === "cancelled"
                ? "İptal edilen fatura yok."
                : "Henüz fatura yok. Ödeme onaylanan siparişlerden kesilir."}
            </p>
          ) : (
            <>
              <div className="divide-y divide-gray-100 md:hidden">
                {visible.map((inv) => invoiceCard(inv))}
              </div>
              <div className="admin-table-wrap hidden md:block">
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
                    {visible.map((inv) => (
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
                          <p className="text-xs text-gray-400">
                            {inv.customerEmail}
                          </p>
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
                                : inv.status === "failed" ||
                                    inv.status === "cancelled"
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
                          {new Date(
                            inv.issuedAt || inv.createdAt
                          ).toLocaleString("tr-TR")}
                        </td>
                        <td className="text-xs">{invoiceActions(inv)}</td>
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
