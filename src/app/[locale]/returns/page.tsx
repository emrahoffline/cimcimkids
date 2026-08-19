import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returns" });
  return buildMetadata({
    locale,
    path: "/returns",
    title: `${t("title")} | Cimcim Kids`,
    description: t("subtitle"),
    absoluteTitle: true,
  });
}

export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returns");

  return (
    <LegalPage
      title={t("title")}
      intro={t("subtitle")}
      sections={[
        { title: t("s1title"), text: t("s1") },
        { title: t("s2title"), text: t("s2") },
        { title: t("s3title"), text: t("s3") },
        { title: t("s4title"), text: t("s4") },
      ]}
    />
  );
}
