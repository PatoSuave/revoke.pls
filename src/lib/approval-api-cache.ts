export const APPROVAL_API_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function approvalApiNoStoreHeaders(
  headers: HeadersInit = {},
): HeadersInit {
  return {
    ...APPROVAL_API_NO_STORE_HEADERS,
    ...headers,
  };
}
