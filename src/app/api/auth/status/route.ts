import { NextResponse } from "next/server";
import { getConfiguredProviders } from "@/lib/auth";

export async function GET() {
  const providers = getConfiguredProviders();
  return NextResponse.json({
    ready: providers.includes("google") || providers.includes("credentials"),
    hasGoogle: providers.includes("google"),
  });
}
