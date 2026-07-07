"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Shield } from "lucide-react";
import { AuthButtons } from "@/components/AuthButtons";

export default function AdminLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;
    if (session?.user?.role === "admin") {
      router.replace("/admin");
    } else {
      router.replace("/tr/account?error=not-admin");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1f1a]">
        <p className="text-white/60">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a1f1a] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-olive text-white">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            AryaBamboo Admin
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Yalnızca yetkili yönetici hesapları giriş yapabilir.
          </p>
        </div>

        <AuthButtons callbackUrl="/admin" variant="admin" />

        <p className="mt-6 text-center text-xs text-gray-400">
          emrhgtr@gmail.com, efruzebendes90@gmail.com, info@aryabamboo.com
        </p>

        <Link
          href="/tr"
          className="mt-4 block text-center text-sm text-olive hover:underline"
        >
          ← Mağazaya dön
        </Link>
      </div>
    </div>
  );
}
