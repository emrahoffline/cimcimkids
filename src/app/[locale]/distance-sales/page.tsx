import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { SellerLegalInfo } from "@/components/SellerLegalInfo";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "distanceSales" });
  return buildMetadata({
    locale,
    path: "/distance-sales",
    title: `${t("title")} | Cimcim Kids`,
    description: t("s1"),
    absoluteTitle: true,
  });
}

export default async function DistanceSalesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("distanceSales");

  return (
    <LegalPage
      title={t("title")}
      updated={t("updated")}
      lead={
        <>
          <p className="font-semibold text-olive">{t("sellerTitle")}</p>
          <SellerLegalInfo showNationalId className="space-y-1" />
        </>
      }
      sections={[
        { text: t("s1") },
        { text: t("s2") },
        { text: t("s3") },
      ]}
    />
  );
}
