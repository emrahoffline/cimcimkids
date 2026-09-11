import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import "@/app/globals.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "CimcimKids Admin",
  applicationName: "CimcimKids Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CimcimKids Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#556B2F",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="admin-body antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
