import { Providers } from "@/components/Providers";
import "./admin.css";

export const metadata = {
  title: "AryaBamboo Admin",
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
