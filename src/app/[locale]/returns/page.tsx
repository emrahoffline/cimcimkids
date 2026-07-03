import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";

export default async function ReturnsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
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
