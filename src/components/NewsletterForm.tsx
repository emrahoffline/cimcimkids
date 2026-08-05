"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

export function NewsletterForm() {
  const t = useTranslations("home");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const key =
          data.error === "invalidEmail"
            ? "newsletterInvalid"
            : data.error === "tooManyRequests"
              ? "newsletterTooMany"
              : "newsletterError";
        setMessage({ type: "err", text: t(key) });
        return;
      }

      setMessage({
        type: "ok",
        text: data.alreadySubscribed
          ? t("newsletterAlready")
          : t("newsletterSuccess"),
      });
      if (!data.alreadySubscribed) setEmail("");
    } catch {
      setMessage({ type: "err", text: t("newsletterError") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
      >
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="input-field sm:max-w-xs"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary shrink-0 disabled:opacity-60"
        >
          {loading ? t("newsletterSending") : t("subscribe")}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "ok" ? "text-olive" : "text-red-500"
          }`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
