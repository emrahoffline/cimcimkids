import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auth Error | Cimcim Kids",
  robots: { index: false, follow: false },
};

export default function AuthErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
