import provinces from "@/data/turkey-provinces.json";

export const TURKEY_COUNTRY = "Türkiye";

const byProvince = provinces as Record<string, string[]>;

export function listProvinces(): string[] {
  return Object.keys(byProvince);
}

export function listDistricts(province: string): string[] {
  return byProvince[province] ?? [];
}

export function isValidProvince(province: string): boolean {
  return Object.prototype.hasOwnProperty.call(byProvince, province);
}

export function isValidDistrict(province: string, district: string): boolean {
  return listDistricts(province).includes(district);
}
