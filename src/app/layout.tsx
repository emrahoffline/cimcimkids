import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AryaBamboo",
  description: "Handmade bamboo products",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
