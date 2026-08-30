import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Sign-in/sign-up bounce an already-authenticated user back to "/" — terms/privacy stay
// visible either way, since they're referenced from the sign-up form and useful post-login too.
const AUTH_FORM_PATHS = ["/auth/sign-in", "/auth/sign-up", "/auth/coach-sign-up"];
const PUBLIC_PATHS = [...AUTH_FORM_PATHS, "/terms", "/privacy"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/register", "/api/coach/register"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.nextUrl));
  }
  if (req.auth && AUTH_FORM_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
