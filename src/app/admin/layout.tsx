import type { Viewport } from "next";
import { Providers } from "@/components/Providers";
import "@/app/globals.css";
import "./admin.css";

export const metadata = {
  title: "CimcimKids Admin",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
