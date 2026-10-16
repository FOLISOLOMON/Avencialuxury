
function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    // If Origin is omitted (e.g. some same-origin non-browser clients or test runners),
    // check Referer as secondary verification
    const referer = request.headers.get("referer");
    if (!referer) return true; // Safe fallback when neither is sent by client
    try {
      const refererHost = new URL(referer).host;
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      return !host || refererHost === host;
    } catch {
      return false;
    }
  }

  try {
    const originUrl = new URL(origin);
    const hostHeader = request.headers.get("x-forwarded-host") || request.headers.get("host");
    if (hostHeader) {
      const hostWithoutPort = hostHeader.split(":")[0];
      if (originUrl.hostname === hostWithoutPort) return true;
    }

    // Configured production application URLs
    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
    if (appUrl) {
      try {
        const expectedHost = new URL(appUrl).hostname;
        if (originUrl.hostname === expectedHost) return true;
      } catch {}
    }

    // Development localhost allowance
    if (process.env.NODE_ENV !== "production") {
      if (originUrl.hostname === "localhost" || originUrl.hostname === "127.0.0.1") {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/token";

// Paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/setup",
  "/forgot-password",
  "/manifest.json",
  "/favicon.ico",
  "/sw.js",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF Defense: For state-changing methods on API routes, verify Origin/Referer
  const stateChangingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (stateChangingMethods.includes(request.method) && pathname.startsWith("/api/")) {
    // Machine-to-machine cron endpoint has its own Bearer token authentication
    if (pathname !== "/api/automation/cron") {
      if (!isOriginAllowed(request)) {
        return NextResponse.json(
          { error: "Forbidden: Cross-site request rejected (Origin mismatch)" },
          { status: 403 }
        );
      }
    }
  }

  // 1. Allow static assets, Next.js internal files, logos
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/logo/") ||
    pathname.startsWith("/icons/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Allow public auth APIs & automation cron
  if (
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/team/accept-invite" ||
    pathname === "/api/automation/cron"
  ) {
    return NextResponse.next();
  }

  // 3. Allow public pages
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/reset-password/")
  ) {
    // If user is already authenticated, redirect them away from login/setup
    const token = request.cookies.get("avencia_session")?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload) {
        if (pathname === "/login" || pathname === "/setup") {
          const returnUrl = request.nextUrl.searchParams.get("returnUrl");
          let destination = payload.role === "WORKER" ? "/mobile" : "/";
          if (
            returnUrl &&
            !returnUrl.startsWith("/api") &&
            returnUrl !== "/login" &&
            !returnUrl.startsWith("/login?")
          ) {
            if (payload.role !== "WORKER" || returnUrl.startsWith("/mobile")) {
              destination = returnUrl;
            }
          }
          return NextResponse.redirect(new URL(destination, request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // 4. Check for active session cookie
  const token = request.cookies.get("avencia_session")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized: Please sign in." },
        { status: 401 }
      );
    }
    const isMobile = pathname.startsWith("/mobile");
    const loginUrl = new URL("/login", request.url);
    if (isMobile) {
      loginUrl.searchParams.set("mobile", "true");
    }
    if (pathname !== "/" && pathname !== "/login") {
      loginUrl.searchParams.set("returnUrl", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. Verify token payload
  const payload = await verifySessionToken(token);
  if (!payload) {
    // Invalid or expired token -> clear cookie and redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Session expired or invalid: Please sign in again." },
        { status: 401 }
      );
    }
    const isMobile = pathname.startsWith("/mobile");
    const loginUrl = new URL("/login", request.url);
    if (isMobile) {
      loginUrl.searchParams.set("mobile", "true");
    }
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("avencia_session");
    return response;
  }

  // 6. Role-based routing restrictions
  // Workers are restricted to the mobile application only
  if (payload.role === "WORKER") {
    // If worker tries to access root desktop dashboard or (op) routes
    if (!pathname.startsWith("/mobile") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/mobile", request.url));
    }
  }

  // Inject user info into headers for downstream consumption
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-session-id", payload.sessionId);
  requestHeaders.set("x-business-id", payload.businessId);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
