import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  robots: NOINDEX_ROBOTS,
};

export default function FavoritesLayout({ children }: Props) {
  return children;
}
