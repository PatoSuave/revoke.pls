import { afterEach, describe, expect, it } from "vitest";

import { resetTokenContractReportApiRateLimitForTests } from "@/lib/token-contract-report-api-controls";
import { createEmptyTokenContractReportResponse } from "@/lib/token-contract-report";
import { handleTokenContractReportStreamPost } from "./handler";

const REQUEST_BODY = JSON.stringify({
  chainId: 369,
  contractAddress: "0xbbca9774331066948A6b2a68Bc7a51B0392aF9F1",
  includeAi: false,
});

afterEach(() => resetTokenContractReportApiRateLimitForTests());

describe("token contract report stream", () => {
  it("emits base, module, and final NDJSON events", async () => {
    const report = createEmptyTokenContractReportResponse({
      status: "partial",
      errors: [],
    });
    report.ok = true;

    const response = await handleTokenContractReportStreamPost(
      request("203.0.113.11"),
      async (options) => {
        expect(options.signal).toBeInstanceOf(AbortSignal);
        expect(options.aiSignal).toBeInstanceOf(AbortSignal);
        expect(options.aiSignal).not.toBe(options.signal);
        await options.onProgress?.({ type: "base", report });
        await options.onProgress?.({
          type: "module",
          module: {
            id: "source",
            label: "Verified source",
            status: "complete",
            evidenceCount: 2,
            summary: "Source parsed.",
            warnings: [],
          },
        });
        return report;
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain(
      "application/x-ndjson",
    );
    const events = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string });
    expect(events.map((event) => event.type)).toEqual([
      "base",
      "module",
      "final",
    ]);
  });

  it("rejects a second in-flight audit for the same client", async () => {
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const report = createEmptyTokenContractReportResponse({
      status: "partial",
      errors: [],
    });
    const first = await handleTokenContractReportStreamPost(
      request("198.51.100.21"),
      async () => {
        await pending;
        return report;
      },
    );

    const second = await handleTokenContractReportStreamPost(
      request("198.51.100.21"),
      async () => report,
    );
    expect(second.status).toBe(429);
    await expect(second.json()).resolves.toMatchObject({ inFlight: true });

    finish();
    await first.text();
  });
});

function request(ip: string) {
  return new Request(
    "https://pulserevoke.test/api/token-contract-report/stream",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": ip,
      },
      body: REQUEST_BODY,
    },
  );
}
