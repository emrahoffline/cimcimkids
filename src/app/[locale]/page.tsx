import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllProducts } from "@/lib/products-server";
import { getAllCategories } from "@/lib/categories-server";
import { getActiveHeroSlides, getActiveStoryGroups } from "@/lib/db";
import { getReviewSummaries } from "@/lib/reviews-db";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { HomeCategoryGrid } from "@/components/HomeCategoryGrid";
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
  const [products, categories, heroSlides, storyGroups] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getActiveHeroSlides().catch(() => []),
    getActiveStoryGroups().catch(() => []),
  ]);
  const ratings = await getReviewSummaries(products.map((p) => p.id));
  const featuredProducts = [...products].sort(
    (a, b) => Number(a.category === "ic-giyim") - Number(b.category === "ic-giyim")
  );

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

      <section className="relative w-full overflow-hidden bg-white">
        <h1 className="sr-only">{tSeo("homeH1")}</h1>
        <div className="lg:mx-auto lg:max-w-[1600px] lg:px-6 lg:pt-2">
          <div className="relative lg:overflow-hidden lg:rounded-3xl lg:shadow-[0_24px_60px_-28px_rgba(45,55,72,0.28)]">
            <HeroCarousel slides={slides} />
            <div className="flex flex-wrap items-center justify-center gap-3 px-4 py-5 sm:py-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:z-20 lg:bg-gradient-to-t lg:from-black/35 lg:via-black/10 lg:to-transparent lg:px-8 lg:pb-8 lg:pt-16">
              <Link href={`${base}/products`} className="btn-primary lg:shadow-md">
                {t("shopNow")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`${base}/gift-cards`}
                className="btn-secondary lg:border-white/70 lg:bg-white/90 lg:shadow-md"
              >
                {tNav("giftCards")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-20 lg:pt-14">
        <HomeCategoryGrid
          categories={categories}
          products={products}
          locale={locale}
        />
        <div className="mb-8 text-center sm:mb-10 lg:mb-12">
          <h2 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">{t("featured")}</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            {t("featuredDesc")}
          </p>
        </div>
        <FeaturedProducts
          products={featuredProducts}
          categories={categories}
          ratings={ratings}
        />
        <div className="mt-10 text-center">
          <Link href={`${base}/products`} className="btn-secondary">
            {t("shopNow")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-y border-olive/10 bg-cream-dark/40 py-14 sm:py-16 lg:py-20">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 sm:grid-cols-2 sm:gap-12 sm:px-6 lg:max-w-6xl lg:gap-16 lg:px-8">
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

      <section className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6 sm:py-16 lg:max-w-2xl lg:py-20">
        <h2 className="text-2xl font-semibold">{t("newsletter")}</h2>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          {t("newsletterDesc")}
        </p>
        <NewsletterForm />
      </section>
    </>
  );
}
