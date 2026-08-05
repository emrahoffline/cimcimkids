export const STORE_CONFIG = {
  iban: process.env.NEXT_PUBLIC_IBAN ?? "TR590006701000000208433897",
  accountHolder:
    process.env.NEXT_PUBLIC_ACCOUNT_HOLDER ?? "CimcimKids",
  bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "Yapı Kredi",
} as const;

export function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
