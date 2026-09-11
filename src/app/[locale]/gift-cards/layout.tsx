import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const tPage = await getTranslations({ locale, namespace: "giftCards" });
  return buildMetadata({
    locale,
    path: "/gift-cards",
    title: `${tPage("title")} | Cimcim Kids`,
    description: t("giftCardsMetaDescription"),
    absoluteTitle: true,
  });
}

export default function GiftCardsLayout({ children }: Props) {
  return children;
}
