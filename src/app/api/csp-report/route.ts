import { NextResponse } from "next/server";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import {
  CSP_REPORT_MAX_BYTES,
  CSP_REPORT_RATE_LIMIT,
  checkCspReportRateLimit,
  type RateLimitResult,
} from "@/lib/csp-report-controls";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkCspReportRateLimit(
    rateLimitKeyFromRequest(request),
  );
  if (!rateLimit.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: approvalApiNoStoreHeaders(
        rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
      ),
    });
  }

  const contentLength = parseContentLength(request.headers.get("content-length"));
  if (contentLength !== null && contentLength > CSP_REPORT_MAX_BYTES) {
    return new NextResponse(null, {
      status: 413,
      headers: approvalApiNoStoreHeaders(rateLimitHeaders(rateLimit)),
    });
  }

  const bodyResult = await readBoundedRequestBody(request);
  if (!bodyResult.ok) {
    return new NextResponse(null, {
      status: 413,
      headers: approvalApiNoStoreHeaders(rateLimitHeaders(rateLimit)),
    });
  }

  const body = bodyResult.body;
  const report = parseCspReport(body);
  if (report) {
    console.warn(
      JSON.stringify({ level: "warn", msg: "csp-report", ...report }),
    );
  }

  return new NextResponse(null, {
    status: 204,
    headers: approvalApiNoStoreHeaders(rateLimitHeaders(rateLimit)),
  });
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function readBoundedRequestBody(
  request: Request,
): Promise<{ ok: true; body: string } | { ok: false }> {
  if (!request.body) {
    const body = await request.text();
    return new TextEncoder().encode(body).length > CSP_REPORT_MAX_BYTES
      ? { ok: false }
      : { ok: true, body };
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > CSP_REPORT_MAX_BYTES) {
      await reader.cancel();
      return { ok: false };
    }

    chunks.push(decoder.decode(value, { stream: true }));
  }

  chunks.push(decoder.decode());
  return { ok: true, body: chunks.join("") };
}

function parseCspReport(body: string): Record<string, unknown> | null {
  if (!body.trim()) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;
  const reportContainer = payload as Record<string, unknown>;
  const rawReport = reportContainer["csp-report"] ?? reportContainer;
  if (!rawReport || typeof rawReport !== "object") return null;
  const report = rawReport as Record<string, unknown>;

  return {
    documentUri: sanitizeUri(report["document-uri"]),
    blockedUri: sanitizeUri(report["blocked-uri"]),
    effectiveDirective: sanitizeText(report["effective-directive"]),
    violatedDirective: sanitizeText(report["violated-directive"]),
    sourceFile: sanitizeUri(report["source-file"]),
    lineNumber: sanitizeNumber(report["line-number"]),
    columnNumber: sanitizeNumber(report["column-number"]),
    disposition: sanitizeText(report.disposition),
  };
}

function sanitizeUri(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim();
  if (!trimmed.includes(":")) return sanitizeText(trimmed, 80);

  try {
    const url = new URL(trimmed);
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return sanitizeText(trimmed, 80);
  }
}

function sanitizeText(value: unknown, maxLength = 120): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function sanitizeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
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
    "X-RateLimit-Window-Ms": CSP_REPORT_RATE_LIMIT.windowMs.toString(),
  };
}
