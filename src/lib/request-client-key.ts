import { isIP } from "node:net";

const UNKNOWN_CLIENT_KEY = "unknown-client";

export function getRequestClientKey(request: Request): string {
  return (
    normalizeIpHeader(request.headers.get("cf-connecting-ip")) ??
    normalizeIpHeader(request.headers.get("x-real-ip")) ??
    normalizeIpHeader(firstForwardedForValue(request.headers.get("x-forwarded-for"))) ??
    UNKNOWN_CLIENT_KEY
  );
}

function firstForwardedForValue(value: string | null): string | null {
  return value?.split(",")[0] ?? null;
}

function normalizeIpHeader(value: string | null): string | null {
  const candidate = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!candidate || /\s/.test(candidate)) return null;

  const bracketedIpv6 = candidate.match(/^\[([0-9a-f:.]+)\](?::\d+)?$/i);
  if (bracketedIpv6?.[1] && isIP(bracketedIpv6[1])) {
    return bracketedIpv6[1].toLowerCase();
  }

  if (isIP(candidate)) {
    return candidate.toLowerCase();
  }

  const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort?.[1] && isIP(ipv4WithPort[1])) {
    return ipv4WithPort[1];
  }

  return null;
}
