"use client";

import { useEffect, useState } from "react";
import type { Order } from "@/lib/db";

type Carrier = {
  id: number;
  name: string;
  sameDay?: boolean;
  standard?: boolean;
};

type Props = {
  order: Order;
  onClose: () => void;
  onDone: () => void;
};

export function ShippingModal({ order, onClose, onDone }: Props) {
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [carrierId, setCarrierId] = useState(1);
  const [desi, setDesi] = useState(String(order.cargoDesi || 1));
  const [postType, setPostType] = useState<"1" | "2">("2");

  useEffect(() => {
    fetch("/api/admin/shipping")
      .then(async (r) => {
        const text = await r.text();
        let data: {
          configured?: boolean;
          carriers?: Carrier[];
          error?: string;
        } = {};
        try {
          data = text ? (JSON.parse(text) as typeof data) : {};
        } catch {
          throw new Error(text.slice(0, 180) || `Navlungo HTTP ${r.status}`);
        }
        setConfigured(data.configured !== false);
        const list = Array.isArray(data.carriers) ? data.carriers : [];
        setCarriers(list);
        if (list[0]?.id) setCarrierId(list[0].id);
        if (data.error) setError(data.error);
        else if (!r.ok) setError(`Navlungo HTTP ${r.status}`);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Navlungo bilgisi alınamadı.")
      )
      .finally(() => setLoading(false));
  }, []);

  const writePopup = (popup: Window | null, html: string) => {
    if (!popup || popup.closed) return;
    try {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
    } catch {
      /* iOS may block document.write on the blank tab */
    }
  };

  const openLabelPdf = async (orderId: string, popup: Window | null) => {
    const labelUrl = `/api/admin/shipping/label?orderId=${encodeURIComponent(orderId)}`;
    const waits = [0, 2000];
    let lastError = "Etiket henüz hazır değil";
    for (const wait of waits) {
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      const lr = await fetch(labelUrl, { headers: { Accept: "application/json" } });
      const type = lr.headers.get("content-type") || "";
      if (lr.ok && type.includes("pdf")) {
        const blob = await lr.blob();
        const url = URL.createObjectURL(blob);
        if (popup && !popup.closed) popup.location.href = url;
        else window.open(url, "_blank");
        return;
      }
      const data = (await lr.json().catch(() => ({}))) as { error?: string };
      if (typeof data.error === "string" && data.error) lastError = data.error;
    }
    throw new Error(
      `Kargo oluştu ama etiket alınamadı (${lastError}). Siparişten Etiket’e birkaç saniye sonra tekrar basın.`
    );
  };

  const create = async () => {
    setSubmitting(true);
    setError("");
    const popup = window.open("about:blank", "_blank");
    writePopup(
      popup,
      "<p style='font-family:system-ui,sans-serif;padding:24px'>Etiket hazırlanıyor…</p>"
    );
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          carrierId,
          desi: Number(desi.replace(",", ".")),
          postType: Number(postType),
          packageCount: 1,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        popup?.close();
        setError((data as { error?: string }).error || "Kargo oluşturulamadı");
        return;
      }
      try {
        await openLabelPdf(order.id, popup);
      } catch (err) {
        popup?.close();
        setError(err instanceof Error ? err.message : "Etiket açılamadı");
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Kargo oluştur</h2>
            <p className="mt-1 text-xs text-gray-500">
              {order.orderNumber} · {order.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-50"
          >
            Kapat
          </button>
        </div>

        {order.shippingAddress && (
          <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600">
            {order.shippingAddress}
          </p>
        )}

        {loading && <p className="text-sm text-gray-400">Kargo firmaları yükleniyor...</p>}
        {!loading && !configured && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Navlungo henüz bağlı değil. Panel hesabı açıp API kullanıcı adı/şifresini
            sunucuya ekleyin.
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {!loading && configured && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              Kargo firması
              <select
                className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={carrierId}
                onChange={(e) => setCarrierId(Number(e.target.value))}
              >
                {carriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.sameDay ? " · aynı gün" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Teslimat
              <select
                className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={postType}
                onChange={(e) => setPostType(e.target.value === "1" ? "1" : "2")}
              >
                <option value="2">Standart</option>
                <option value="1">Aynı gün</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-600">
              Desi / kg
              <input
                className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-200 px-3 text-sm"
                value={desi}
                onChange={(e) => setDesi(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <p className="text-[11px] text-gray-400">
              Kesilen kargo ücreti siparişte ve gider kaydında görünür; gelir-gider
              tablosunda kullanılacak.
            </p>
            <button
              type="button"
              disabled={submitting || !carriers.length}
              onClick={create}
              className="min-h-[44px] w-full rounded-lg bg-bamboo px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {submitting ? "Oluşturuluyor..." : "Oluştur ve etiketi aç"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
