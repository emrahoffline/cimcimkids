export const STORE_CONFIG = {
  iban: process.env.NEXT_PUBLIC_IBAN ?? "TR590006701000000208433897",
  accountHolder:
    process.env.NEXT_PUBLIC_ACCOUNT_HOLDER ?? "Nuriye Kostak",
  bankName: process.env.NEXT_PUBLIC_BANK_NAME ?? "Yapı Kredi",
  legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "Nuriye Kostak",
  taxOffice: process.env.NEXT_PUBLIC_TAX_OFFICE ?? "Didim",
  taxNumber: process.env.NEXT_PUBLIC_TAX_NUMBER ?? "1630080944",
  nationalId: process.env.NEXT_PUBLIC_NATIONAL_ID ?? "28144999264",
  legalPhone: process.env.NEXT_PUBLIC_LEGAL_PHONE ?? "05413588457",
  legalEmail:
    process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? "efruzebendes@hotmail.com",
  legalAddress:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS ??
    "Akbük Mah. 5932 Cad. Rüyamkent Sitesi No: 7/4 Didim / Aydın",
} as const;

export function formatIban(iban: string) {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export function formatTrPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("90")) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone;
}

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `tel:+90${digits.slice(1)}`;
  }
  if (digits.startsWith("90")) return `tel:+${digits}`;
  return `tel:${phone}`;
}
