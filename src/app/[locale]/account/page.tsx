import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { noIndexMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return noIndexMetadata(
    locale,
    "/account",
    "Cimcim Kids",
    "Cimcim Kids"
  );
}

/** Customer membership removed — send old /account links home. */
export default async function AccountRedirectPage({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(`/${locale}`);
}
