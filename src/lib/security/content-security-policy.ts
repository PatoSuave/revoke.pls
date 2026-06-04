export interface ContentSecurityPolicyOptions {
  isDev?: boolean;
}

const INVALID_NONCE_CHARS = /[\s<>&;]/;

export function buildContentSecurityPolicy(
  nonce: string,
  options: ContentSecurityPolicyOptions = {},
) {
  if (!nonce || INVALID_NONCE_CHARS.test(nonce)) {
    throw new Error("CSP nonce is missing or contains invalid characters.");
  }

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(options.isDev ? ["'unsafe-eval'"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
    "report-uri /api/csp-report",
  ].join("; ");
}
