import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { buildContentSecurityPolicy } from "@/lib/security/content-security-policy";

const FROZEN_PATH_PREFIXES = ["/app/wallet-lifeboat", "/api/lifeboat"];

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const policy = buildContentSecurityPolicy(nonce, {
    isDev: process.env.NODE_ENV !== "production",
  });
  const path = request.nextUrl.pathname;

  if (FROZEN_PATH_PREFIXES.some((prefix) => isPathOrChild(path, prefix))) {
    return NextResponse.json(
      {
        error: "not_found",
        message: "This feature is frozen and not published on main.",
      },
      {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "Content-Security-Policy": policy,
          "Content-Security-Policy-Report-Only": policy,
        },
      },
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Content-Security-Policy-Report-Only", policy);

  return response;
}

function isPathOrChild(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export const config = {
  matcher: [
    "/api/lifeboat/:path*",
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
