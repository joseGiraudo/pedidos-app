import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";

// Límite de intentos para /p/* por IP (best-effort en memoria; ver src/lib/rate-limit.ts).
const PUBLIC_LIMIT = 60;
const PUBLIC_WINDOW_MS = 60_000;

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Convención `proxy` de Next 16. Dos responsabilidades según la ruta:
// - /panel: chequeo optimista de la cookie de sesión (sin tocar la base, apto para edge);
//   la validación real contra la base la hace la página con auth.api.getSession.
// - /p/*: acceso público por token (sin sesión), con límite de intentos por IP para
//   encarecer la fuerza bruta de tokens.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/p/")) {
    const { allowed, retryAfterMs } = checkRateLimit(
      `p:${clientIp(request)}`,
      PUBLIC_LIMIT,
      PUBLIC_WINDOW_MS,
    );
    if (!allowed) {
      return new NextResponse("Demasiados intentos. Esperá un momento y volvé a probar.", {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      });
    }
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel", "/panel/:path*", "/p/:path*"],
};
