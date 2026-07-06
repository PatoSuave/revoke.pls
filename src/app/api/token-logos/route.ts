import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import {
  TOKEN_LOGO_MAX_ADDRESSES,
  TOKEN_LOGO_REQUEST_TIMEOUT_MS,
  extractTokenLogosFromDexScreenerPairs,
  extractTokenLogosFromNineMmTokenList,
  getDexScreenerChainSlugForTokenLogos,
  getNineMmTokenListUrlForTokenLogos,
  isTokenLogoSupportedChain,
  normalizeLogoAddress,
  normalizeLogoAddresses,
  supportedTokenLogoChainSummary,
  tokenLogoAddressKey,
  type TokenLogoMap,
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
      { headers: tokenLogoNoStoreHeaders() },
    );
  }

  const rateLimit = checkTokenLogoApiRateLimit(
    rateLimitKeyFromRequest(request),
  );
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
    return upstreamFailureWithFallback({
      chainId,
      addresses,
      rawAddressCount: rawAddresses.length,
      message: "Dex Screener token logo lookup failed.",
    });
  }
  clearTimeout(timeout);

  if (!upstream.ok) {
    return upstreamFailureWithFallback({
      chainId,
      addresses,
      rawAddressCount: rawAddresses.length,
      message: "Dex Screener token logo lookup returned an error.",
    });
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return upstreamFailureWithFallback({
      chainId,
      addresses,
      rawAddressCount: rawAddresses.length,
      message: "Dex Screener token logo lookup returned invalid JSON.",
    });
  }

  const dexScreenerLogos = extractTokenLogosFromDexScreenerPairs({
    chainId,
    requestedAddresses: addresses,
    payload,
  });
  const nineMmLogos = await fetchNineMmTokenListLogos({
    chainId,
    addresses: missingLogoAddresses(addresses, dexScreenerLogos),
  });
  const logos = { ...nineMmLogos, ...dexScreenerLogos };

  return NextResponse.json(
    {
      ok: true,
      status: "complete",
      chainId,
      source: "dexscreener",
      sources: logoSources(logos, "dexscreener"),
      requested: addresses.length,
      truncated: rawAddresses.length > TOKEN_LOGO_MAX_ADDRESSES,
      logos,
    },
    { headers: tokenLogoNoStoreHeaders() },
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

async function upstreamFailureWithFallback({
  chainId,
  addresses,
  rawAddressCount,
  message,
}: {
  chainId: number;
  addresses: readonly `0x${string}`[];
  rawAddressCount: number;
  message: string;
}) {
  const fallbackLogos = await fetchNineMmTokenListLogos({ chainId, addresses });
  if (Object.keys(fallbackLogos).length === 0) {
    return upstreamFailure(message);
  }

  return NextResponse.json(
    {
      ok: true,
      status: "complete",
      chainId,
      source: "9mm-tokenlist",
      sources: ["9mm-tokenlist"],
      requested: addresses.length,
      truncated: rawAddressCount > TOKEN_LOGO_MAX_ADDRESSES,
      logos: fallbackLogos,
    },
    { headers: tokenLogoNoStoreHeaders() },
  );
}

async function fetchNineMmTokenListLogos({
  chainId,
  addresses,
}: {
  chainId: number;
  addresses: readonly `0x${string}`[];
}): Promise<TokenLogoMap> {
  if (addresses.length === 0) return {};

  const sourceUrl = getNineMmTokenListUrlForTokenLogos(chainId);
  if (!sourceUrl) return {};

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TOKEN_LOGO_REQUEST_TIMEOUT_MS,
  );

  try {
    const response = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return {};

    const payload = await response.json();
    return extractTokenLogosFromNineMmTokenList({
      chainId,
      requestedAddresses: addresses,
      payload,
      sourceUrl,
    });
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

function missingLogoAddresses(
  addresses: readonly `0x${string}`[],
  logos: TokenLogoMap,
): readonly `0x${string}`[] {
  return addresses.filter((address) => !logos[tokenLogoAddressKey(address)]);
}

function logoSources(logos: TokenLogoMap, primary: string): string[] {
  return [
    primary,
    ...new Set(
      Object.values(logos)
        .map((logo) => logo.source)
        .filter((source) => source !== primary),
    ),
  ];
}

function tokenLogoNoStoreHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    ...headers,
  };
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
