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
};
