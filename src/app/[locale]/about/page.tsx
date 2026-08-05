import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Check } from "lucide-react";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const values = [t("value1"), t("value2"), t("value3"), t("value4")];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 text-center sm:mb-12">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("subtitle")}</p>
      </div>
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
          <Image
            src="/products/product-2.png"
            alt="CimcimKids children clothing"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>
        <div className="prose-page space-y-4 text-olive/80">
          <p className="text-lg leading-relaxed">{t("p1")}</p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
        </div>
      </div>
      <div className="mt-16 card">
        <h2 className="mb-6 text-center text-2xl font-semibold">
          {t("values")}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {values.map((v) => (
            <li key={v} className="flex items-center gap-3 text-olive/80">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-leaf">
                <Check className="h-4 w-4" />
              </span>
              {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
