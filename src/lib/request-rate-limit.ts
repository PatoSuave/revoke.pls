const UNKNOWN_CLIENT_RATE_LIMIT_KEY = "unknown-client";
const MAX_RATE_LIMIT_KEY_LENGTH = 128;

export function rateLimitKeyFromRequest(request: Request): string {
  return rateLimitKeyFromHeaders(request.headers);
}

export function rateLimitKeyFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();

  // Vercel owns x-forwarded-for at the platform edge. Caller-supplied proxy
  // headers such as cf-connecting-ip and x-real-ip are intentionally ignored.
  return forwardedIp
    ? forwardedIp.slice(0, MAX_RATE_LIMIT_KEY_LENGTH)
    : UNKNOWN_CLIENT_RATE_LIMIT_KEY;
}
