import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const t = await getTranslations("seo").catch(() => null);
  const title = t ? t("notFoundTitle") : "Sayfa bulunamadı";
  const description = t
    ? t("notFoundDescription")
    : "Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.";
  const home = t ? t("notFoundHome") : "Ana sayfaya dön";
  const products = t ? t("notFoundProducts") : "Ürünlere göz at";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-bamboo">
        404
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-800">{title}</h1>
      <p className="mt-3 text-slate-500">{description}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/tr" className="btn-primary">
          {home}
        </Link>
        <Link href="/tr/products" className="btn-secondary">
          {products}
        </Link>
      </div>
    </div>
  );
}
