import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { isAdminEmail } from "./admin";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAdmin() {
  const session = await getSession();
  const email = session?.user?.email;
  if (!session || !isAdminEmail(email)) {
    return null;
  }
  return session;
}
