import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Nunito, Outfit } from "next/font/google";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/Providers";
import { MobileShell } from "@/components/MobileShell";
import type { Viewport } from "next";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#fffaf5",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "tr" | "en")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${nunito.variable} ${outfit.variable}`}>
      <body className="flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <MobileShell>{children}</MobileShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
