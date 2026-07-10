import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/auth/sign-in", "/auth/sign-up"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.nextUrl));
  }
  if (req.auth && PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
