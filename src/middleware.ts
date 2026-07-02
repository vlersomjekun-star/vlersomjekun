import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { verifySessionToken, ADMIN_COOKIE } from "./lib/admin-session";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin: jashtë i18n routing, i mbrojtur me sesion
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") return NextResponse.next();
    const email = await verifySessionToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!email) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // /api: pa locale routing
  if (pathname.startsWith("/api")) return NextResponse.next();

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)"],
};
