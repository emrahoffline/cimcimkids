"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Check } from "lucide-react";

type TrackResult = {
  orderNumber: string;
  status: string;
  step: number;
  createdAt: string;
  itemCount: number;
};

export default function TrackingPage() {
  const t = useTranslations("tracking");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState<"notFound" | "tooMany" | "generic" | null>(
    null
  );

  const steps = [
    t("steps.confirmed"),
    t("steps.preparing"),
    t("steps.shipped"),
    t("steps.delivered"),
  ];

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
            placeholder="AB-123456"
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

      {result && result.step < 0 && (
        <div className="card text-center">
          <p className="font-medium text-red-600">{t("cancelled")}</p>
          <p className="mt-1 text-sm text-olive/60">
            {result.orderNumber} ·{" "}
            {new Date(result.createdAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {result && result.step >= 0 && (
        <div className="card">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{t("status")}</p>
            <p className="text-sm text-olive/60">
              {result.orderNumber}
              {result.status === "pending_payment" && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  {t("pendingPayment")}
                </span>
              )}
            </p>
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
        </div>
      )}
    </div>
  );
}
