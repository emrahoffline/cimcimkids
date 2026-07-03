"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Package, Check } from "lucide-react";

const DEMO_ORDER = {
  orderNumber: "AB-12345",
  email: "demo@email.com",
  step: 2,
};

export default function TrackingPage() {
  const t = useTranslations("tracking");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<null | { step: number } | "notFound">(null);

  const steps = [
    t("steps.confirmed"),
    t("steps.preparing"),
    t("steps.shipped"),
    t("steps.delivered"),
  ];

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      orderNumber.toUpperCase() === DEMO_ORDER.orderNumber &&
      email.toLowerCase() === DEMO_ORDER.email
    ) {
      setResult({ step: DEMO_ORDER.step });
    } else {
      setResult("notFound");
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
            placeholder="AB-12345"
            required
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
          />
        </div>
        <button type="submit" className="btn-primary w-full">
          {t("track")}
        </button>
        <p className="text-center text-xs text-olive/50">{t("demoNote")}</p>
      </form>
      {result === "notFound" && (
        <p className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">
          {t("notFound")}
        </p>
      )}
      {result && result !== "notFound" && (
        <div className="card">
          <p className="mb-6 font-medium">{t("status")}</p>
          <ol className="space-y-4">
            {steps.map((label, i) => {
              const done = i <= result.step;
              const active = i === result.step;
              return (
                <li key={i} className="flex items-center gap-4">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      done
                        ? "bg-olive text-white"
                        : "border border-olive/20 bg-cream text-olive/40"
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
