import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  METHODIST: "/teacher",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Without this, getToken() defaults to secureCookie: false and looks for the
  // unprefixed "authjs.session-token" cookie — but in production (behind Nginx,
  // always HTTPS) Auth.js actually sets "__Secure-authjs.session-token", so the
  // lookup silently misses and every request looks unauthenticated.
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const role = token?.role as string | undefined;

  const isLoginRoute = pathname === "/login";
  const isProtectedRoute =
    pathname.startsWith("/admin") || pathname.startsWith("/teacher") || pathname.startsWith("/student");

  if (!role) {
    if (isProtectedRoute) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (isLoginRoute) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", request.url));
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", request.url));
  }

  if (pathname.startsWith("/teacher") && !["ADMIN", "METHODIST", "TEACHER"].includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", request.url));
  }

  if (pathname.startsWith("/student") && role !== "STUDENT") {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/login"],
};
