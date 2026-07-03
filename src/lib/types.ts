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
};
