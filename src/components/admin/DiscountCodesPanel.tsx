"use client";

import { useEffect, useState } from "react";
import type { DiscountCodeRecord, DiscountKind } from "@/lib/discount-codes";
import { formatPrice } from "@/lib/products";

export function DiscountCodesPanel() {
  const [codes, setCodes] = useState<DiscountCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState<DiscountKind>("percent");
  const [code, setCode] = useState("");
  const [value, setValue] = useState("10");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/admin/discount-codes")
      .then((r) => r.json())
      .then((data) => setCodes(Array.isArray(data) ? data : []))
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
    const res = await fetch("/api/admin/discount-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim() || undefined,
        kind,
        value: Number(value.replace(",", ".")),
        minSubtotal: minSubtotal.trim() ? Number(minSubtotal.replace(",", ".")) : 0,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        expiresAt: expiresAt.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError((data as { error?: string }).error || "Oluşturulamadı");
      return;
    }
    setMessage(`Kod oluşturuldu: ${(data as DiscountCodeRecord).code}`);
    setCode("");
    setValue(kind === "percent" ? "10" : "100");
    setMinSubtotal("");
    setMaxUses("");
    setExpiresAt("");
    load();
  };

  const toggleActive = async (row: DiscountCodeRecord) => {
    const res = await fetch("/api/admin/discount-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, active: !row.active }),
    });
    if (res.ok) load();
  };

  const valueLabel = (row: DiscountCodeRecord) =>
    row.kind === "percent"
      ? `%${row.value}`
      : formatPrice(row.value, "tr");

  return (
    <div className="space-y-6">
      <div className="admin-card space-y-4 p-4 sm:p-6">
        <p className="text-sm text-gray-600">
          Müşterinin sepette gireceği bir kod oluşturun. Yüzde veya sabit tutar
          indirimi, ürün tutarına (kargo ve hediye kartı hariç) uygulanır.
        </p>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium">Kod</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Boş bırakırsanız otomatik"
              className="admin-input font-mono"
              maxLength={24}
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium">Tür</label>
            <select
              className="admin-input"
              value={kind}
              onChange={(e) => setKind(e.target.value === "amount" ? "amount" : "percent")}
            >
              <option value="percent">Yüzde (%)</option>
              <option value="amount">Tutar (₺)</option>
            </select>
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium">
              {kind === "percent" ? "İndirim yüzdesi" : "İndirim tutarı (₺)"}
            </label>
            <input
              type="number"
              min={kind === "percent" ? 1 : 1}
              max={kind === "percent" ? 100 : undefined}
              step={kind === "percent" ? 1 : 0.01}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="admin-input"
              required
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium">
              Min. sepet (₺, isteğe bağlı)
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value)}
              className="admin-input"
              placeholder="Yok"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium">
              Kullanım limiti (isteğe bağlı)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="admin-input"
              placeholder="Sınırsız"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-medium">
              Son geçerlilik (isteğe bağlı)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="admin-input"
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={saving} className="admin-btn-primary w-full sm:w-auto">
              {saving ? "Oluşturuluyor..." : "Kod oluştur"}
            </button>
          </div>
        </form>
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}
        {message && (
          <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
            {message}
          </p>
        )}
      </div>

      <div className="admin-card overflow-hidden">
        {loading && codes.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400">Yükleniyor...</p>
        ) : !loading && codes.length === 0 ? (
          <p className="px-4 py-8 text-center text-gray-400">Henüz indirim kodu yok</p>
        ) : (
          <>
            <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
              {codes.length} indirim kodu
            </div>
            <div className="divide-y divide-gray-100 md:hidden">
              {codes.map((row) => (
                <div key={row.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-all font-mono font-medium text-gray-900">
                      {row.code}
                    </p>
                    {row.active ? (
                      <span className="shrink-0 rounded-full bg-olive/15 px-2 py-0.5 text-xs text-olive">
                        Aktif
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        Pasif
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {valueLabel(row)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Min. sepet{" "}
                    {row.minSubtotal > 0 ? formatPrice(row.minSubtotal, "tr") : "yok"}
                    {" · "}
                    Kullanım {row.usedCount}
                    {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {row.expiresAt
                      ? `Son tarih ${new Date(row.expiresAt).toLocaleString("tr-TR")}`
                      : "Son tarih yok"}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleActive(row)}
                    className="inline-flex min-h-[40px] items-center text-sm font-medium text-bamboo"
                  >
                    {row.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                </div>
              ))}
            </div>
            <div className="admin-table-wrap hidden md:block">
              <table className="admin-table w-full">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>İndirim</th>
                    <th>Min. sepet</th>
                    <th>Kullanım</th>
                    <th>Son tarih</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((row) => (
                    <tr key={row.id}>
                      <td className="font-mono font-medium">{row.code}</td>
                      <td>{valueLabel(row)}</td>
                      <td className="text-gray-500">
                        {row.minSubtotal > 0 ? formatPrice(row.minSubtotal, "tr") : "—"}
                      </td>
                      <td className="text-gray-500">
                        {row.usedCount}
                        {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                      </td>
                      <td className="whitespace-nowrap text-gray-400">
                        {row.expiresAt
                          ? new Date(row.expiresAt).toLocaleString("tr-TR")
                          : "—"}
                      </td>
                      <td>
                        {row.active ? (
                          <span className="rounded-full bg-olive/15 px-2 py-0.5 text-xs text-olive">
                            Aktif
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                            Pasif
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleActive(row)}
                          className="text-sm text-bamboo hover:underline"
                        >
                          {row.active ? "Pasifleştir" : "Aktifleştir"}
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
    </div>
  );
}
