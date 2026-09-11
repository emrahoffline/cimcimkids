"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Package, Check } from "lucide-react";

type TrackItem = { name: string; quantity: number; price: number };
type TrackHistory = { status: string; at: string };

type TrackResult = {
  orderNumber: string;
  status: string;
  step: number;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  total: number;
  items: TrackItem[];
  history: TrackHistory[];
  cargoCarrier?: string;
  cargoPostNumber?: string;
  cargoTrackingUrl?: string;
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  pending_payment: "statuses.pendingPayment",
  pending: "statuses.confirmed",
  confirmed: "statuses.confirmed",
  preparing: "statuses.preparing",
  shipped: "statuses.shipped",
  delivered: "statuses.delivered",
  cancelled: "statuses.cancelled",
};

export default function TrackingPage() {
  const t = useTranslations("tracking");
  const locale = useLocale();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<"notFound" | "tooMany" | "generic" | null>(
    null
  );

  const steps = [
    t("steps.pendingPayment"),
    t("steps.confirmed"),
    t("steps.preparing"),
    t("steps.shipped"),
    t("steps.delivered"),
  ];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const statusLabel = (status: string) => {
    const key = STATUS_LABEL_KEYS[status];
    return key ? t(key as "statuses.pendingPayment") : status;
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setError("notFound");
        return;
      }
      if (res.status === 429) {
        setError("tooMany");
        return;
      }
      if (!res.ok) {
        setError("generic");
        return;
      }

      setResult(data as TrackResult);
    } catch {
      setError("generic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-10 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-bamboo" />
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      <form onSubmit={handleTrack} className="card mb-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {t("orderNumber")}
          </label>
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="input-field"
            placeholder="CK-123456"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            required
            disabled={loading}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? t("tracking") : t("track")}
        </button>
        <p className="text-center text-xs text-olive/50">{t("hint")}</p>
      </form>

      {error === "notFound" && (
        <p className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
          {t("notFound")}
        </p>
      )}
      {error === "tooMany" && (
        <p className="rounded-lg bg-amber-50 p-4 text-center text-sm text-amber-800">
          {t("tooMany")}
        </p>
      )}
      {error === "generic" && (
        <p className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
          {t("error")}
        </p>
      )}

      {result && (
        <div className="space-y-4">
          {result.step < 0 ? (
            <div className="card text-center">
              <p className="font-medium text-red-600">{t("cancelled")}</p>
              <p className="mt-1 text-sm text-olive/60">
                {result.orderNumber} · {formatDate(result.createdAt)}
              </p>
            </div>
          ) : (
            <div className="card">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{t("status")}</p>
                  <p className="mt-1 text-sm font-semibold text-bamboo">
                    {statusLabel(result.status)}
                  </p>
                </div>
                <p className="text-sm text-olive/60">{result.orderNumber}</p>
              </div>
              <ol className="space-y-4">
                {steps.map((label, i) => {
                  const done = i <= result.step;
                  const active = i === result.step;
                  return (
                    <li key={i} className="flex items-center gap-4">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          done
                            ? "bg-bamboo text-white"
                            : "border border-bamboo/20 bg-cream text-bamboo/40"
                        }`}
                      >
                        {done && <Check className="h-4 w-4" />}
                      </span>
                      <span
                        className={
                          active
                            ? "font-semibold text-olive"
                            : done
                              ? "text-olive/80"
                              : "text-olive/40"
                        }
                      >
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {result.cargoTrackingUrl && (
                <a
                  href={result.cargoTrackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-bamboo px-4 text-sm font-semibold text-white"
                >
                  {t("cargoTrack")}
                  {result.cargoCarrier ? ` — ${result.cargoCarrier}` : ""}
                  {result.cargoPostNumber ? ` (${result.cargoPostNumber})` : ""}
                </a>
              )}
            </div>
          )}

          {result.history.length > 0 && (
            <div className="card">
              <p className="mb-4 font-medium">{t("historyTitle")}</p>
              <ul className="space-y-3">
                {[...result.history].reverse().map((h, i) => (
                  <li
                    key={`${h.status}-${h.at}-${i}`}
                    className="flex items-start justify-between gap-3 border-b border-bamboo/10 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-olive">
                      {statusLabel(h.status)}
                    </span>
                    <span className="shrink-0 text-xs text-olive/50">
                      {formatDate(h.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.items?.length > 0 && (
            <div className="card">
              <p className="mb-4 font-medium">{t("itemsTitle")}</p>
              <ul className="space-y-2">
                {result.items.map((item, i) => (
                  <li
                    key={`${item.name}-${i}`}
                    className="flex justify-between gap-3 text-sm text-olive/80"
                  >
                    <span>
                      {item.name}
                      <span className="text-olive/50"> × {item.quantity}</span>
                    </span>
                    <span>
                      {(item.price * item.quantity).toLocaleString(
                        locale === "en" ? "en-GB" : "tr-TR",
                        { style: "currency", currency: "TRY" }
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex justify-between border-t border-bamboo/10 pt-3 text-sm font-semibold text-olive">
                <span>{t("total")}</span>
                <span>
                  {result.total.toLocaleString(
                    locale === "en" ? "en-GB" : "tr-TR",
                    { style: "currency", currency: "TRY" }
                  )}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
