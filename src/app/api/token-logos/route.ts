import { NextResponse } from "next/server";

import {
  TOKEN_LOGO_MAX_ADDRESSES,
  TOKEN_LOGO_REQUEST_TIMEOUT_MS,
  extractTokenLogosFromDexScreenerPairs,
  getDexScreenerChainSlugForTokenLogos,
  isTokenLogoSupportedChain,
  normalizeLogoAddress,
  normalizeLogoAddresses,
  supportedTokenLogoChainSummary,
} from "@/lib/token-logos";
import {
  TOKEN_LOGO_API_RATE_LIMIT,
  checkTokenLogoApiRateLimit,
  type RateLimitResult,
} from "@/lib/token-logo-api-controls";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chainId = Number(url.searchParams.get("chainId"));

  if (!Number.isInteger(chainId) || !isTokenLogoSupportedChain(chainId)) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: [
          `Token logo lookup currently supports ${supportedTokenLogoChainSummary()}.`,
        ],
      },
      { status: 400, headers: tokenLogoNoStoreHeaders() },
    );
  }

  const rawAddresses = readAddressParams(url);
  const invalidAddress = rawAddresses.find(
    (address) => !normalizeLogoAddress(address),
  );
  if (invalidAddress) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Provide valid token addresses in ?addresses=0x..."],
      },
      { status: 400, headers: tokenLogoNoStoreHeaders() },
    );
  }

  const addresses = normalizeLogoAddresses(rawAddresses);
  const chainSlug = getDexScreenerChainSlugForTokenLogos(chainId);
  if (!chainSlug) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Unsupported token-logo chain."],
      },
      { status: 400, headers: tokenLogoNoStoreHeaders() },
    );
  }

  if (addresses.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        status: "empty",
        chainId,
        source: "dexscreener",
        requested: 0,
        truncated: false,
        logos: {},
      },
      { headers: tokenLogoCacheHeaders() },
    );
  }

  const rateLimit = checkTokenLogoApiRateLimit(rateLimitKey(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        status: "upstream-failure",
        errors: ["Token logo lookup rate limit exceeded. Try again shortly."],
        logos: {},
        rateLimited: true,
      },
      {
        status: 429,
        headers: tokenLogoNoStoreHeaders(
          rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
        ),
      },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TOKEN_LOGO_REQUEST_TIMEOUT_MS,
  );

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.dexscreener.com/tokens/v1/${chainSlug}/${addresses.join(",")}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );
  } catch {
    clearTimeout(timeout);
    return upstreamFailure("Dex Screener token logo lookup failed.");
  }
  clearTimeout(timeout);

  if (!upstream.ok) {
    return upstreamFailure("Dex Screener token logo lookup returned an error.");
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return upstreamFailure("Dex Screener token logo lookup returned invalid JSON.");
  }

  const logos = extractTokenLogosFromDexScreenerPairs({
    chainId,
    requestedAddresses: addresses,
    payload,
  });

  return NextResponse.json(
    {
      ok: true,
      status: "complete",
      chainId,
      source: "dexscreener",
      requested: addresses.length,
      truncated: rawAddresses.length > TOKEN_LOGO_MAX_ADDRESSES,
      logos,
    },
    { headers: tokenLogoCacheHeaders() },
  );
}

function readAddressParams(url: URL): string[] {
  return [
    ...url.searchParams.getAll("address"),
    ...url.searchParams.getAll("addresses").flatMap((value) =>
      value
        .split(",")
        .map((address) => address.trim())
        .filter(Boolean),
    ),
  ];
}

function upstreamFailure(message: string) {
  return NextResponse.json(
    {
      ok: false,
      status: "upstream-failure",
      errors: [message],
      logos: {},
    },
    { status: 502, headers: tokenLogoNoStoreHeaders() },
  );
}

function tokenLogoCacheHeaders(): HeadersInit {
  return {
    "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    "CDN-Cache-Control": "public, s-maxage=21600",
    "Vercel-CDN-Cache-Control":
      "public, s-maxage=21600, stale-while-revalidate=86400",
  };
}

function tokenLogoNoStoreHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    ...headers,
  };
}

function rateLimitKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwardedIp ||
    "unknown-client"
  );
}

function rateLimitHeaders(
  rateLimit: RateLimitResult,
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms": TOKEN_LOGO_API_RATE_LIMIT.windowMs.toString(),
  };
}
