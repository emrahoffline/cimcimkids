import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function LocaleNotFound() {
  const locale = await getLocale().catch(() => "tr");
  const t = await getTranslations("seo");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-bamboo">
        404
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-800">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-3 text-slate-500">{t("notFoundDescription")}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href={`/${locale}`} className="btn-primary">
          {t("notFoundHome")}
        </Link>
        <Link href={`/${locale}/products`} className="btn-secondary">
          {t("notFoundProducts")}
        </Link>
      </div>
    </div>
  );
}
