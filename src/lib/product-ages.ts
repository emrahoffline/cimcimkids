/** Common age ranges for kids clothing (shown as-is in TR/EN UI). */
export const PRODUCT_AGE_OPTIONS = [
  "0-3 ay",
  "3-6 ay",
  "6-9 ay",
  "9-12 ay",
  "12-18 ay",
  "18-24 ay",
  "2-3 yaş",
  "3-4 yaş",
  "4-5 yaş",
  "5-6 yaş",
  "6-7 yaş",
  "7-8 yaş",
  "8-9 yaş",
  "9-10 yaş",
  "10-11 yaş",
  "11-12 yaş",
  "10-12 yaş",
  "12-13 yaş",
  "13-14 yaş",
  "14-15 yaş",
  "15-16 yaş",
] as const;

export type ProductAgeOption = (typeof PRODUCT_AGE_OPTIONS)[number];

const OPTION_INDEX = new Map(
  PRODUCT_AGE_OPTIONS.map((age, index) => [age, index])
);

function foldAge(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/\s+/g, " ");
}

/** Map stored short labels ("3-4") back to the admin/storefront option ("3-4 yaş"). */
export function canonicalizeAge(raw: string): string | null {
  const age = raw.trim().slice(0, 40);
  if (!age) return null;

  const folded = foldAge(age);
  const exact = PRODUCT_AGE_OPTIONS.find((opt) => foldAge(opt) === folded);
  if (exact) return exact;

  const stripped = folded.replace(/\s*(yas|ay)$/i, "").trim();
  if (!stripped) return age;

  const withYas = PRODUCT_AGE_OPTIONS.find(
    (opt) => foldAge(opt) === `${stripped} yas`
  );
  if (withYas) return withYas;

  const withAy = PRODUCT_AGE_OPTIONS.find(
    (opt) => foldAge(opt) === `${stripped} ay`
  );
  if (withAy) return withAy;

  if (/^\d+\s*-\s*\d+$/.test(stripped)) {
    const compact = stripped.replace(/\s/g, "");
    return `${compact} yaş`;
  }

  return age;
}

export function agesMatch(a: string, b: string): boolean {
  const left = canonicalizeAge(a);
  const right = canonicalizeAge(b);
  return Boolean(left && right && left === right);
}

export function normalizeProductAges(
  ages: unknown,
  fallbackAgeRange?: unknown
): string[] {
  const list: string[] = [];

  const push = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const age = canonicalizeAge(raw);
    if (!age || list.includes(age)) return;
    list.push(age);
  };

  if (Array.isArray(ages)) {
    for (const item of ages) push(item);
  }

  if (list.length === 0) push(fallbackAgeRange);

  list.sort((a, b) => {
    const ia = OPTION_INDEX.get(a as ProductAgeOption);
    const ib = OPTION_INDEX.get(b as ProductAgeOption);
    if (ia == null && ib == null) return a.localeCompare(b, "tr");
    if (ia == null) return 1;
    if (ib == null) return -1;
    return ia - ib;
  });

  return list.slice(0, 20);
}
