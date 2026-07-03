"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";

const errors: Record<string, { title: string; desc: string }> = {
  Configuration: {
    title: "Yapılandırma Hatası",
    desc: "Google OAuth anahtarları eksik veya hatalı. .env.local dosyasına GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET ekleyip sunucuyu yeniden başlatın.",
  },
  AccessDenied: {
    title: "Erişim Reddedildi",
    desc: "Bu hesapla giriş yapma yetkiniz yok.",
  },
  OAuthSignin: {
    title: "OAuth Başlatılamadı",
    desc: "Google girişi başlatılamadı. OAuth ayarlarınızı kontrol edin.",
  },
  OAuthCallback: {
    title: "OAuth Geri Dönüş Hatası",
    desc: "Google'dan dönüş sırasında hata oluştu. Redirect URI'nin http://localhost:3000/api/auth/callback/google olduğundan emin olun.",
  },
  Default: {
    title: "Giriş Hatası",
    desc: "Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.",
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";
  const info = errors[error] ?? errors.Default;

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="card space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-semibold text-olive">{info.title}</h1>
        <p className="text-sm text-olive/70">{info.desc}</p>
        {error === "Configuration" && (
          <div className="rounded-lg bg-cream-dark p-3 text-left text-xs text-olive/80">
            <p className="font-medium">Kontrol listesi:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>.env.local dosyası var mı?</li>
              <li>GOOGLE_CLIENT_ID ve SECRET dolu mu?</li>
              <li>NEXTAUTH_URL=http://localhost:3000</li>
              <li>Redirect URI Google Console&apos;da kayıtlı mı?</li>
              <li>npm run dev yeniden başlatıldı mı?</li>
            </ul>
          </div>
        )}
        <Link href="/tr/account" className="btn-primary inline-flex">
          Geri Dön
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <html lang="tr">
      <body className="bg-cream antialiased">
        <Suspense fallback={<p className="p-20 text-center">Yükleniyor...</p>}>
          <ErrorContent />
        </Suspense>
      </body>
    </html>
  );
}
