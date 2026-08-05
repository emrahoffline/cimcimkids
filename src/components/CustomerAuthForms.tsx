"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { AuthButtons } from "@/components/AuthButtons";

type Mode = "login" | "register";

export function CustomerAuthForms({
  callbackUrl,
}: {
  callbackUrl: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const base = `/${locale}`;
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    kvkkConsent: false,
    marketingConsent: false,
  });

  const mapError = (code: string) => {
    const keys = [
      "alreadyExists",
      "invalidEmail",
      "invalidName",
      "weakPassword",
      "kvkkRequired",
      "tooManyRequests",
      "adminEmail",
      "passwordMismatch",
      "loginFailed",
    ] as const;
    if ((keys as readonly string[]).includes(code)) {
      return t(code as (typeof keys)[number]);
    }
    return t("formError");
  };

  const openRegister = () => {
    setMode("register");
    setError("");
    setSuccess("");
  };

  const openLogin = () => {
    setMode("login");
    setError("");
    setSuccess("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.passwordConfirm) {
      setError(t("passwordMismatch"));
      return;
    }
    if (!form.kvkkConsent) {
      setError(t("kvkkRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          kvkkConsent: form.kvkkConsent,
          marketingConsent: form.marketingConsent,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(mapError(data.error ?? "formError"));
        return;
      }

      const login = await signIn("credentials", {
        email: form.email,
        password: form.password,
        callbackUrl,
        redirect: false,
      });
      if (login?.error) {
        setSuccess(t("registerOkLogin"));
        setMode("login");
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError(t("formError"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: form.email,
        password: form.password,
        callbackUrl,
        redirect: false,
      });
      if (res?.error) {
        setError(t("loginFailed"));
        return;
      }
      window.location.href = callbackUrl;
    } catch {
      setError(t("formError"));
    } finally {
      setLoading(false);
    }
  };

  if (mode === "register") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-olive">{t("registerTitle")}</h2>
          <button
            type="button"
            onClick={openLogin}
            className="text-sm font-medium text-bamboo hover:underline"
          >
            {t("backToLogin")}
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="rounded-lg bg-olive/10 p-3 text-sm text-olive">{success}</p>
        )}

        <form onSubmit={handleRegister} className="space-y-3">
          <input
            required
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={loading}
          />
          <input
            required
            type="email"
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="input-field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading}
          />
          <input
            required
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            className="input-field"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={loading}
          />
          <input
            required
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordConfirmPlaceholder")}
            className="input-field"
            minLength={8}
            value={form.passwordConfirm}
            onChange={(e) =>
              setForm({ ...form, passwordConfirm: e.target.value })
            }
            disabled={loading}
          />
          <p className="text-xs text-olive/50">{t("passwordHint")}</p>

          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-olive/80">
            <input
              type="checkbox"
              required
              checked={form.kvkkConsent}
              onChange={(e) =>
                setForm({ ...form, kvkkConsent: e.target.checked })
              }
              className="checkbox-field mt-0.5"
            />
            <span>
              {t("kvkkConsent")}{" "}
              <Link
                href={`${base}/kvkk`}
                target="_blank"
                className="text-bamboo underline"
              >
                {t("kvkkLink")}
              </Link>
            </span>
          </label>

          <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-sm text-olive/80">
            <input
              type="checkbox"
              checked={form.marketingConsent}
              onChange={(e) =>
                setForm({ ...form, marketingConsent: e.target.checked })
              }
              className="checkbox-field mt-0.5"
            />
            <span>{t("marketingConsent")}</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60"
          >
            {loading ? t("submitting") : t("registerSubmit")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-olive/10 p-3 text-sm text-olive">{success}</p>
      )}

      <form onSubmit={handleLogin} className="space-y-3">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <input
              required
              type="email"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled={loading}
            />
            <input
              required
              type="password"
              autoComplete="current-password"
              placeholder={t("passwordPlaceholder")}
              className="input-field"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            onClick={openRegister}
            className="mb-2.5 shrink-0 text-sm font-semibold text-bamboo hover:underline"
          >
            {t("registerTab")}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? t("submitting") : t("loginSubmit")}
        </button>
      </form>
    </div>
  );
}
