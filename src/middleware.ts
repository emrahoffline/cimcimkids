import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const LEGAL_ALIASES: Record<string, string> = {
  "/hakkimizda": "/tr/about",
  "/iletisim": "/tr/contact",
  "/gizlilik": "/tr/privacy",
  "/gizlilik-sozlesmesi": "/tr/privacy",
  "/gizlilik-politikasi": "/tr/privacy",
  "/mesafeli-satis": "/tr/distance-sales",
  "/mesafeli-satis-sozlesmesi": "/tr/distance-sales",
  "/teslimat": "/tr/returns",
  "/teslimat-ve-iade": "/tr/returns",
  "/teslimat-ve-iade-sartlari": "/tr/returns",
  "/iade": "/tr/returns",
  "/iptal-ve-iade": "/tr/returns",
};

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const alias = LEGAL_ALIASES[request.nextUrl.pathname.toLowerCase()];
  if (alias) {
    const url = request.nextUrl.clone();
    url.pathname = alias;
    return NextResponse.redirect(url, 308);
  }

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
