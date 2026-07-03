import { NextResponse } from "next/server";
import { getConfiguredProviders } from "@/lib/auth";

export async function GET() {
  const providers = getConfiguredProviders();
  return NextResponse.json({
    ready: providers.length > 0 && !!process.env.NEXTAUTH_SECRET,
    providers,
    hasSecret: !!process.env.NEXTAUTH_SECRET,
    hasGoogle: providers.includes("google"),
    hasApple: providers.includes("apple"),
  });
}
