import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

function isPrivatePath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next")
  );
}

export default function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/auth")
  ) {
    return NextResponse.next();
  }

  // `/` used to 308 to /tr with an empty body. Google Analytics tag detection
  // fetches https://www.cimcimkids.com/ and misses the snippet. Rewrite so the
  // homepage HTML (and gtag) is served at the stream URL. Canonical stays /tr.
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}`;
    const rewrite = NextResponse.rewrite(url);
    rewrite.headers.set(
      "Cache-Control",
      "public, max-age=0, must-revalidate"
    );
    return rewrite;
  }

  const response = intlMiddleware(request);

  // Public HTML is force-dynamic, so Next sends `private, no-store`. Google
  // then leaves those URLs at "Discovered — currently not indexed". max-age=0
  // still avoids a shared CDN cache of personalized shells.
  if (!isPrivatePath(request.nextUrl.pathname)) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, must-revalidate"
    );
  }

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
