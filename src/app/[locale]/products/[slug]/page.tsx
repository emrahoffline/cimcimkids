import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getProductBySlug } from "@/lib/products-server";
import { getAllCategories, getCategoryLabel } from "@/lib/categories-server";
import {
  formatPrice,
  getProductName,
  getProductDesc,
} from "@/lib/products";
import { ProductDetailActions } from "@/components/ProductDetailActions";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, productJsonLd, productMetaDescription } from "@/lib/seo";
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
  return buildMetadata({
    locale,
    path: `/products/${product.slug}`,
    title: `${name} | Cimcim Kids`,
    description: productMetaDescription(product, locale),
    image: product.image,
    absoluteTitle: true,
  });
}

export default async function ProductDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const t = await getTranslations("products");
  const categories = await getAllCategories();
  const name = getProductName(product, locale);
  const desc = getProductDesc(product, locale);
  const categoryLabel = getCategoryLabel(categories, product.category, locale);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 sm:px-6 sm:py-12 lg:px-8 lg:pb-12">
      <JsonLd
        data={productJsonLd({ product, locale, categoryLabel })}
      />
      <Link
        href={`/${locale}/products`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-bamboo"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-cream-dark">
          <Image
            src={product.image}
            alt={name}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-bamboo">
            {categoryLabel}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800 sm:text-4xl">{name}</h1>
          <p className="mt-4 text-2xl font-semibold text-bamboo">
            {formatPrice(product.price, locale)}
          </p>
          <p className="mt-2 text-sm font-medium text-olive">
            {product.inStock ? t("inStock") : t("outOfStock")}
          </p>
          <p className="mt-6 leading-relaxed text-slate-500">{desc}</p>
          <ProductDetailActions product={product} name={name} />
        </div>
      </div>
    </div>
  );
}
