import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { isAdminEmail } from "./admin";

export async function requireAdminApi() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!session || !isAdminEmail(email)) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  return { error: null, session };
}
