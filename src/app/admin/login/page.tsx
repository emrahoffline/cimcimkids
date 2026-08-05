"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { AuthButtons } from "@/components/AuthButtons";
import { AdminPasswordLogin } from "@/components/AdminPasswordLogin";

export default function AdminLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/tr/account?error=not-admin");
    }
  }, [session, status, router]);

  useEffect(() => {
    // Prod'da şifre girişi kapalı olabilir; sadece provider varsa göster.
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((data) => {
        setShowPasswordLogin(!!data?.["admin-password"]);
      })
      .catch(() => setShowPasswordLogin(false));
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1f1a]">
        <p className="text-white/60">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#1a1f1a] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-olive text-white">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
            CimcimKids Admin
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Yalnızca yetkili yönetici hesapları giriş yapabilir.
          </p>
        </div>

        <AuthButtons callbackUrl="/admin" variant="admin" />

        {showPasswordLogin && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-gray-300">
              <div className="h-px flex-1 bg-gray-200" />
              veya
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <AdminPasswordLogin />
          </>
        )}

        <Link
          href="/tr"
          className="mt-6 block text-center text-sm text-olive hover:underline"
        >
          ← Mağazaya dön
        </Link>
      </div>
    </div>
  );
}
