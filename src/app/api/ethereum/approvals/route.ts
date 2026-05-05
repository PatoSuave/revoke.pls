import { NextResponse } from "next/server";

import {
  normalizeEthereumOwner,
  scanEthereumApprovals,
} from "@/lib/ethereum-approval-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = normalizeEthereumOwner(
    url.searchParams.get("owner") ?? url.searchParams.get("address"),
  );

  if (!owner) {
    return NextResponse.json(
      {
        ok: false,
        status: "bad-request",
        errors: ["Provide a valid Ethereum owner address in ?owner=0x..."],
      },
      { status: 400 },
    );
  }

  const result = await scanEthereumApprovals(owner);
  const httpStatus =
    result.status === "config-missing"
      ? 503
      : result.status === "upstream-failure"
        ? 502
        : 200;

  return NextResponse.json(result, { status: httpStatus });
}
