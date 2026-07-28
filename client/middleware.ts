import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight gate: redirects to /login if the "token" cookie set by
// POST /api/auth/login isn't present. The dashboard page itself still
// verifies the session (and role) against GET /api/auth/me — this just
// avoids flashing protected content before that check runs.
export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    const loginUrl = new URL("/register", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
