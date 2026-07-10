import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";
import {
  TOKEN_CONTRACT_REPORT_API_RATE_LIMIT,
  checkTokenContractReportApiRateLimit,
  type TokenContractReportRateLimitResult,
} from "@/lib/token-contract-report-api-controls";
import {
  buildTokenContractReport,
  type BuildTokenContractReportOptions,
} from "@/lib/token-contract-report-server";
import {
  createEmptyTokenContractReportResponse,
  type TokenContractReportResponse,
} from "@/lib/token-contract-report";

const TOKEN_CONTRACT_REPORT_MAX_BODY_BYTES = 8_192;

type TokenContractReportBuilder = (
  options: BuildTokenContractReportOptions,
) => Promise<TokenContractReportResponse>;

interface TokenContractReportRequestBody {
  chainId?: unknown;
  contractAddress?: unknown;
  includeAi?: unknown;
}

export async function handleTokenContractReportPost(
  request: Request,
  builder: TokenContractReportBuilder = buildTokenContractReport,
) {
  const body = await readRequestBody(request);
  if (!body.ok) return badRequest(body.error);

  const chainId = Number(body.value.chainId);
  const contractAddress =
    typeof body.value.contractAddress === "string"
      ? body.value.contractAddress
      : "";
  const includeAi =
    typeof body.value.includeAi === "boolean" ? body.value.includeAi : true;

  const rateLimit = checkTokenContractReportApiRateLimit(
    rateLimitKeyFromRequest(request),
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        ...createEmptyTokenContractReportResponse({
          status: "upstream-failure",
          errors: [
          "Token contract report rate limit exceeded. Try again shortly.",
          ],
        }),
        rateLimited: true,
      },
      {
        status: 429,
        headers: approvalApiNoStoreHeaders(
          rateLimitHeaders(rateLimit, { includeRetryAfter: true }),
        ),
      },
    );
  }

  try {
    const report = await builder({
      chainId,
      contractAddress,
      includeAi,
      signal: request.signal,
    });

    return NextResponse.json(report, {
      status: statusCodeFor(report.status),
      headers: approvalApiNoStoreHeaders({
        ...rateLimitHeaders(rateLimit),
        "X-Token-Contract-Report": "server",
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...createEmptyTokenContractReportResponse({
          status: "upstream-failure",
          errors: [
            `Token contract report failed: ${redactSensitiveErrorText(
              error instanceof Error ? error.message : String(error),
            )}`,
          ],
        }),
      },
      {
        status: 502,
        headers: approvalApiNoStoreHeaders({
          "X-Token-Contract-Report": "server",
        }),
      },
    );
  }
}

async function readRequestBody(
  request: Request,
): Promise<
  | { ok: true; value: TokenContractReportRequestBody }
  | { ok: false; error: string }
> {
  const text = await request.text();
  if (text.length > TOKEN_CONTRACT_REPORT_MAX_BODY_BYTES) {
    return { ok: false, error: "Request body is too large." };
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "Provide a JSON object request body." };
    }
    return { ok: true, value: value as TokenContractReportRequestBody };
  } catch {
    return { ok: false, error: "Provide a valid JSON request body." };
  }
}

function badRequest(message: string) {
  return NextResponse.json(
    createEmptyTokenContractReportResponse({
      status: "bad-request",
      errors: [message],
    }),
    { status: 400, headers: approvalApiNoStoreHeaders({}) },
  );
}

function statusCodeFor(status: string): number {
  if (status === "bad-request") return 400;
  if (status === "config-missing") return 503;
  if (status === "upstream-failure") return 502;
  if (status === "unsupported-standard") return 422;
  return 200;
}

function rateLimitHeaders(
  rateLimit: TokenContractReportRateLimitResult,
  options: { includeRetryAfter?: boolean } = {},
): HeadersInit {
  return {
    ...(options.includeRetryAfter
      ? { "Retry-After": rateLimit.retryAfterSeconds.toString() }
      : {}),
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1000).toString(),
    "X-RateLimit-Window-Ms":
      TOKEN_CONTRACT_REPORT_API_RATE_LIMIT.windowMs.toString(),
  };
}

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/([?&]apikey=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]api_key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]");
}

