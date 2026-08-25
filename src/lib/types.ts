import type { OutfitSlots } from "./outfit";

export type Category = {
  slug: string;
  nameTr: string;
  nameEn: string;
};

export type Product = {
  id: string;
  slug: string;
  image: string;
  video?: string | null;
  price: number;
  category: string;
  translationKey?: string;
  nameTr: string;
  nameEn: string;
  descTr: string;
  descEn: string;
  inStock: boolean;
  kind?: "product" | "outfit";
  outfitSlots?: OutfitSlots;
  compareAtPrice?: number | null;
  ages?: string[];
  ageRange?: string;
  createdAt?: string;
  updatedAt?: string;
  soldCount?: number;
  favoriteCount?: number;
};

export type Story = {
  id: string;
  title: string;
  mediaUrl: string;
  mediaKind: "image" | "video";
  durationSec: number;
  sortOrder: number;
  viewCount: number;
  groupId: string;
  linkUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
