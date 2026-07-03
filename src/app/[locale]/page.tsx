import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllProducts } from "@/lib/products-server";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, Leaf, HandHeart } from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const base = `/${locale}`;
  const products = await getAllProducts();

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-8 pb-10 sm:px-6 sm:pt-12 sm:pb-16 lg:px-8">
        <div className="mb-6 text-center sm:mb-10">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("featured")}</h1>
          <p className="mt-2 text-sm text-olive/60 sm:text-base">
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

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          <div className="card flex flex-col items-start gap-4">
            <div className="rounded-full bg-leaf/10 p-3 text-leaf">
              <HandHeart className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">{t("craftTitle")}</h2>
            <p className="text-olive/70">{t("craftDesc")}</p>
          </div>
          <div className="card flex flex-col items-start gap-4">
            <div className="rounded-full bg-leaf/10 p-3 text-leaf">
              <Leaf className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold">{t("sustainTitle")}</h2>
            <p className="text-olive/70">{t("sustainDesc")}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-semibold">{t("newsletter")}</h2>
        <p className="mt-2 text-olive/60">{t("newsletterDesc")}</p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <input
            type="email"
            placeholder={t("emailPlaceholder")}
            className="input-field sm:max-w-xs"
          />
          <button type="button" className="btn-primary shrink-0">
            {t("subscribe")}
          </button>
        </form>
      </section>
    </>
  );
}
