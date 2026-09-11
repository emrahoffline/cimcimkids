import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProductBySlug } from "@/lib/products-server";
import { getAllCategories, getCategoryLabel } from "@/lib/categories-server";
import { getProductName, getStorefrontProductDesc } from "@/lib/products";
import { getProductImages, getProductAges } from "@/lib/types";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductDetailActions } from "@/components/ProductDetailActions";
import { ProductPrice } from "@/components/ProductPrice";
import { ProductSpecs } from "@/components/ProductSpecs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { ProductRatingBadge } from "@/components/ProductRatingBadge";
import { ProductReviews } from "@/components/ProductReviews";
import {
  breadcrumbJsonLd,
  buildMetadata,
  canonicalUrl,
  localePath,
  productJsonLd,
  productMetaDescription,
} from "@/lib/seo";
import { getReviewSummary, listVisibleReviews } from "@/lib/reviews-db";
import { ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { robots: { index: false, follow: false } };
  }
  const name = getProductName(product, locale);
  const images = getProductImages(product);
  return buildMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: `${name} | Cimcim Kids`,
    description: productMetaDescription(product, locale),
    image: images[0],
    absoluteTitle: true,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const t = await getTranslations("products");
  const tSeo = await getTranslations("seo");
  const tNav = await getTranslations("nav");
  const tReviews = await getTranslations("reviews");
  const [categories, reviewSummary, reviews] = await Promise.all([
    getAllCategories(),
    getReviewSummary(product.id),
    listVisibleReviews(product.id),
  ]);
  const name = getProductName(product, locale);
  const desc = getStorefrontProductDesc(product, locale);
  const categoryLabel = getCategoryLabel(categories, product.category, locale);
  const images = getProductImages(product);
  const base = localePath(locale);
  const categoryHref = `${base}/kategori/${product.category}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:px-8 lg:pb-12">
      <JsonLd
        data={productJsonLd({
          product,
          locale,
          categoryLabel,
          rating: reviewSummary,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: tSeo("breadcrumbHome"), url: canonicalUrl(locale) },
          { name: tNav("products"), url: canonicalUrl(locale, "/products") },
          {
            name: categoryLabel,
            url: canonicalUrl(locale, `/kategori/${product.category}`),
          },
          {
            name,
            url: canonicalUrl(locale, `/products/${product.slug}`),
          },
        ])}
      />
      <Breadcrumbs
        items={[
          { label: tSeo("breadcrumbHome"), href: base },
          { label: tNav("products"), href: `${base}/products` },
          { label: categoryLabel, href: categoryHref },
          { label: name },
        ]}
      />
      <Link
        href={`${base}/products`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-bamboo"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={images} alt={name} />
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-bamboo">
            <Link href={categoryHref} className="hover:underline">
              {categoryLabel}
            </Link>
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800 sm:text-4xl">
            {name}
          </h1>
          <div className="mt-2">
            {reviewSummary.count > 0 ? (
              <a href="#yorumlar" className="inline-flex">
                <ProductRatingBadge summary={reviewSummary} />
              </a>
            ) : (
              <a href="#yorumlar" className="text-sm text-olive underline-offset-2 hover:underline">
                {tReviews("firstReview")}
              </a>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {t("productCode")}:{" "}
            <span className="font-mono text-slate-600">{product.code}</span>
          </p>
          {getProductAges(product).length > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {t("age")}:{" "}
              <span className="font-medium text-slate-700">
                {getProductAges(product).join(", ")}
              </span>
            </p>
          )}
          <ProductPrice product={product} />
          <p className="mt-2 text-sm font-medium text-olive">
            {product.inStock ? t("inStock") : t("outOfStock")}
          </p>
          <p className="mt-6 leading-relaxed text-slate-500">{desc}</p>
          <ProductSpecs
            product={product}
            locale={locale}
            title={t("details")}
          />
          <ProductDetailActions product={product} name={name} />
        </div>
      </div>
      <ProductReviews
        productId={product.id}
        initialSummary={reviewSummary}
        initialReviews={reviews}
      />
    </div>
  );
}
