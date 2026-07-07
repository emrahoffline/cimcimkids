export const ADMIN_EMAILS = [
  "emrhgtr@gmail.com",
  "efruzebendes90@gmail.com",
  "info@aryabamboo.com",
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(
    email.toLowerCase().trim() as (typeof ADMIN_EMAILS)[number]
  );
}

export type UserRole = "admin" | "customer";
