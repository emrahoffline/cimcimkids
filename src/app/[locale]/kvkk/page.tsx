import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";
import { buildMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kvkk" });
  return buildMetadata({
    locale,
    path: "/kvkk",
    title: `${t("title")} | Cimcim Kids`,
    description: t("intro"),
    absoluteTitle: true,
  });
}

export default async function KVKKPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("kvkk");

  return (
    <LegalPage
      title={t("title")}
      updated={t("updated")}
      intro={t("intro")}
      sections={[
        { title: t("s1title"), text: t("s1") },
        { title: t("s2title"), text: t("s2") },
        { title: t("s3title"), text: t("s3") },
        { title: t("s4title"), text: t("s4") },
        { title: t("s5title"), text: t("s5") },
        { title: t("s6title"), text: t("s6") },
        { title: t("s7title"), text: t("s7") },
        { title: t("s8title"), text: t("s8") },
      ]}
    />
  );
}
