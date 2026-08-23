export const OUTFIT_SLOT_IDS = [
  "hat",
  "glasses",
  "top",
  "bottom",
  "socks",
  "shoes",
  "belt",
  "tie",
] as const;

export type OutfitSlotId = (typeof OUTFIT_SLOT_IDS)[number];

export type OutfitSlotItem = {
  source: "product" | "custom";
  productId?: string;
  nameTr: string;
  nameEn: string;
  image: string;
  price: number;
};

export type OutfitSlots = Partial<Record<OutfitSlotId, OutfitSlotItem>>;

export const OUTFIT_SLOT_META: Record<
  OutfitSlotId,
  { labelTr: string; labelEn: string }
> = {
  hat: { labelTr: "Şapka", labelEn: "Hat" },
  glasses: { labelTr: "Gözlük", labelEn: "Glasses" },
  top: { labelTr: "Üst", labelEn: "Top" },
  bottom: { labelTr: "Alt", labelEn: "Bottom" },
  socks: { labelTr: "Çorap", labelEn: "Socks" },
  shoes: { labelTr: "Ayakkabı", labelEn: "Shoes" },
  belt: { labelTr: "Kemer", labelEn: "Belt" },
  tie: { labelTr: "Kravat", labelEn: "Tie" },
};

export function isOutfitSlotId(value: string): value is OutfitSlotId {
  return (OUTFIT_SLOT_IDS as readonly string[]).includes(value);
}

export function parseOutfitSlots(raw: unknown): OutfitSlots {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const slots: OutfitSlots = {};

  for (const id of OUTFIT_SLOT_IDS) {
    const row = input[id];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const item = row as Record<string, unknown>;
    const nameTr = String(item.nameTr ?? "").trim();
    const nameEn = String(item.nameEn ?? "").trim() || nameTr;
    const image = String(item.image ?? "").trim();
    const price = Number(item.price);
    if (!nameTr || !Number.isFinite(price) || price < 0) continue;
    const source = item.source === "product" ? "product" : "custom";
    const productId =
      source === "product" && typeof item.productId === "string"
        ? item.productId.trim()
        : undefined;
    slots[id] = {
      source,
      ...(productId ? { productId } : {}),
      nameTr,
      nameEn,
      image,
      price,
    };
  }

  return slots;
}

export function filledOutfitSlots(slots: OutfitSlots): OutfitSlotItem[] {
  return OUTFIT_SLOT_IDS.map((id) => slots[id]).filter(
    (item): item is OutfitSlotItem => Boolean(item)
  );
}

export function outfitPartsTotal(slots: OutfitSlots): number {
  return filledOutfitSlots(slots).reduce((sum, item) => sum + item.price, 0);
}

export function outfitCoverImage(slots: OutfitSlots, fallback = ""): string {
  const first = filledOutfitSlots(slots).find((item) => item.image);
  return first?.image || fallback;
}

export function isOutfitProduct(product: { kind?: string | null }): boolean {
  return product.kind === "outfit";
}

export function resolveOutfitPricing(
  slots: OutfitSlots,
  customPrice?: number | null
): { partsTotal: number; price: number; compareAtPrice: number | null } {
  const partsTotal = outfitPartsTotal(slots);
  const useCustom =
    typeof customPrice === "number" &&
    Number.isFinite(customPrice) &&
    customPrice >= 0;
  const price = useCustom ? customPrice : partsTotal;
  // Store the parts total whenever a custom outfit price is set so the
  // editor can restore that choice. Storefront only strikes through when
  // compareAtPrice is higher than the selling price.
  const compareAtPrice = useCustom ? partsTotal : null;
  return { partsTotal, price, compareAtPrice };
}

export function outfitPieceRows(slots: OutfitSlots | undefined) {
  if (!slots) return [];
  return OUTFIT_SLOT_IDS.flatMap((id) => {
    const item = slots[id];
    if (!item) return [];
    return [{ id, item, meta: OUTFIT_SLOT_META[id] }];
  });
}

export function hydrateOutfitSlots(
  raw: unknown,
  catalog: Array<{
    id: string;
    kind?: string;
    nameTr: string;
    nameEn: string;
    image: string;
    price: number;
  }>
): OutfitSlots {
  const parsed = parseOutfitSlots(raw);
  const slots: OutfitSlots = {};
  for (const id of OUTFIT_SLOT_IDS) {
    const slot = parsed[id];
    if (!slot) continue;
    if (slot.source === "product" && slot.productId) {
      const source = catalog.find(
        (p) => p.id === slot.productId && p.kind !== "outfit"
      );
      if (source) {
        slots[id] = {
          source: "product",
          productId: source.id,
          nameTr: source.nameTr,
          nameEn: source.nameEn,
          image: source.image,
          price: source.price,
        };
        continue;
      }
    }
    slots[id] = slot;
  }
  return slots;
}
