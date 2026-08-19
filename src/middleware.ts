import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // next-intl uses 307; Google consolidates ranking signals on 308/301.
  if (response.status === 307 || response.status === 302) {
    const location = response.headers.get("location");
    if (location) {
      const redirect = NextResponse.redirect(
        new URL(location, request.url),
        308
      );
      const cookie = response.headers.get("set-cookie");
      if (cookie) redirect.headers.set("set-cookie", cookie);
      return redirect;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/(tr|en)/:path*",
    "/admin/:path*",
    "/((?!api|_next|.*\\..*).*)",
  ],
};
