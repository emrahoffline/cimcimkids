import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { isNoIndexPath } from "./lib/robots-policy";

const intlMiddleware = createMiddleware(routing);

function applyRobotsTag(response: NextResponse, pathname: string) {
  if (isNoIndexPath(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return applyRobotsTag(NextResponse.redirect(url, 308), url.pathname);
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth")
  ) {
    return applyRobotsTag(NextResponse.next(), pathname);
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
      return applyRobotsTag(redirect, pathname);
    }
  }

  return applyRobotsTag(response, pathname);
}

export const config = {
  matcher: [
    "/",
    "/(tr|en)/:path*",
    "/admin/:path*",
    "/((?!api|_next|.*\\..*).*)",
  ],
};
