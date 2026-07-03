import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/LegalPage";

export default async function DistanceSalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("distanceSales");

  return (
    <LegalPage
      title={t("title")}
      updated={t("updated")}
      sections={[
        { text: t("s1") },
        { text: t("s2") },
        { text: t("s3") },
      ]}
    />
  );
}
