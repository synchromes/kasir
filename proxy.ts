import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";

// Kasir mendapat akses penuh ke semua fitur (1 toko = 1 akun).
// Hanya manajemen akun (menu Pengguna) yang khusus ADMIN.
const ADMIN_ONLY = ["/users"];

type AuthRequest = NextRequest & { auth: { user?: { role?: string } } | null };
const checkAccess: (req: AuthRequest, event: NextFetchEvent) => ReturnType<NextMiddleware> = (req) => {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login";
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !isAuthPage) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const role = req.auth?.user?.role;
  if (role !== "ADMIN" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
};
const guard = auth(checkAccess);

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  const response = await guard(req, event);
  // Proxy hanya memeriksa sesi. Refresh cookie dari request paralel dapat
  // tiba setelah logout dan menghidupkan sesi lagi; masa sesi mengikuti login.
  if (response) {
    const cookies = response.headers.getSetCookie();
    response.headers.delete("set-cookie");
    for (const cookie of cookies) {
      const sessionCookie = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=/.test(cookie);
      if (!sessionCookie || /max-age=0(?:;|$)/i.test(cookie)) response.headers.append("set-cookie", cookie);
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
