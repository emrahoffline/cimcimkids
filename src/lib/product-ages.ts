/** Age ranges shown in the admin product form (same labels in TR/EN). */
export const PRODUCT_AGE_OPTIONS = [
  "0-3 ay",
  "3-6 ay",
  "6-9 ay",
  "9-12 ay",
  "12-18 ay",
  "18-24 ay",
  "2-3",
  "3-4",
  "4-5",
  "5-6",
  "6-7",
  "7-8",
  "8-9",
  "9-10",
  "10-11",
  "11-12",
  "12-13",
  "13-14",
  "14-15",
  "15-16",
] as const;

export type ProductAgeOption = (typeof PRODUCT_AGE_OPTIONS)[number];

const ALLOWED_AGES = new Set<string>(PRODUCT_AGE_OPTIONS);

/** Map legacy labels such as "2-3 yaş" onto "2-3". */
export function canonicalizeProductAge(value: string): string {
  const trimmed = value.trim();
  const yearRange = trimmed.match(/^(\d{1,2})\s*-\s*(\d{1,2})(?:\s*ya[sş])?$/i);
  if (yearRange) {
    return `${yearRange[1]}-${yearRange[2]}`;
  }
  return trimmed;
}

const OUTFIT_PLACEHOLDER_AGES = new Set(["2-10", "2-10 yaş"]);
const AGES_2_TO_10 = [
  "2-3",
  "3-4",
  "4-5",
  "5-6",
  "6-7",
  "7-8",
  "8-9",
  "9-10",
];

export function normalizeProductAges(
  ages: unknown,
  fallbackAgeRange?: unknown
): string[] {
  const list: string[] = [];

  if (Array.isArray(ages)) {
    for (const item of ages) {
      if (typeof item !== "string") continue;
      const age = canonicalizeProductAge(item).slice(0, 40);
      if (!age || list.includes(age)) continue;
      if (ALLOWED_AGES.has(age) || age.length > 0) list.push(age);
    }
  }

  if (
    list.length === 0 &&
    typeof fallbackAgeRange === "string" &&
    fallbackAgeRange.trim()
  ) {
    const fallback = canonicalizeProductAge(fallbackAgeRange).slice(0, 40);
    if (fallback) list.push(fallback);
  }

  return expandPlaceholderAges(list).slice(0, 20);
}

function expandPlaceholderAges(list: string[]): string[] {
  if (list.length === 1 && OUTFIT_PLACEHOLDER_AGES.has(list[0])) {
    return [...AGES_2_TO_10];
  }
  return list.filter((age) => !OUTFIT_PLACEHOLDER_AGES.has(age));
}

/** Drop the old kombin placeholder so the shopper sees real year chips. */
export function selectableProductAges(
  ages: unknown,
  fallbackAgeRange?: unknown
): string[] {
  return normalizeProductAges(ages, fallbackAgeRange);
}
