"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, MapPin, Clock, Phone } from "lucide-react";
import { STORE_CONFIG, formatTrPhone, telHref } from "@/lib/store-config";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [sent, setSent] = useState(false);
  const phone = formatTrPhone(STORE_CONFIG.legalPhone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      <div className="grid gap-10 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="card space-y-4">
          {sent ? (
            <p className="rounded-lg bg-leaf/10 p-4 text-leaf">{t("success")}</p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("name")}</label>
                <input required className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("email")}</label>
                <input type="email" required className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("phone")}</label>
                <input type="tel" className="input-field" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t("message")}</label>
                <textarea required rows={5} className="input-field resize-none" />
              </div>
              <button type="submit" className="btn-primary w-full">
                {t("send")}
              </button>
            </>
          )}
        </form>
        <div className="space-y-6">
          <div className="card flex gap-4">
            <MapPin className="h-6 w-6 shrink-0 text-bamboo" />
            <div>
              <p className="font-medium">{t("address")}</p>
              <p className="text-olive/70">{STORE_CONFIG.legalAddress}</p>
              <p className="mt-2 text-sm text-olive/60">
                {STORE_CONFIG.legalName} · {STORE_CONFIG.taxOffice} VD · VN{" "}
                {STORE_CONFIG.taxNumber}
              </p>
            </div>
          </div>
          <div className="card flex gap-4">
            <Phone className="h-6 w-6 shrink-0 text-bamboo" />
            <div>
              <p className="font-medium">{t("phone")}</p>
              <a
                href={telHref(STORE_CONFIG.legalPhone)}
                className="text-olive/70 hover:text-olive"
              >
                {phone}
              </a>
            </div>
          </div>
          <div className="card flex gap-4">
            <Clock className="h-6 w-6 shrink-0 text-bamboo" />
            <div>
              <p className="font-medium">{t("hours")}</p>
              <p className="text-olive/70">{t("hoursValue")}</p>
            </div>
          </div>
          <div className="card flex gap-4">
            <Mail className="h-6 w-6 shrink-0 text-bamboo" />
            <div>
              <p className="font-medium">E-mail</p>
              <a
                href={`mailto:${STORE_CONFIG.legalEmail}`}
                className="text-olive/70 hover:text-olive"
              >
                {STORE_CONFIG.legalEmail}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
