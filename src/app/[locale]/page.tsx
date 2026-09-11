import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllProducts } from "@/lib/products-server";
import { getActiveHeroSlides, getActiveStoryGroups } from "@/lib/db";
import { ProductCard } from "@/components/ProductCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import { HeroCarousel } from "@/components/HeroCarousel";
import { StoriesRail } from "@/components/StoriesRail";
import { JsonLd } from "@/components/JsonLd";
import {
  buildMetadata,
  localePath,
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
  const tNav = await getTranslations("nav");
  const tSeo = await getTranslations("seo");
  const base = localePath(locale);
  const [products, heroSlides, storyGroups] = await Promise.all([
    getAllProducts(),
    getActiveHeroSlides().catch(() => []),
    getActiveStoryGroups().catch(() => []),
  ]);

  const slides = heroSlides.map((s) => ({
    id: s.id,
    imageUrl: s.imageUrl,
    alt:
      (locale === "en" ? s.altEn || s.altTr : s.altTr || s.altEn) ||
      tSeo("ogImageAlt"),
  }));

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />

      <StoriesRail groups={storyGroups} />

      <section className="relative w-full overflow-hidden bg-[#f7f3ee]">
        <h1 className="sr-only">{tSeo("homeH1")}</h1>
        <HeroCarousel slides={slides} />
        <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-5 sm:py-6">
          <Link href={`${base}/products`} className="btn-primary">
            {t("shopNow")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={`${base}/gift-cards`} className="btn-secondary">
            {tNav("giftCards")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="text-2xl font-semibold sm:text-3xl">{t("featured")}</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {t("featuredDesc")}
          </p>
        </div>
        <div className="mobile-product-grid">
          {products.map((p, index) => (
            <ProductCard key={p.id} product={p} priority={index < 4} />
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
