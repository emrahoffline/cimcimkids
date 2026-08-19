import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllProducts } from "@/lib/products-server";
import { ProductCard } from "@/components/ProductCard";
import { BrandName } from "@/components/BrandName";
import { NewsletterForm } from "@/components/NewsletterForm";
import { JsonLd } from "@/components/JsonLd";
import {
  buildMetadata,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import { ArrowRight, Shirt, Sparkles } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildMetadata({
    locale,
    path: "",
    title: t("title"),
    description: t("description"),
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const base = `/${locale}`;
  const products = await getAllProducts();

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-leaf/15 via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:py-28">
          <BrandName className="animate-fade-up font-serif text-4xl font-extrabold tracking-tight sm:text-5xl" />
          <h1 className="animate-fade-up-delay mt-5 max-w-xl font-serif text-xl font-semibold text-slate-700 sm:text-2xl">
            {t("heroTitle")}
          </h1>
          <p className="animate-fade-up-delay-2 mt-3 max-w-md text-sm leading-relaxed text-slate-500 sm:text-base">
            {t("heroSubtitle")}
          </p>
          <div className="animate-fade-up-delay-2 mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={`${base}/products`} className="btn-primary">
              {t("shopNow")}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`${base}/about`} className="btn-secondary">
              {t("learnMore")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t("featured")}</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {t("featuredDesc")}
          </p>
        </div>
        <div className="mobile-product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href={`${base}/products`} className="btn-secondary">
            {t("shopNow")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-olive/10 bg-white/60 py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:grid-cols-2 sm:gap-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-3">
            <div className="animate-soft-float flex h-11 w-11 items-center justify-center rounded-2xl bg-olive/15 text-olive">
              <Shirt className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold sm:text-xl">{t("craftTitle")}</h2>
            <p className="text-sm leading-relaxed text-slate-500 sm:text-base">
              {t("craftDesc")}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <div
              className="animate-soft-float flex h-11 w-11 items-center justify-center rounded-2xl bg-bamboo/15 text-bamboo"
              style={{ animationDelay: "1.2s" }}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold sm:text-xl">{t("sustainTitle")}</h2>
            <p className="text-sm leading-relaxed text-slate-500 sm:text-base">
              {t("sustainDesc")}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6 sm:py-16">
        <h2 className="text-2xl font-semibold">{t("newsletter")}</h2>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          {t("newsletterDesc")}
        </p>
        <NewsletterForm />
      </section>
    </>
  );
}
