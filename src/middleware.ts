import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_ROUTES, PROTECTED_ROUTES, ROUTES } from "@/constants/routes";

const PUBLIC_PATHS = [...AUTH_ROUTES, "/"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("compass-access-token")?.value;

  if (pathname === ROUTES.HOME) {
    const destination = accessToken ? ROUTES.CONTACTS : ROUTES.LOGIN;
    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (isProtectedPath(pathname) && !accessToken) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && accessToken) {
    return NextResponse.redirect(new URL(ROUTES.CONTACTS, request.url));
  }

  if (!PUBLIC_PATHS.includes(pathname as (typeof PUBLIC_PATHS)[number]) && !isProtectedPath(pathname) && !isAuthPath(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
