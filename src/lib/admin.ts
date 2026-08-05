export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  const fromEnv = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const defaults = ["emrhgtr@gmail.com", "info@cimcimkids.com"];
  const allowlist = fromEnv.length > 0 ? fromEnv : defaults;

  return allowlist.includes(normalized);
}

export type UserRole = "admin" | "customer";
