import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Cimcim Kids — çocuk ve bebek giyim. Bebek, kız ve erkek koleksiyonları.",
  applicationName: SITE_NAME,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
