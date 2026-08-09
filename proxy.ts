import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Kasir mendapat akses penuh ke semua fitur (1 toko = 1 akun).
// Hanya manajemen akun (menu Pengguna) yang khusus ADMIN.
const ADMIN_ONLY = ["/users"];

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
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
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};