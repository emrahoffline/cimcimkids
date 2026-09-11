import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllProducts } from "@/lib/products-server";
import { getAllCategories } from "@/lib/categories-server";
import { ProductsGrid } from "@/components/ProductsGrid";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({
    locale,
    path: "/products",
    title: t("productsMetaTitle"),
    description: t("productsMetaDescription"),
    absoluteTitle: true,
  });
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const query = await searchParams;
  const raw = query.category;
  const categorySlug = Array.isArray(raw) ? raw[0] : raw;
  if (categorySlug?.trim()) {
    permanentRedirect(`/${locale}/kategori/${categorySlug.trim()}`);
  }

  setRequestLocale(locale);
  const t = await getTranslations("products");
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      <ProductsGrid
        products={products}
        categories={categories}
        activeCategory="all"
      />
    </div>
  );
}
