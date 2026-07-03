"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

type Props = {
  callbackUrl: string;
  variant?: "store" | "admin";
};

export function AuthButtons({ callbackUrl, variant = "store" }: Props) {
  const [status, setStatus] = useState<{
    ready: boolean;
    hasGoogle: boolean;
    hasApple: boolean;
    hasSecret: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then(setStatus);
  }, []);

  if (!status) {
    return <p className="text-center text-sm text-olive/50">Yükleniyor...</p>;
  }

  if (!status.ready) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          Google girişi henüz yapılandırılmadı
        </div>
        <ol className="ml-4 list-decimal space-y-2 text-xs leading-relaxed">
          <li>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Google Cloud Console
            </a>
            {" "}→ OAuth 2.0 Client ID oluşturun
          </li>
          <li>
            Authorized redirect URI ekleyin:
            <code className="mt-1 block rounded bg-white px-2 py-1 text-[11px]">
              http://localhost:3000/api/auth/callback/google
            </code>
          </li>
          <li>
            Client ID ve Secret değerlerini{" "}
            <code className="rounded bg-white px-1">.env.local</code> dosyasına
            yapıştırın
          </li>
          <li>
            Sunucuyu yeniden başlatın:{" "}
            <code className="rounded bg-white px-1">npm run dev</code>
          </li>
        </ol>
        {!status.hasSecret && (
          <p className="mt-2 text-xs text-red-600">
            NEXTAUTH_SECRET eksik — .env.local dosyasını kontrol edin.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-olive/20 bg-white py-3 text-sm font-medium transition hover:bg-cream-dark"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google ile Giriş
      </button>
      {status.hasApple && variant === "store" && (
        <button
          onClick={() => signIn("apple", { callbackUrl })}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-black py-3 text-sm font-medium text-white transition hover:bg-gray-900"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Apple ile Giriş
        </button>
      )}
    </div>
  );
}
