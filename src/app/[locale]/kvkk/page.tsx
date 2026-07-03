import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";

export default async function KVKKPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
