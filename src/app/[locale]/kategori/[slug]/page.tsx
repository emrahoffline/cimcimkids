import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllProducts } from "@/lib/products-server";
import { getAllCategories } from "@/lib/categories-server";
import { ProductsGrid } from "@/components/ProductsGrid";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  buildMetadata,
  canonicalUrl,
  getCategorySeo,
  localePath,
} from "@/lib/seo";
import { getReviewSummaries } from "@/lib/reviews-db";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const categories = await getAllCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    return { robots: { index: false, follow: false } };
  }
  const seo = getCategorySeo(category, locale);
  return buildMetadata({
    locale,
    path: `/kategori/${slug}`,
    title: seo.title,
    description: seo.description,
    absoluteTitle: true,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [categories, products, tSeo, tNav] = await Promise.all([
    getAllCategories(),
    getAllProducts(),
    getTranslations("seo"),
    getTranslations("nav"),
  ]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const seo = getCategorySeo(category, locale);
  const filtered = products.filter((p) => p.category === slug);
  const ratings = await getReviewSummaries(filtered.map((p) => p.id));
  const base = localePath(locale);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: tSeo("breadcrumbHome"), url: canonicalUrl(locale) },
          { name: tNav("products"), url: canonicalUrl(locale, "/products") },
          { name: seo.h1, url: canonicalUrl(locale, `/kategori/${slug}`) },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: tSeo("breadcrumbHome"), href: base },
          { label: tNav("products"), href: `${base}/products` },
          { label: seo.h1 },
        ]}
      />
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="page-title">{seo.h1}</h1>
        <p className="page-subtitle">{seo.body}</p>
      </div>
      <ProductsGrid
        products={filtered}
        categories={categories}
        activeCategory={slug}
        ratings={ratings}
      />
    </div>
  );
}
