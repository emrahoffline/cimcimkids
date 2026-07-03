"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Shield } from "lucide-react";
import { AuthButtons } from "@/components/AuthButtons";

export default function AccountPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-olive/60">
        ...
      </div>
    );
  }

  if (session?.user) {
    if (isAdmin) {
      return (
        <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
          <h1 className="mb-6 text-3xl font-semibold">{t("title")}</h1>
          <div className="card space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive/10 text-olive">
              <Shield className="h-6 w-6" />
            </div>
            <p className="text-olive/70">{t("adminOnlyStorefront")}</p>
            <Link href="/admin" className="btn-primary w-full">
              {t("goToAdmin")}
            </Link>
            <button onClick={() => signOut()} className="btn-secondary w-full">
              {t("signOut")}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <h1 className="mb-6 text-3xl font-semibold">{t("title")}</h1>
        <div className="card space-y-4">
          <p>
            {t("welcome")},{" "}
            <span className="font-medium">
              {session.user.name ?? session.user.email}
            </span>
          </p>
          <div>
            <h2 className="mb-2 font-medium">{t("orders")}</h2>
            <p className="text-sm text-olive/60">{t("noOrders")}</p>
          </div>
          <button onClick={() => signOut()} className="btn-secondary w-full">
            {t("signOut")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-center text-3xl font-semibold">
        {t("signInTitle")}
      </h1>
      <p className="mb-8 text-center text-olive/60">{t("signInDesc")}</p>
      <AuthButtons callbackUrl={`/${locale}/account`} />
    </div>
  );
}
