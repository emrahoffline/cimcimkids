export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function telHref(phone: string): string {
  const digits = digitsOnly(phone);
  if (!digits) return "";
  if (digits.startsWith("90")) return `tel:+${digits}`;
  if (digits.startsWith("0") && digits.length >= 10) {
    return `tel:+90${digits.slice(1)}`;
  }
  if (digits.length === 10) return `tel:+90${digits}`;
  return `tel:+${digits}`;
}

export function whatsappHref(phone: string): string {
  const digits = digitsOnly(phone);
  if (!digits) return "";
  let intl = digits;
  if (intl.startsWith("0") && intl.length >= 10) intl = `90${intl.slice(1)}`;
  else if (intl.length === 10) intl = `90${intl}`;
  else if (!intl.startsWith("90") && intl.startsWith("5") && intl.length === 10) {
    intl = `90${intl}`;
  }
  return `https://wa.me/${intl}`;
}

export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function adminCustomerPath(email: string): string {
  return `/admin/customers/${encodeURIComponent(email.trim().toLowerCase())}`;
}
