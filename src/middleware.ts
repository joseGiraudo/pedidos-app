import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Protección de /panel. Chequeo optimista de la cookie de sesión (sin tocar la base,
// apto para el runtime edge); la validación real contra la base la hace la página con
// auth.api.getSession. Si no hay cookie, al login.
export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel", "/panel/:path*"],
};
