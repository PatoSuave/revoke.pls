import { NextResponse } from "next/server";

import { approvalApiNoStoreHeaders } from "@/lib/approval-api-cache";
import { rateLimitKeyFromRequest } from "@/lib/request-rate-limit";
import {
  acquireTokenContractReportDeepScan,
  TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT,
} from "@/lib/token-contract-report-api-controls";
import {
  buildTokenContractReport,
  type BuildTokenContractReportOptions,
} from "@/lib/token-contract-report-server";
import {
  createEmptyTokenContractReportResponse,
  type TokenContractReportResponse,
  type TokenContractReportStreamEvent,
} from "@/lib/token-contract-report";

const TOKEN_CONTRACT_REPORT_MAX_BODY_BYTES = 8_192;
const TOKEN_CONTRACT_REPORT_GLOBAL_DEADLINE_MS = 50_000;

type TokenContractReportBuilder = (
  options: BuildTokenContractReportOptions,
) => Promise<TokenContractReportResponse>;

interface RequestBody {
  chainId?: unknown;
  contractAddress?: unknown;
  includeAi?: unknown;
}

export async function handleTokenContractReportStreamPost(
  request: Request,
  builder: TokenContractReportBuilder = buildTokenContractReport,
): Promise<Response> {
  const body = await readRequestBody(request);
  if (!body.ok) {
    return NextResponse.json(
      createEmptyTokenContractReportResponse({
        status: "bad-request",
        errors: [body.error],
      }),
      { status: 400, headers: approvalApiNoStoreHeaders() },
    );
  }

  const key = rateLimitKeyFromRequest(request);
  const lease = acquireTokenContractReportDeepScan(key);
  if (!lease.allowed) {
    const inFlight = lease.reason === "in-flight";
    return NextResponse.json(
      {
        ...createEmptyTokenContractReportResponse({
          status: "upstream-failure",
          errors: [
            inFlight
              ? "A token contract audit is already running for this client."
              : "Deep token contract audit limit exceeded. Try again later.",
          ],
        }),
        rateLimited: !inFlight,
        inFlight,
      },
      {
        status: 429,
        headers: approvalApiNoStoreHeaders({
          "Retry-After": lease.rateLimit.retryAfterSeconds.toString(),
          ...rateLimitHeaders(lease.rateLimit),
        }),
      },
    );
  }

  const chainId = Number(body.value.chainId);
  const contractAddress =
    typeof body.value.contractAddress === "string"
      ? body.value.contractAddress
      : "";
  const includeAi =
    typeof body.value.includeAi === "boolean" ? body.value.includeAi : true;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      const deadlineController = new AbortController();
      const aiController = new AbortController();
      const abortFromRequest = () => {
        deadlineController.abort(request.signal.reason);
        aiController.abort(request.signal.reason);
      };
      if (request.signal.aborted) abortFromRequest();
      request.signal.addEventListener("abort", abortFromRequest, { once: true });
      const deadline = setTimeout(
        () => deadlineController.abort(new Error("Audit deadline exceeded")),
        TOKEN_CONTRACT_REPORT_GLOBAL_DEADLINE_MS,
      );

      const send = (event: TokenContractReportStreamEvent) => {
        try {
          streamController.enqueue(
            encoder.encode(`${JSON.stringify(event)}\n`),
          );
        } catch {
          deadlineController.abort();
        }
      };

      void (async () => {
        try {
          const report = await builder({
            chainId,
            contractAddress,
            includeAi,
            signal: deadlineController.signal,
            aiSignal: aiController.signal,
            onProgress: send,
          });
          send({ type: "final", report });
        } catch {
          send({
            type: "error",
            error:
              deadlineController.signal.aborted && !request.signal.aborted
                ? "The audit reached its 50-second deadline. Partial evidence may still be shown."
                : "The audit could not be completed. Partial evidence may still be shown.",
          });
        } finally {
          clearTimeout(deadline);
          request.signal.removeEventListener("abort", abortFromRequest);
          lease.release();
          try {
            streamController.close();
          } catch {
            // The browser may have disconnected after receiving partial evidence.
          }
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: approvalApiNoStoreHeaders({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Token-Contract-Report": "stream",
      ...rateLimitHeaders(lease.rateLimit),
    }),
  });
}

async function readRequestBody(
  request: Request,
): Promise<
  | { ok: true; value: RequestBody }
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
    return { ok: true, value: value as RequestBody };
  } catch {
    return { ok: false, error: "Provide a valid JSON request body." };
  }
}

function rateLimitHeaders(rateLimit: {
  limit: number;
  remaining: number;
  resetAt: number;
}): HeadersInit {
  return {
    "X-RateLimit-Limit": rateLimit.limit.toString(),
    "X-RateLimit-Remaining": rateLimit.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(rateLimit.resetAt / 1_000).toString(),
    "X-RateLimit-Window-Ms":
      TOKEN_CONTRACT_REPORT_DEEP_RATE_LIMIT.windowMs.toString(),
  };
}
