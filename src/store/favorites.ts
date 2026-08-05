import { create } from "zustand";
import { persist } from "zustand/middleware";
export type FavoriteItem = {
  id: string;
  slug: string;
  image: string;
  price: number;
  translationKey: string;
};

type FavoritesState = {
  items: FavoriteItem[];
  toggle: (item: FavoriteItem) => void;
  remove: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some((i) => i.id === item.id);
        if (exists) {
          set({ items: get().items.filter((i) => i.id !== item.id) });
        } else {
          set({ items: [...get().items, item] });
        }
      },
      remove: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),
      isFavorite: (id) => get().items.some((i) => i.id === id),
    }),
    { name: "cimcimkids-favorites" }
  )
);
