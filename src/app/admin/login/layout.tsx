import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CimcimKids Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
