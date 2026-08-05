import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CimcimKids",
  description: "Comfortable, stylish kids clothing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
