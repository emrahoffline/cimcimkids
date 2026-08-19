import type { Metadata } from "next";
import { noIndexMetadata } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "favorites" });
  return noIndexMetadata(
    locale,
    "/favorites",
    `${t("title")} | Cimcim Kids`,
    t("title")
  );
}

export default function FavoritesLayout({ children }: Props) {
  return children;
}
